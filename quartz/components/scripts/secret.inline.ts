import { toHtml } from "hast-util-to-html"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

const SECRET_AAD = new TextEncoder().encode("quartz-secret-note:v1")

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

// --- minimal DER reader for PBES2 encrypted PKCS#8 (RFC 5958 / 2898) ---

interface DerNode {
  tag: number
  value: Uint8Array // content only, without tag/length header
}

function derLengthAt(bytes: Uint8Array, offset: number): { length: number; next: number } {
  const first = bytes[offset]
  if ((first & 0x80) === 0) return { length: first, next: offset + 1 }
  const count = first & 0x7f
  let length = 0
  for (let i = 0; i < count; i++) length = length * 256 + bytes[offset + 1 + i]
  return { length, next: offset + 1 + count }
}

function derReadNode(bytes: Uint8Array, offset: number): { node: DerNode; next: number } {
  const tag = bytes[offset]
  const { length, next } = derLengthAt(bytes, offset + 1)
  const value = bytes.subarray(next, next + length)
  return { node: { tag, value }, next: next + length }
}

// find a child node (by tag) among siblings that all start at `offset`
function derFindChild(bytes: Uint8Array, offset: number, tag: number): DerNode | undefined {
  let cursor = offset
  while (cursor < bytes.length) {
    const { node, next } = derReadNode(bytes, cursor)
    if (node.tag === tag) return node
    cursor = next
  }
  return undefined
}

function derFirstOid(bytes: Uint8Array, offset: number): { oid: Uint8Array; after: number } {
  let cursor = offset
  while (cursor < bytes.length) {
    const { node, next } = derReadNode(bytes, cursor)
    if (node.tag === 0x06) return { oid: node.value, after: next }
    cursor = next
  }
  throw new Error("No OID found in DER")
}

function derOidEquals(oid: Uint8Array, oidHex: string): boolean {
  return (
    Array.from(oid)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("") === oidHex
  )
}

function derIntegerValue(bytes: Uint8Array): number {
  let value = 0
  for (const b of bytes) value = value * 256 + b
  return value
}

// OIDs
const OID_PBES2 = "2a864886f70d01050d" // 1.2.840.113549.1.5.13
const OID_PBKDF2 = "2a864886f70d01050c" // 1.2.840.113549.1.5.12
const OID_AES256_CBC = "60864801650304012a" // 2.16.840.1.101.3.4.1.42

interface Pbes2Params {
  salt: Uint8Array
  iterations: number
  prf: string // "SHA-1" | "SHA-256"
  iv: Uint8Array
  encryptedKey: Uint8Array
}

function parsePbes2EncryptedKey(der: Uint8Array): Pbes2Params {
  // EncryptedPrivateKeyInfo ::= SEQUENCE { encryptionAlgorithm, encryptedData }
  const { node: outer, next: outerNext } = derReadNode(der, 0)
  if (outer.tag !== 0x30) throw new Error("Malformed encrypted private key")

  // AlgorithmIdentifier ::= SEQUENCE { algorithm OID, parameters }
  const { node: algorithm } = derReadNode(outer.value, 0)
  const { oid: algOid, after: algOidAfter } = derFirstOid(algorithm.value, 0)
  if (!derOidEquals(algOid, OID_PBES2)) throw new Error("Unsupported key encryption algorithm")

  // PBES2-params ::= SEQUENCE { keyDerivationFunc, encryptionScheme }
  const pbes2 = derReadNode(algorithm.value, algOidAfter).node
  if (pbes2.tag !== 0x30) throw new Error("Missing PBES2 parameters")

  // keyDerivationFunc ::= SEQUENCE { algorithm PBKDF2, params PBKDF2-params }
  const kdf = derReadNode(pbes2.value, 0).node
  const { oid: kdfOid, after: kdfOidAfter } = derFirstOid(kdf.value, 0)
  if (!derOidEquals(kdfOid, OID_PBKDF2)) throw new Error("Unsupported key derivation function")

  // PBKDF2-params ::= SEQUENCE { salt OCTET STRING, iterationCount INTEGER, prf AlgorithmIdentifier }
  const kdfParams = derReadNode(kdf.value, kdfOidAfter).node
  if (kdfParams.tag !== 0x30) throw new Error("Malformed PBKDF2 parameters")
  const saltNode = derFindChild(kdfParams.value, 0, 0x04)
  const iterationsNode = derFindChild(kdfParams.value, 0, 0x02)
  if (!saltNode || !iterationsNode) throw new Error("Malformed PBKDF2 parameters")
  const salt = saltNode.value
  const iterations = derIntegerValue(iterationsNode.value)

  // PBKDF2 prf: prf ::= AlgorithmIdentifier inside PBKDF2-params
  let prf: string = "SHA-1"
  const prfNode = derFindChild(kdfParams.value, 0, 0x30)
  if (prfNode) {
    const { oid } = derFirstOid(prfNode.value, 0)
    if (derOidEquals(oid, "2a864886f70d0209")) prf = "SHA-256" // hmacWithSHA256
  }

  // encryptionScheme ::= SEQUENCE { algorithm AES-256-CBC, iv OCTET STRING }
  const kdfRead = derReadNode(pbes2.value, 0)
  const scheme = derReadNode(pbes2.value, kdfRead.next).node
  const { oid: schemeOid, after: schemeOidAfter } = derFirstOid(scheme.value, 0)
  if (!derOidEquals(schemeOid, OID_AES256_CBC)) throw new Error("Unsupported key encryption scheme")
  const ivNode = derFindChild(scheme.value, schemeOidAfter, 0x04)
  if (!ivNode) throw new Error("Malformed encryption scheme parameters")
  const iv = ivNode.value

  // encryptedData OCTET STRING (second child of the outer SEQUENCE)
  const firstNode = derReadNode(outer.value, 0)
  const encryptedDataNode = derFindChild(outer.value, firstNode.next, 0x04)
  if (!encryptedDataNode) throw new Error("Missing encrypted key data")
  const encryptedKey = encryptedDataNode.value

  return { salt, iterations, prf, iv, encryptedKey }
}

async function importPrivateKey(pem: string, passphrase: string): Promise<CryptoKey> {
  const isEncrypted = pem.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")
  const derBase64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")
  const der = decodeBase64(derBase64)

  if (!isEncrypted) {
    return crypto.subtle.importKey("pkcs8", der, { name: "RSA-OAEP", hash: "SHA-256" }, false, [
      "decrypt",
    ])
  }

  // Decrypt PBES2-wrapped PKCS#8 with the passphrase
  const params = parsePbes2EncryptedKey(der)
  if (!params.iterations) throw new Error("Missing PBKDF2 iteration count")
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  const decryptionKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: params.salt,
      iterations: params.iterations,
      hash: params.prf,
    },
    keyMaterial,
    { name: "AES-CBC", length: 256 },
    false,
    ["decrypt"],
  )
  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: params.iv },
    decryptionKey,
    params.encryptedKey,
  )
  return crypto.subtle.importKey(
    "pkcs8",
    new Uint8Array(pkcs8),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  )
}

async function renderMarkdown(markdown: string): Promise<string> {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)
  const markdownTree = processor.parse(markdown)
  const htmlTree = await processor.run(markdownTree)
  return toHtml(htmlTree, { allowDangerousHtml: false })
}

function secureRenderedContent(container: HTMLElement) {
  for (const link of container.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = link.getAttribute("href")?.trim().toLowerCase() ?? ""
    if (
      href.startsWith("javascript:") ||
      href.startsWith("vbscript:") ||
      href.startsWith("data:")
    ) {
      link.removeAttribute("href")
    } else if (link.origin !== window.location.origin) {
      link.rel = "noopener noreferrer"
    }
  }

  for (const heading of container.querySelectorAll<HTMLHeadingElement>("h1, h2, h3, h4, h5, h6")) {
    if (heading.id) continue
    const slug = (heading.textContent ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/g, "-")
    if (slug) heading.id = slug
  }
}

document.addEventListener("nav", () => {
  const lock = document.querySelector<HTMLElement>("[data-secret-note]")
  if (!lock) return

  const form = lock.querySelector<HTMLFormElement>(".secret-note-form")
  const keyFile = lock.querySelector<HTMLInputElement>(".secret-key-file")
  const keyText = lock.querySelector<HTMLTextAreaElement>(".secret-key-text")
  const passphrase = lock.querySelector<HTMLInputElement>(".secret-passphrase")
  const status = lock.querySelector<HTMLElement>(".secret-note-status")
  const output = lock.parentElement?.querySelector<HTMLElement>(".secret-note-output")
  if (!form || !keyFile || !keyText || !status || !output) return

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    const button = form.querySelector<HTMLButtonElement>("button[type='submit']")
    if (button) button.disabled = true
    status.dataset.state = "working"
    status.textContent = "Decrypting locally…"

    try {
      const selectedFile = keyFile.files?.[0]
      const privateKeyPem = selectedFile ? await selectedFile.text() : keyText.value
      if (!privateKeyPem.trim()) throw new Error("Choose or paste your private key first")

      const privateKey = await importPrivateKey(privateKeyPem, passphrase?.value ?? "")
      keyText.value = ""
      if (passphrase) passphrase.value = ""

      const contentKeyBytes = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        decodeBase64(lock.dataset.secretWrappedKey ?? ""),
      )
      const contentKey = await crypto.subtle.importKey(
        "raw",
        contentKeyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"],
      )
      const plaintext = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: decodeBase64(lock.dataset.secretIv ?? ""),
          additionalData: SECRET_AAD,
          tagLength: 128,
        },
        contentKey,
        decodeBase64(lock.dataset.secretCiphertext ?? ""),
      )
      const markdown = new TextDecoder("utf-8", { fatal: true }).decode(plaintext)
      output.innerHTML = await renderMarkdown(markdown)
      secureRenderedContent(output)
      output.hidden = false
      form.remove()
      status.dataset.state = "success"
      status.textContent = "Decrypted in this browser tab. Refresh the page to lock it again."
    } catch (error) {
      keyText.value = ""
      status.dataset.state = "error"
      status.textContent =
        error instanceof Error && error.message.includes("Choose or paste")
          ? error.message
          : "Could not decrypt this note. Check that the private key matches."
      if (button) button.disabled = false
    }
  }

  form.addEventListener("submit", onSubmit)
  window.addCleanup(() => form.removeEventListener("submit", onSubmit))
})
