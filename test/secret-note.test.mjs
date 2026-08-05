import assert from "node:assert/strict"
import matter from "gray-matter"
import { decryptMarkdown, encryptMarkdown } from "../scripts/secret-note.mjs"

const plaintext = `---
title: Private test
secret: true
tags:
  - private-test
---

## The answer

This exact phrase must not survive encryption: swordfish-秘密.
`

const encrypted = encryptMarkdown(plaintext, "524865")
assert.equal(encrypted.includes("swordfish-秘密"), false)
const envelope = matter(encrypted)
assert.equal(envelope.data.secret, true)
assert.equal(envelope.data.secret_version, 2)
assert.equal(envelope.data.secret_algorithm, "PBKDF2-SHA256+A256GCM")
assert.equal(envelope.data.secret_wrapped_key, undefined)
assert.equal(envelope.data.pub, undefined)
assert.equal(typeof envelope.data.secret_salt, "string")
assert.equal(typeof envelope.data.secret_iv, "string")
assert.equal(typeof envelope.data.secret_ciphertext, "string")
assert.equal(envelope.content.trim(), "")

const decrypted = decryptMarkdown(encrypted, "524865")
assert.equal(matter(decrypted).content, matter(plaintext).content)
assert.equal(matter(decrypted).data.secret, true)
assert.equal(matter(decrypted).data.secret_ciphertext, undefined)

assert.throws(() => decryptMarkdown(encrypted, "wrong-passphrase"))
assert.throws(() => encryptMarkdown(plaintext, ""))
assert.throws(() => encryptMarkdown(plaintext.replace("secret: true", ""), "524865"))
assert.throws(() => encryptMarkdown(encrypted, "524865"))

console.log("secret-note tests passed")
