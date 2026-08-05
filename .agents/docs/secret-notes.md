# Secret Notes

Notes can opt into client-side unlocking with `secret: true`. The committed
Markdown contains only public metadata and an encrypted envelope. The browser
receives no plaintext from the static site and decrypts only after the reader
enters the matching passphrase.

## Cryptography

- The passphrase is the only secret: no keypair files exist.
- PBKDF2-SHA256 (600,000 iterations) derives an AES-256-GCM key from the
  passphrase; a fresh random 16-byte salt is stored per note.
- AES-256-GCM encrypts and authenticates the Markdown body with a 96-bit IV.
- Format identifier: `PBKDF2-SHA256+A256GCM`, version `2`.
- The browser derives the key with Web Crypto. The passphrase is read into the
  current tab only and is never uploaded or saved in local/session storage.

This protects note contents at rest in Git/GitHub and in the deployed static
files. All frontmatter, the filename, and the salt/IV remain visible; use a
generic title and omit sensitive tags or dates when that metadata matters.

Encryption only protects content that was never committed as plaintext.
Anything already pushed to Git, deployed, or archived on the public site is
permanently disclosed; converting an existing published note does not retract
its history.

## Safe Authoring Workflow

Author plaintext under the Git-ignored `private/` directory:

```yaml
---
title: Secret example
secret: true
---

Private Markdown body.
```

Encrypt into the public content tree with the passphrase:

```bash
npm run secret:encrypt -- private/example.md \
  --passphrase '<your-passphrase>' \
  --output content/example.md
```

To edit an existing encrypted note, decrypt back into the ignored directory:

```bash
npm run secret:decrypt -- content/example.md \
  --passphrase '<your-passphrase>' \
  --output private/example.md --force
```

Then edit the private copy and encrypt it again with `--force` on the existing
public output. Never commit the decrypted copy. Quartz deliberately fails the
build if it sees `secret: true` without a complete encrypted envelope, or if
anything has been appended to an encrypted note body.

Changing the passphrase requires re-encrypting every note with the new value.

## Rendering Boundary

After unlocking, the browser renders safe GFM (headings, lists, tables, links,
code, and similar standard Markdown). Raw Markdown HTML is not executed.
Quartz-only build-time features that require the full vault graph, such as
wikilink resolution, transclusions, syntax highlighting, and LaTeX processing,
are not available inside an encrypted body in format version 2.
