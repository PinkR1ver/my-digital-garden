let mermaidImport: any = undefined
let activeMermaidModal: HTMLElement | undefined = undefined

function closeMermaidModal() {
  activeMermaidModal?.remove()
  activeMermaidModal = undefined
}

function openMermaidModal(source: HTMLElement) {
  const svg = source.querySelector("svg")
  if (!svg) return

  closeMermaidModal()

  const modal = document.createElement("div")
  modal.className = "mermaid-modal"
  modal.setAttribute("role", "dialog")
  modal.setAttribute("aria-modal", "true")
  modal.setAttribute("aria-label", "Mermaid diagram detail")

  const panel = document.createElement("div")
  panel.className = "mermaid-modal-panel"

  const closeButton = document.createElement("button")
  closeButton.className = "mermaid-modal-close"
  closeButton.type = "button"
  closeButton.setAttribute("aria-label", "Close Mermaid diagram detail")
  closeButton.textContent = "Close"

  const content = document.createElement("div")
  content.className = "mermaid-modal-content"
  content.appendChild(svg.cloneNode(true))

  panel.append(closeButton, content)
  modal.append(panel)
  document.body.append(modal)
  activeMermaidModal = modal

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== "Escape") return
    e.preventDefault()
    closeMermaidModal()
    document.removeEventListener("keydown", onKeydown)
  }

  modal.addEventListener("click", (e: MouseEvent) => {
    if (e.target === modal) {
      closeMermaidModal()
      document.removeEventListener("keydown", onKeydown)
    }
  })

  closeButton.addEventListener("click", () => {
    closeMermaidModal()
    document.removeEventListener("keydown", onKeydown)
  })

  document.addEventListener("keydown", onKeydown)
  closeButton.focus()
}

function setupMermaidModal() {
  for (const diagram of document.querySelectorAll<HTMLElement>("code.mermaid")) {
    if (diagram.dataset.mermaidModalReady === "true") continue
    if (!diagram.querySelector("svg")) continue

    diagram.dataset.mermaidModalReady = "true"
    diagram.setAttribute("role", "button")
    diagram.setAttribute("tabindex", "0")
    diagram.setAttribute("aria-label", "Open Mermaid diagram detail")
    diagram.closest("pre")?.classList.add("mermaid-container")

    const open = () => openMermaidModal(diagram)
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return
      e.preventDefault()
      openMermaidModal(diagram)
    }

    diagram.addEventListener("click", open)
    diagram.addEventListener("keydown", onKeydown)
    window.addCleanup(() => diagram.removeEventListener("click", open))
    window.addCleanup(() => diagram.removeEventListener("keydown", onKeydown))
  }
}

document.addEventListener("nav", async () => {
  closeMermaidModal()

  if (document.querySelector("code.mermaid")) {
    const mermaidUrl = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.7.0/mermaid.esm.min.mjs"
    mermaidImport ||= await import(mermaidUrl)
    const mermaid = mermaidImport.default
    const darkMode = document.documentElement.getAttribute("saved-theme") === "dark"

    // Mermaid replaces the code block source with an SVG. Keep the original
    // definition so light-background exports such as Slides can render their
    // own theme instead of cloning a dark-mode SVG.
    document.querySelectorAll<HTMLElement>("code.mermaid").forEach((diagram) => {
      if (!diagram.querySelector("svg") && diagram.dataset.mermaidSource === undefined) {
        diagram.dataset.mermaidSource = diagram.textContent ?? ""
      }
    })

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: darkMode ? "dark" : "default",
    })

    await mermaid.run({
      querySelector: ".mermaid",
    })

    requestAnimationFrame(setupMermaidModal)
    window.setTimeout(setupMermaidModal, 100)
  }
})
