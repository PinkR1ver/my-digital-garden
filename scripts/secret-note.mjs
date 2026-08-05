#!/usr/bin/env node

import {
  constants,
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from "node:crypto"
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"

export const SECRET_VERSION = 1
export const SECRET_ALGORITHM = "RSA-OAEP-256+A256GCM"
export const SECRET_AAD = Buffer.from("quartz-secret-note:v1", "utf8")

const ENVELOPE_FIELDS = [
  "secret_version",
  "secret_algorithm",
  "secret_wrapped_key",
  "secret_iv",
  "secret_ciphertext",
]

function usage() {
  return `Secret note tools

Usage:
  npm run secret:keygen -- [--public <path>] [--private <path>] [--passphrase <password>] [--force]
  npm run secret:encrypt -- <note.md> [--public <public.pem>] [--output <note.md>] [--force]
  npm run secret:decrypt -- <note.md> --private <private.pem> [--passphrase <password>] [--output <note.md>] [--force]

Defaults:
  public key:  private/secret-notes.public.pem
  private key: private/secret-notes.private.pem

Keep editable plaintext under private/ and write encrypted notes to content/.
The private/ directory is ignored by this repository.

--passphrase protects the private key file with a password (PBES2).
Readers must enter it in the browser to unlock the note.`
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

function assertPrivateKeyDestinationIsIgnored(path) {
  const target = resolvePath(path)
  let repoRoot
  try {
    repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return
  }

  const rel = relative(repoRoot, target)
  if (rel.startsWith("..") || isAbsolute(rel)) return

  try {
    execFileSync("git", ["check-ignore", "--quiet", "--no-index", target], {
      cwd: repoRoot,
      stdio: "ignore",
    })
  } catch {
    throw new Error(
      `Refusing to write a private key inside the Git worktree at ${target}. ` +
        "Choose an ignored path such as private/secret-notes.private.pem.",
    )
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

function normalizePublicKey(pem) {
  return createPublicKey(pem).export({ type: "spki", format: "pem" }).toString().trim()
}

function readPublicKey(parsed, publicKeyPath) {
  const value = publicKeyPath
    ? readFileSync(resolvePath(publicKeyPath), "utf8")
    : typeof parsed.data.pub === "string"
      ? parsed.data.pub
      : ""

  if (!value.trim()) {
    throw new Error("No public key found. Add `pub: |` to frontmatter or pass --public <path>.")
  }
  return normalizePublicKey(value)
}

function hasEnvelope(data) {
  return ENVELOPE_FIELDS.every((field) => data[field] !== undefined)
}

function encryptedDocument(data) {
  return matter.stringify("\n", data)
}

export function encryptMarkdown(source, publicKeyOverride) {
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

  const publicKeyPem = normalizePublicKey(publicKeyOverride ?? parsed.data.pub ?? "")
  const contentKey = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", contentKey, iv)
  cipher.setAAD(SECRET_AAD)
  const ciphertext = Buffer.concat([cipher.update(parsed.content, "utf8"), cipher.final()])
  const authenticatedCiphertext = Buffer.concat([ciphertext, cipher.getAuthTag()])
  const wrappedKey = publicEncrypt(
    {
      key: publicKeyPem,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    contentKey,
  )

  const data = { ...parsed.data }
  data.pub = publicKeyPem
  data.secret_version = SECRET_VERSION
  data.secret_algorithm = SECRET_ALGORITHM
  data.secret_wrapped_key = wrappedKey.toString("base64")
  data.secret_iv = iv.toString("base64")
  data.secret_ciphertext = authenticatedCiphertext.toString("base64")
  return encryptedDocument(data)
}

export function decryptMarkdown(source, privateKeyPem, passphrase) {
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

  const privateKeyOptions = passphrase ? { key: privateKeyPem, passphrase } : privateKeyPem
  const contentKey = privateDecrypt(
    {
      key: createPrivateKey(privateKeyOptions),
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(parsed.data.secret_wrapped_key, "base64"),
  )
  const encrypted = Buffer.from(parsed.data.secret_ciphertext, "base64")
  if (encrypted.length < 17) throw new Error("Invalid encrypted content")

  const ciphertext = encrypted.subarray(0, -16)
  const tag = encrypted.subarray(-16)
  const decipher = createDecipheriv(
    "aes-256-gcm",
    contentKey,
    Buffer.from(parsed.data.secret_iv, "base64"),
  )
  decipher.setAAD(SECRET_AAD)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")

  const data = { ...parsed.data }
  for (const field of ENVELOPE_FIELDS) delete data[field]
  return matter.stringify(plaintext, data)
}

function keygen(options) {
  const publicPath = resolvePath(options.public ?? "private/secret-notes.public.pem")
  const privatePath = resolvePath(options.private ?? "private/secret-notes.private.pem")
  if (publicPath === privatePath) throw new Error("Public and private key paths must be different")
  assertPrivateKeyDestinationIsIgnored(privatePath)
  if (!options.force && (existsSync(publicPath) || existsSync(privatePath))) {
    throw new Error("A key output already exists; pass --force to replace both key files")
  }

  const privateKeyEncoding = { type: "pkcs8", format: "pem" }
  if (options.passphrase) {
    privateKeyEncoding.cipher = "aes-256-cbc"
    privateKeyEncoding.passphrase = options.passphrase
  }

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 3072,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding,
  })
  writeAtomic(publicPath, publicKey, { force: options.force, mode: 0o644 })
  writeAtomic(privatePath, privateKey, { force: options.force, mode: 0o600 })
  console.log(`Private key: ${privatePath}`)
  console.log(`Public key:  ${publicPath}`)
  console.log(
    options.passphrase
      ? "The private key is encrypted with PBES2 (aes-256-cbc). " +
          "Readers must enter the passphrase in the browser to unlock notes."
      : "The private key is unencrypted PKCS#8 for Web Crypto compatibility. Protect the file.",
  )
}

function encryptFile(inputPath, options) {
  const input = resolvePath(inputPath)
  const output = resolvePath(options.output ?? inputPath)
  const parsed = matter(readFileSync(input, "utf8"))
  const publicKey = readPublicKey(parsed, options.public)
  const encrypted = encryptMarkdown(readFileSync(input, "utf8"), publicKey)
  writeAtomic(output, encrypted, { force: output === input || options.force, mode: 0o644 })
  console.log(`Encrypted note: ${output}`)
}

function decryptFile(inputPath, options) {
  if (!options.private) throw new Error("decrypt requires --private <private.pem>")
  const input = resolvePath(inputPath)
  const output = resolvePath(options.output ?? inputPath)
  const decrypted = decryptMarkdown(
    readFileSync(input, "utf8"),
    readFileSync(resolvePath(options.private), "utf8"),
    options.passphrase,
  )
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

  if (command === "keygen") return keygen(options)
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
    console.error(`Secret note error: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
