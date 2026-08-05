import assert from "node:assert/strict"
import { generateKeyPairSync } from "node:crypto"
import matter from "gray-matter"
import { decryptMarkdown, encryptMarkdown } from "../scripts/secret-note.mjs"

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
})

const plaintext = `---
title: Private test
secret: true
pub: |
${publicKey
  .trim()
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}
tags:
  - private-test
---

## The answer

This exact phrase must not survive encryption: swordfish-秘密.
`

const encrypted = encryptMarkdown(plaintext)
assert.equal(encrypted.includes("swordfish-秘密"), false)
const envelope = matter(encrypted)
assert.equal(envelope.data.secret, true)
assert.equal(envelope.data.secret_version, 1)
assert.equal(envelope.data.secret_algorithm, "RSA-OAEP-256+A256GCM")
assert.equal(envelope.content.trim(), "")

const decrypted = decryptMarkdown(encrypted, privateKey)
assert.equal(matter(decrypted).content, matter(plaintext).content)
assert.equal(matter(decrypted).data.secret, true)
assert.equal(matter(decrypted).data.secret_ciphertext, undefined)

const wrongKeys = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
})
assert.throws(() => decryptMarkdown(encrypted, wrongKeys.privateKey))

console.log("secret-note tests passed")
