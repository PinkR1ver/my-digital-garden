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
    const isReport = article?.classList.contains("report-page") ?? false
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

  body.report-print {
    --report-blue: #2c5f75;
    --report-blue-muted: #6e7c83;
    --report-border: #b9cbd2;
    --report-table-head: #ddecef;
    --report-table-alt: #f4f8f9;
    --report-ink: #363f43;
    max-width: 760px;
    color: var(--report-ink);
    font-size: 11pt;
    line-height: 1.72;
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

  .report-print .print-header {
    border-bottom-color: var(--report-border);
  }
  .report-print .print-header h1 {
    color: var(--report-blue);
    font-weight: 500;
  }
  .report-print .print-header .meta,
  .report-print .print-header .url {
    color: var(--report-blue-muted);
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

  .report-print h2,
  .report-print h3,
  .report-print h4 {
    color: var(--report-blue);
    font-family: Georgia, "Noto Serif SC", "Songti SC", "STSong", serif;
    font-weight: 500;
  }
  .report-print h2 {
    border-bottom-color: var(--report-border);
  }
  .report-print strong {
    color: var(--report-blue);
    font-weight: 650;
  }

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
  .report-print blockquote {
    border-left-color: var(--report-blue);
    background: #f5f8f9;
    color: #44545a;
    font-style: normal;
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
    line-height: normal;
  }
  pre.print-mermaid code.mermaid::after { display: none; }
  pre.print-mermaid .nodeLabel,
  pre.print-mermaid .edgeLabel,
  pre.print-mermaid .label,
  pre.print-mermaid foreignObject div {
    line-height: 1.2 !important;
  }
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
  .report-print table {
    font-size: 8.5pt;
    line-height: 1.45;
  }
  .report-print thead,
  .report-print th {
    background: var(--report-table-head);
  }
  .report-print tbody tr:nth-child(even) {
    background: var(--report-table-alt);
  }
  .report-print th,
  .report-print td {
    border-color: var(--report-border);
    padding: 7px 9px;
    vertical-align: top;
  }
  .report-print th {
    color: var(--report-blue);
    font-weight: 650;
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
  .report-print .callout {
    border: 1px solid var(--report-border);
    border-radius: 0;
    background: #f7fafb;
  }

  /* images */
  img { max-width: 100%; height: auto; border-radius: 4px; }

  /* tags / misc */
  hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
  .tags { display: none; }

  /* ---- print overrides ---- */
  @media print {
    @page {
      size: A4;
      margin: ${isReport ? "16mm 17mm 18mm" : "12mm"};
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
      padding-bottom: 8pt;
      margin-bottom: 12pt;
    }
    .print-header h1 { font-size: 18pt; }
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
      /* Give diagrams most of the A4 sheet instead of shrinking the opening
         flowchart to share an artificially small first-page budget. */
      margin: 2mm 0;
      border: 0;
      background: transparent !important;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    pre.print-mermaid svg {
      max-height: 220mm !important;
    }
    th { background: #f0f0f0 !important; }
    .report-print th { background: var(--report-table-head) !important; }
    .report-print tbody tr:nth-child(even) {
      background: var(--report-table-alt) !important;
    }
    a { color: inherit; }
  }
</style>
</head>
<body${isReport ? ' class="report-print"' : ""}>
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
