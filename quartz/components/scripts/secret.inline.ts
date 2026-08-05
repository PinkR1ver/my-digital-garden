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

function pemToDer(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "")
  if (!base64) throw new Error("Expected an unencrypted PKCS#8 private key")
  return decodeBase64(base64)
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

      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        pemToDer(privateKeyPem),
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"],
      )
      keyText.value = ""

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
