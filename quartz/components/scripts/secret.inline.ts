import { toHtml } from "hast-util-to-html"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

const SECRET_AAD = new TextEncoder().encode("quartz-secret-note:v2")
const PBKDF2_ITERATIONS = 600_000

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  )
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
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
  const passphrase = lock.querySelector<HTMLInputElement>(".secret-passphrase")
  const status = lock.querySelector<HTMLElement>(".secret-note-status")
  const output = lock.parentElement?.querySelector<HTMLElement>(".secret-note-output")
  if (!form || !passphrase || !status || !output) return

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    const button = form.querySelector<HTMLButtonElement>("button[type='submit']")
    if (button) button.disabled = true
    status.dataset.state = "working"
    status.textContent = "Decrypting locally…"

    try {
      const passphraseValue = passphrase.value
      if (!passphraseValue) throw new Error("Enter the passphrase first")

      const salt = decodeBase64(lock.dataset.secretSalt ?? "")
      const iv = decodeBase64(lock.dataset.secretIv ?? "")
      const ciphertext = decodeBase64(lock.dataset.secretCiphertext ?? "")
      if (!salt.length || !iv.length || !ciphertext.length) {
        throw new Error("Missing encrypted envelope")
      }

      const key = await deriveKey(passphraseValue, salt)
      const plaintext = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: SECRET_AAD,
          tagLength: 128,
        },
        key,
        ciphertext,
      )
      passphrase.value = ""

      const markdown = new TextDecoder("utf-8", { fatal: true }).decode(plaintext)
      output.innerHTML = await renderMarkdown(markdown)
      secureRenderedContent(output)
      output.hidden = false
      form.remove()
      status.dataset.state = "success"
      status.textContent = "Decrypted in this browser tab. Refresh the page to lock it again."
    } catch (error) {
      passphrase.value = ""
      status.dataset.state = "error"
      status.textContent =
        error instanceof Error && error.message.includes("Enter the passphrase")
          ? error.message
          : "Could not decrypt this note. Check that the passphrase is correct."
      if (button) button.disabled = false
    }
  }

  form.addEventListener("submit", onSubmit)
  window.addCleanup(() => form.removeEventListener("submit", onSubmit))
})
