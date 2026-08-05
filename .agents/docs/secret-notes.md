# Secret Notes

Notes can opt into client-side unlocking with `secret: true`. The committed
Markdown contains only public metadata and an encrypted envelope. The browser
receives no plaintext from the static site and decrypts only after the reader
selects or pastes the matching private key.

## Cryptography

- RSA-OAEP with SHA-256 wraps a fresh random content key for each encryption.
- AES-256-GCM encrypts and authenticates the Markdown body with a 96-bit IV.
- Format identifier: `RSA-OAEP-256+A256GCM`, version `1`.
- The browser uses Web Crypto. Private keys may be unencrypted PKCS#8 PEM, or
  password-protected PKCS#8 (PBES2, PBKDF2 + AES-256-CBC) unlocked with a
  passphrase in the browser.
- Private keys are read into the current tab only and are never uploaded or
  saved in local/session storage.

This protects note contents at rest in Git/GitHub and in the deployed static
files. All frontmatter, the filename, and the public key remain visible; use a
generic title and omit sensitive tags or dates when that metadata matters. It
does not revoke someone who already has the private key.

## Safe Authoring Workflow

Generate a keypair. Both default paths are under the Git-ignored `private/`
directory. Pass `--passphrase` to protect the private key with a password:

```bash
npm run secret:keygen
npm run secret:keygen -- --passphrase '<your-password>'
```

Author plaintext at `private/example.md`:

```yaml
---
title: Secret example
secret: true
pub: |
  -----BEGIN PUBLIC KEY-----
  ...
  -----END PUBLIC KEY-----
---

Private Markdown body.
```

The `pub` field can be omitted when `--public` is supplied. Encrypt into the
public content tree:

```bash
npm run secret:encrypt -- private/example.md \
  --public private/secret-notes.public.pem \
  --output content/example.md
```

To edit an existing encrypted note, decrypt back into the ignored directory
(pass `--passphrase` when the private key is password-protected):

```bash
npm run secret:decrypt -- content/example.md \
  --private private/secret-notes.private.pem \
  --output private/example.md --force
npm run secret:decrypt -- content/example.md \
  --private private/secret-notes.private.pem \
  --passphrase '<your-password>' \
  --output private/example.md --force
```

Then edit the private copy and encrypt it again with `--force` on the existing
public output. Never commit the decrypted copy. Quartz deliberately fails the
build if it sees `secret: true` without a complete encrypted envelope, or if
anything has been appended to an encrypted note body.

Encryption cannot remove plaintext that was already committed in earlier Git
history. Start new secret notes under `private/`; if converting an existing
published note, treat its old revisions as permanently disclosed.

## Rendering Boundary

After unlocking, the browser renders safe GFM (headings, lists, tables, links,
code, and similar standard Markdown). Raw Markdown HTML is not executed.
Quartz-only build-time features that require the full vault graph, such as
wikilink resolution, transclusions, syntax highlighting, and LaTeX processing,
are not available inside an encrypted body in format version 1.
