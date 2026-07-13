document.addEventListener("nav", () => {
  const btn = document.getElementById("print-button")
  if (!btn) return

  let printInProgress = false

  const onClick = async () => {
    if (printInProgress) return
    printInProgress = true
    btn.setAttribute("aria-disabled", "true")

    // Gather note content
    const article = document.querySelector("article.popover-hint")
    const titleEl = document.querySelector(".article-title")
    const metaEl = document.querySelector(".content-meta")
    const title = titleEl?.textContent?.trim() ?? document.title
    const meta = metaEl?.textContent?.trim() ?? ""
    const articleCopy = article?.cloneNode(true) as HTMLElement | undefined

    // Mermaid is rendered as one SVG. Mark its print copy so it can be scaled to
    // the printable page and kept together instead of being clipped like code.
    for (const diagram of articleCopy?.querySelectorAll<HTMLElement>("code.mermaid") ?? []) {
      const container = diagram.closest("pre")
      container?.classList.add("print-mermaid")

      if (articleCopy && container && isOpeningDiagram(articleCopy, container)) {
        container.classList.add("print-mermaid-opening")
      }

      diagram.removeAttribute("tabindex")
      diagram.removeAttribute("role")
      diagram.removeAttribute("aria-label")

      const svg = diagram.querySelector("svg")
      svg?.removeAttribute("width")
      svg?.removeAttribute("height")
      svg?.style.removeProperty("max-width")
      svg?.setAttribute("preserveAspectRatio", "xMidYMid meet")
    }

    const bodyHTML = articleCopy?.innerHTML ?? ""

    // Build a professional print document
    const printWindow = window.open("", "_blank", "width=800,height=600")
    if (!printWindow) {
      // If popup blocked, fall back to direct window.print()
      printInProgress = false
      btn.removeAttribute("aria-disabled")
      window.print()
      return
    }

    const printDoc = printWindow.document

    printDoc.write(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(title)} — Print</title>
<style>
  :root {
    --text: #1a1a1a;
    --muted: #666;
    --border: #e0e0e0;
    --code-bg: #f5f5f5;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
    color-scheme: light;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
    font-size: 12pt;
    line-height: 1.8;
    color: var(--text);
    background: #fff;
    max-width: 680px;
    margin: 0 auto;
    padding: 48px 40px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ---- header ---- */
  .print-header {
    border-bottom: 2px solid var(--border);
    padding-bottom: 20px;
    margin-bottom: 36px;
  }
  .print-header h1 {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.25;
    margin-bottom: 8px;
  }
  .print-header .meta {
    font-family: var(--sans);
    font-size: 9pt;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .print-header .url {
    font-family: var(--sans);
    font-size: 8pt;
    color: var(--muted);
    margin-top: 4px;
    word-break: break-all;
  }

  /* ---- content ---- */
  h2, h3, h4, h5, h6 {
    font-family: var(--sans);
    font-weight: 600;
    margin: 1.6em 0 0.5em;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  h2 { font-size: 15pt; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
  h3 { font-size: 13pt; }
  h4 { font-size: 11.5pt; }

  p { margin: 0.7em 0; }
  a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
  a[role="anchor"] { display: none; }
  a.external .external-icon {
    height: 0.7ex;
    width: 0.7ex;
    vertical-align: middle;
  }
  /* hide the external-icon altogether in footnotes for cleaner references */
  .footnotes a.external .external-icon,
  sup a.external .external-icon {
    height: 0.6ex;
    width: 0.6ex;
  }

  ul, ol { margin: 0.5em 0 0.5em 1.5em; }
  li { margin-bottom: 0.2em; }
  li > p { margin: 0.15em 0; }

  blockquote {
    border-left: 3px solid var(--border);
    margin: 1em 0;
    padding: 0.4em 1em;
    color: var(--muted);
    font-style: italic;
  }

  /* code */
  code {
    font-family: "SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace;
    font-size: 9.5pt;
    background: var(--code-bg);
    padding: 1px 5px;
    border-radius: 3px;
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 1em 0;
    line-height: 1.55;
  }
  pre > code {
    background: none;
    padding: 0;
    font-size: 9pt;
  }

  /* Mermaid is an SVG, not a code listing. Keep each diagram intact and scale
     both wide and tall charts inside the printable A4 content box. */
  pre.print-mermaid {
    display: block;
    width: 100%;
    max-width: 100%;
    padding: 0;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
    break-inside: avoid-page;
    page-break-inside: avoid;
  }
  pre.print-mermaid code.mermaid {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0;
    overflow: visible;
    background: transparent;
    line-height: 0;
  }
  pre.print-mermaid code.mermaid::after { display: none; }
  pre.print-mermaid svg {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: 225mm !important;
    margin: 0 auto;
    overflow: visible;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid var(--border);
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background: var(--code-bg);
    font-weight: 600;
    font-family: var(--sans);
  }

  /* callouts */
  .callout {
    border-left: 4px solid var(--border);
    margin: 1em 0;
    padding: 0.6em 1em;
    border-radius: 0 4px 4px 0;
  }
  .callout-title { font-weight: 600; font-family: var(--sans); }
  .callout-content p { margin: 0.3em 0; }

  /* images */
  img { max-width: 100%; height: auto; border-radius: 4px; }

  /* tags / misc */
  hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
  .tags { display: none; }

  /* ---- print overrides ---- */
  @media print {
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      max-width: none;
      padding: 0;
      font-size: 11pt;
      line-height: 1.75;
      color: #1a1a1a;
      background: #fff;
    }
    .print-header {
      border-bottom-width: 1.5pt;
      padding-bottom: 16pt;
      margin-bottom: 28pt;
    }
    .print-header h1 { font-size: 20pt; }
    h2 { font-size: 14pt; }
    h3 { font-size: 12pt; }
    pre, code { font-size: 8.5pt; }
    pre {
      border: 1pt solid #ccc;
      background: #fafafa !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre.print-mermaid {
      /* 225mm diagram + 8mm margins stays safely within the 257mm A4
         content height left by the 20mm page margins. */
      margin: 4mm 0;
      border: 0;
      background: transparent !important;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    pre.print-mermaid svg {
      max-height: 225mm !important;
    }
    pre.print-mermaid-opening svg {
      /* Opening diagrams share page one with the document header and section
         heading, so they need a smaller budget than later full-page diagrams. */
      max-height: 180mm !important;
    }
    th { background: #f0f0f0 !important; }
    a { color: inherit; }
  }
</style>
</head>
<body>
  <div class="print-header">
    <h1>${escapeHTML(title)}</h1>
    ${meta ? `<div class="meta">${escapeHTML(meta)}</div>` : ""}
    <div class="url">${escapeHTML(window.location.href)}</div>
  </div>
  ${bodyHTML}
</body>
</html>
    `)

    printDoc.close()

    // Follow one guarded path to the print dialog. The previous load listener
    // plus readyState fallback could both fire and open the dialog twice.
    await waitForDocumentReady(printWindow)
    await waitForPrintAssets(printWindow)
    await nextPaint(printWindow)

    const releasePrintLock = () => {
      printInProgress = false
      btn.removeAttribute("aria-disabled")
    }
    printWindow.addEventListener("afterprint", releasePrintLock, { once: true })
    printWindow.addEventListener("pagehide", releasePrintLock, { once: true })
    printWindow.focus()
    printWindow.print()
    window.setTimeout(releasePrintLock, 1000)
  }

  btn.addEventListener("click", onClick)
  window.addCleanup(() => btn.removeEventListener("click", onClick))
})

function isOpeningDiagram(article: HTMLElement, container: HTMLElement): boolean {
  const containerIndex = Array.from(article.children).indexOf(container)
  if (containerIndex < 0) return false

  return Array.from(article.children)
    .slice(0, containerIndex)
    .every((element) => /^H[1-6]$/.test(element.tagName) || element.textContent?.trim() === "")
}

function waitForDocumentReady(target: Window): Promise<void> {
  if (target.document.readyState === "complete") return Promise.resolve()

  return new Promise((resolve) => {
    target.addEventListener("load", () => resolve(), { once: true })
  })
}

async function waitForPrintAssets(target: Window): Promise<void> {
  const fonts = target.document.fonts?.ready ?? Promise.resolve()
  const images = Array.from(target.document.images).map((image) => {
    if (image.complete) return Promise.resolve()
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true })
      image.addEventListener("error", () => resolve(), { once: true })
    })
  })

  await Promise.all([fonts, ...images])
}

function nextPaint(target: Window): Promise<void> {
  return new Promise((resolve) => {
    target.requestAnimationFrame(() => target.requestAnimationFrame(() => resolve()))
  })
}

function escapeHTML(str: string): string {
  const div = document.createElement("div")
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}
