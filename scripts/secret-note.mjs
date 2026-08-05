#!/usr/bin/env node

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"

export const SECRET_VERSION = 2
export const SECRET_ALGORITHM = "PBKDF2-SHA256+A256GCM"
export const SECRET_AAD = Buffer.from("quartz-secret-note:v2", "utf8")
export const PBKDF2_ITERATIONS = 600_000
export const PBKDF2_SALT_BYTES = 16
export const AES_IV_BYTES = 12

const ENVELOPE_FIELDS = [
  "secret_version",
  "secret_algorithm",
  "secret_salt",
  "secret_iv",
  "secret_ciphertext",
]

function usage() {
  return `Secret note tools

Usage:
  npm run secret:encrypt -- <note.md> --passphrase <password> [--output <note.md>] [--force]
  npm run secret:decrypt -- <note.md> --passphrase <password> [--output <note.md>] [--force]

Keep editable plaintext under private/ and write encrypted notes to content/.
The private/ directory is ignored by this repository.

The passphrase is the only secret: no keypair files exist. Encryption uses
PBKDF2-SHA256 (600k iterations) to derive an AES-256-GCM key from the
passphrase. Readers must type the same passphrase in the browser to unlock.`
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const options = {}
  const positional = []

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (!arg.startsWith("--")) {
      positional.push(arg)
      continue
    }

    const name = arg.slice(2)
    if (name === "force") {
      options.force = true
      continue
    }

    const value = rest[++i]
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${name}`)
    }
    options[name] = value
  }

  return { command, positional, options }
}

function resolvePath(path) {
  return isAbsolute(path) ? path : resolve(process.cwd(), path)
}

function writeAtomic(path, contents, { force = false, mode } = {}) {
  const target = resolvePath(path)
  const replacingSameFile = existsSync(target) && force
  if (existsSync(target) && !replacingSameFile) {
    throw new Error(`Refusing to overwrite ${target}; pass --force to replace it`)
  }

  mkdirSync(dirname(target), { recursive: true })
  const temporary = `${target}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`
  try {
    writeFileSync(temporary, contents, { encoding: "utf8", mode })
    renameSync(temporary, target)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }
}

function isIgnoredInsideRepository(path) {
  const target = resolvePath(path)
  let repoRoot
  try {
    repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return true
  }

  const rel = relative(repoRoot, target)
  if (rel.startsWith("..") || isAbsolute(rel)) return true
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--no-index", target], {
      cwd: repoRoot,
      stdio: "ignore",
    })
    return true
  } catch {
    return false
  }
}

function hasEnvelope(data) {
  return ENVELOPE_FIELDS.every((field) => data[field] !== undefined)
}

function encryptedDocument(data) {
  return matter.stringify("\n", data)
}

function deriveKey(passphrase, salt) {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 32, "sha256")
}

export function encryptMarkdown(source, passphrase) {
  const parsed = matter(source)
  if (parsed.data.secret !== true) {
    throw new Error("The note must opt in with `secret: true` in its frontmatter")
  }
  if (hasEnvelope(parsed.data)) {
    throw new Error("This note is already encrypted; decrypt it before editing or re-encrypting")
  }
  if (!parsed.content.trim()) {
    throw new Error("The note body is empty")
  }
  if (!passphrase) {
    throw new Error("encrypt requires --passphrase <password>")
  }

  const salt = randomBytes(PBKDF2_SALT_BYTES)
  const key = deriveKey(passphrase, salt)
  const iv = randomBytes(AES_IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  cipher.setAAD(SECRET_AAD)
  const ciphertext = Buffer.concat([cipher.update(parsed.content, "utf8"), cipher.final()])
  const authenticatedCiphertext = Buffer.concat([ciphertext, cipher.getAuthTag()])

  const data = { ...parsed.data }
  delete data.pub
  data.secret_version = SECRET_VERSION
  data.secret_algorithm = SECRET_ALGORITHM
  data.secret_salt = salt.toString("base64")
  data.secret_iv = iv.toString("base64")
  data.secret_ciphertext = authenticatedCiphertext.toString("base64")
  return encryptedDocument(data)
}

export function decryptMarkdown(source, passphrase) {
  const parsed = matter(source)
  if (parsed.data.secret !== true || !hasEnvelope(parsed.data)) {
    throw new Error("This file is not an encrypted secret note")
  }
  if (
    parsed.data.secret_version !== SECRET_VERSION ||
    parsed.data.secret_algorithm !== SECRET_ALGORITHM
  ) {
    throw new Error("Unsupported secret note format")
  }
  if (!passphrase) {
    throw new Error("decrypt requires --passphrase <password>")
  }

  const key = deriveKey(passphrase, Buffer.from(parsed.data.secret_salt, "base64"))
  const encrypted = Buffer.from(parsed.data.secret_ciphertext, "base64")
  if (encrypted.length < 17) throw new Error("Invalid encrypted content")

  const ciphertext = encrypted.subarray(0, -16)
  const tag = encrypted.subarray(-16)
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(parsed.data.secret_iv, "base64"),
  )
  decipher.setAAD(SECRET_AAD)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")

  const data = { ...parsed.data }
  for (const field of ENVELOPE_FIELDS) delete data[field]
  return matter.stringify(plaintext, data)
}

function encryptFile(inputPath, options) {
  if (!options.passphrase) throw new Error("encrypt requires --passphrase <password>")
  const input = resolvePath(inputPath)
  const output = resolvePath(options.output ?? inputPath)
  const encrypted = encryptMarkdown(readFileSync(input, "utf8"), options.passphrase)
  writeAtomic(output, encrypted, { force: output === input || options.force, mode: 0o644 })
  console.log(`Encrypted note: ${output}`)
}

function decryptFile(inputPath, options) {
  if (!options.passphrase) throw new Error("decrypt requires --passphrase <password>")
  const input = resolvePath(inputPath)
  const output = resolvePath(options.output ?? inputPath)
  const decrypted = decryptMarkdown(readFileSync(input, "utf8"), options.passphrase)
  writeAtomic(output, decrypted, { force: output === input || options.force, mode: 0o600 })
  console.log(`Decrypted note: ${output}`)
  if (!isIgnoredInsideRepository(output)) {
    console.warn("Warning: plaintext is inside the Git worktree and is not ignored.")
  }
}

export function main(argv = process.argv.slice(2)) {
  const { command, positional, options } = parseArgs(argv)
  if (!command || command === "help" || options.help) {
    console.log(usage())
    return
  }

  if (command === "encrypt") {
    if (positional.length !== 1) throw new Error("encrypt requires exactly one Markdown file")
    return encryptFile(positional[0], options)
  }
  if (command === "decrypt") {
    if (positional.length !== 1) throw new Error("decrypt requires exactly one Markdown file")
    return decryptFile(positional[0], options)
  }
  throw new Error(`Unknown command: ${command}\n\n${usage()}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(`Secret note error: ${error.message}`)
    process.exit(1)
  }
}
