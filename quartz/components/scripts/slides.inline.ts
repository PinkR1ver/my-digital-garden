let slidesMermaidImport: any = undefined

document.addEventListener("nav", () => {
  const btn = document.getElementById("slides-button")
  if (!btn) return

  let opening = false

  const onClick = async () => {
    if (opening) return
    opening = true
    btn.setAttribute("aria-disabled", "true")

    const article = document.querySelector<HTMLElement>("article.popover-hint")
    const titleEl = document.querySelector(".article-title")
    const metaEl = document.querySelector(".content-meta")
    const title = titleEl?.textContent?.trim() ?? document.title
    const meta = metaEl?.textContent?.trim() ?? ""
    const sourceUrl = window.location.href
    const articleCopy = article?.cloneNode(true) as HTMLElement | undefined

    if (!articleCopy) {
      opening = false
      btn.removeAttribute("aria-disabled")
      return
    }

    await prepareSlideContent(articleCopy)
    const contentSlides = splitIntoSlides(articleCopy)
    const slidesHTML = [
      renderTitleSlide(title, meta, sourceUrl),
      ...contentSlides.map((content) => renderContentSlide(content, title)),
    ].join("")

    const slideWindow = window.open("", "_blank", "width=1280,height=800")
    if (!slideWindow) {
      opening = false
      btn.removeAttribute("aria-disabled")
      window.alert("Please allow pop-ups to open the slide deck.")
      return
    }

    const slideDoc = slideWindow.document
    const stylesheetLinks = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]'),
    )
      .map((link) => `<link rel="stylesheet" href="${escapeSlidesHTML(link.href)}">`)
      .join("")

    slideDoc.write(`
<!DOCTYPE html>
<html lang="${escapeSlidesHTML(document.documentElement.lang || "en")}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="${escapeSlidesHTML(document.baseURI)}">
<title>${escapeSlidesHTML(title)} — Slides</title>
${stylesheetLinks}
<style>${slideDeckStyles}</style>
</head>
<body>
  <main class="deck" aria-label="${escapeSlidesHTML(title)} slide deck">
    ${slidesHTML}
  </main>
  <nav class="slide-toolbar" aria-label="Slide controls">
    <button type="button" data-slide-action="previous" aria-label="Previous slide">← Previous</button>
    <span class="slide-counter" aria-live="polite"></span>
    <button type="button" data-slide-action="next" aria-label="Next slide">Next →</button>
    <span class="toolbar-spacer"></span>
    <button type="button" data-slide-action="present">Present</button>
    <button type="button" data-slide-action="print">Print / Save PDF</button>
  </nav>
</body>
</html>
    `)
    slideDoc.close()

    await waitForSlidesDocumentReady(slideWindow)
    await waitForSlideAssets(slideWindow)
    paginateSlideSections(slideWindow, title)
    const refreshDeck = setupSlideDeck(slideWindow)
    refreshDeck()

    opening = false
    btn.removeAttribute("aria-disabled")
    slideWindow.focus()
  }

  btn.addEventListener("click", onClick)
  window.addCleanup(() => btn.removeEventListener("click", onClick))
})

async function prepareSlideContent(article: HTMLElement): Promise<void> {
  article
    .querySelectorAll("script, style, button, .clipboard-button")
    .forEach((element) => element.remove())

  article.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
    if (link.getAttribute("role") === "anchor") {
      link.remove()
      return
    }

    link.target = "_blank"
    link.rel = "noopener noreferrer"
  })

  article.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.disabled = true
  })

  article.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.loading = "eager"
    image.removeAttribute("decoding")
  })

  const mermaidDiagrams = Array.from(article.querySelectorAll<HTMLElement>("code.mermaid"))
  await renderSlideMermaid(mermaidDiagrams)

  mermaidDiagrams.forEach((diagram) => {
    const container = diagram.closest("pre")
    container?.classList.add("slide-mermaid")
    diagram.removeAttribute("tabindex")
    diagram.removeAttribute("role")
    diagram.removeAttribute("aria-label")

    const svg = diagram.querySelector<SVGSVGElement>("svg")
    if (!svg) return

    svg.removeAttribute("width")
    svg.removeAttribute("height")
    svg.style.removeProperty("max-width")
    svg.style.removeProperty("background-color")
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
  })
}

async function renderSlideMermaid(diagrams: HTMLElement[]): Promise<void> {
  const renderable = diagrams
    .map((diagram) => ({ diagram, source: diagram.dataset.mermaidSource }))
    .filter((item): item is { diagram: HTMLElement; source: string } => Boolean(item.source))

  if (renderable.length === 0) return

  const mermaidUrl = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.7.0/mermaid.esm.min.mjs"
  const darkMode = document.documentElement.getAttribute("saved-theme") === "dark"

  let mermaid: any = undefined

  try {
    slidesMermaidImport ||= await import(mermaidUrl)
    mermaid = slidesMermaidImport.default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "default",
    })

    for (const [index, { diagram, source }] of renderable.entries()) {
      const id = `slide-mermaid-${Date.now()}-${index}`
      const { svg } = await mermaid.render(id, source)
      diagram.innerHTML = svg
    }
  } catch (error) {
    console.warn("Could not render Mermaid diagrams for Slides", error)
  } finally {
    // Mermaid configuration is module-global. Restore the page preference so
    // a later SPA navigation still renders normal page diagrams correctly.
    mermaid?.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: darkMode ? "dark" : "default",
    })
  }
}

function splitIntoSlides(article: HTMLElement): string[] {
  const slides: string[] = []
  let current: string[] = []

  const flush = () => {
    if (current.length === 0) return
    slides.push(current.join(""))
    current = []
  }

  for (const element of Array.from(article.children)) {
    if (element.tagName === "HR") {
      flush()
      continue
    }

    // H1/H2 sections make useful default slide boundaries, while an explicit
    // Markdown horizontal rule can split a section more finely.
    if (/^H[12]$/.test(element.tagName) && current.length > 0) {
      flush()
    }

    current.push(element.outerHTML)
  }

  flush()
  return slides
}

function renderTitleSlide(title: string, meta: string, sourceUrl: string): string {
  return `
    <section class="slide title-slide" aria-label="Title slide">
      <div class="slide-content">
        <div class="slide-inner">
          <p class="slide-kicker">Knowledge Garden</p>
          <h1>${escapeSlidesHTML(title)}</h1>
          ${meta ? `<p class="slide-meta">${escapeSlidesHTML(meta)}</p>` : ""}
          <p class="slide-source">${escapeSlidesHTML(sourceUrl)}</p>
        </div>
      </div>
      <footer><span>${escapeSlidesHTML(title)}</span><span class="slide-page-number"></span></footer>
    </section>`
}

function renderContentSlide(content: string, title: string): string {
  return `
    <section class="slide">
      <div class="slide-content"><div class="slide-inner">${content}</div></div>
      <footer><span>${escapeSlidesHTML(title)}</span><span class="slide-page-number"></span></footer>
    </section>`
}

function paginateSlideSections(target: Window, deckTitle: string): void {
  const doc = target.document
  const deck = doc.querySelector<HTMLElement>(".deck")
  if (!deck) return

  const sourceSlides = Array.from(deck.querySelectorAll<HTMLElement>(".slide:not(.title-slide)"))

  for (const sourceSlide of sourceSlides) {
    paginateSlideSection(sourceSlide)
    sourceSlide.remove()
  }

  const slides = Array.from(deck.querySelectorAll<HTMLElement>(".slide"))
  slides.forEach((slide, index) => {
    slide.setAttribute(
      "aria-label",
      `${index === 0 ? "Title slide" : "Slide"} ${index + 1} of ${slides.length}`,
    )
    const pageNumber = slide.querySelector<HTMLElement>(".slide-page-number")
    if (pageNumber) pageNumber.textContent = `${index + 1} / ${slides.length}`

    const footerTitle = slide.querySelector<HTMLElement>("footer span:first-child")
    if (footerTitle) footerTitle.textContent = deckTitle
  })
}

function paginateSlideSection(sourceSlide: HTMLElement): void {
  const sourceInner = sourceSlide.querySelector<HTMLElement>(".slide-inner")
  const parent = sourceSlide.parentElement
  if (!sourceInner || !parent) return

  const sourceBlocks = Array.from(sourceInner.children)
  const sectionHeading = sourceBlocks[0]?.matches("h1, h2") ? sourceBlocks.shift() : undefined
  let currentPage = createContinuationSlide(sourceSlide, sectionHeading, false)
  let currentInner = currentPage.querySelector<HTMLElement>(".slide-inner")!
  let bodyBlocks = 0
  parent.insertBefore(currentPage, sourceSlide)

  const startContinuationPage = () => {
    currentPage = createContinuationSlide(sourceSlide, sectionHeading, true)
    currentInner = currentPage.querySelector<HTMLElement>(".slide-inner")!
    bodyBlocks = 0
    parent.insertBefore(currentPage, sourceSlide)
  }

  const appendAtomicBlock = (sourceBlock: Element) => {
    const block = sourceBlock.cloneNode(true) as HTMLElement
    currentInner.append(block)

    if (slideContentFits(currentPage)) {
      bodyBlocks += 1
      return
    }

    block.remove()
    if (bodyBlocks > 0) {
      startContinuationPage()
    }
    currentInner.append(block)

    if (!slideContentFits(currentPage)) {
      block.remove()
      if (appendSplitBlock(sourceBlock)) return
      currentInner.append(block)
    }

    // A single paragraph, image, diagram, or other atomic block may itself be
    // taller than a slide. Keep it intact and let fitSlide scale only that page.
    bodyBlocks += 1
  }

  const appendSegmentedBlock = (
    createShell: (consumedItems: number) => { shell: HTMLElement; itemContainer: HTMLElement },
    items: Element[],
  ) => {
    let consumedItems = 0
    let segmentItems = 0
    let { shell, itemContainer } = createShell(consumedItems)
    currentInner.append(shell)
    bodyBlocks += 1

    for (const sourceItem of items) {
      if (segmentItems > 0 && !slideContentFits(currentPage)) {
        startContinuationPage()
        ;({ shell, itemContainer } = createShell(consumedItems))
        currentInner.append(shell)
        bodyBlocks = 1
        segmentItems = 0
      }

      const item = sourceItem.cloneNode(true) as HTMLElement
      itemContainer.append(item)

      if (segmentItems > 0 && !slideContentFits(currentPage)) {
        item.remove()
        startContinuationPage()
        ;({ shell, itemContainer } = createShell(consumedItems))
        currentInner.append(shell)
        bodyBlocks = 1
        segmentItems = 0
        itemContainer.append(item)
      }

      consumedItems += 1
      segmentItems += 1
    }
  }

  const appendSplitBlock = (sourceBlock: Element): boolean => {
    if (sourceBlock.matches("ul, ol")) {
      const list = sourceBlock as HTMLOListElement
      const items = Array.from(list.children).filter((child) => child.tagName === "LI")
      if (items.length < 2) return false

      const originalStart =
        list.tagName === "OL"
          ? list.hasAttribute("start")
            ? list.start
            : list.reversed
              ? items.length
              : 1
          : 0
      const listStep = list.reversed ? -1 : 1
      appendSegmentedBlock((consumedItems) => {
        const shell = list.cloneNode(false) as HTMLOListElement
        if (shell.tagName === "OL") shell.start = originalStart + consumedItems * listStep
        return { shell, itemContainer: shell }
      }, items)
      return true
    }

    const table = sourceBlock.matches("table")
      ? (sourceBlock as HTMLTableElement)
      : sourceBlock.querySelector<HTMLTableElement>(":scope > table")
    if (table) {
      const rows = Array.from(table.tBodies).flatMap((body) => Array.from(body.rows))
      if (rows.length < 2) return false

      appendSegmentedBlock(() => {
        const tableShell = table.cloneNode(false) as HTMLTableElement
        table
          .querySelectorAll(":scope > caption, :scope > colgroup, :scope > thead")
          .forEach((element) => {
            tableShell.append(element.cloneNode(true))
          })
        const itemContainer = docCreateElement(sourceSlide, "tbody")
        tableShell.append(itemContainer)
        const shell = wrapSplitBlock(sourceBlock, table, tableShell)
        return { shell, itemContainer }
      }, rows)
      return true
    }

    const pre = sourceBlock.matches("pre")
      ? (sourceBlock as HTMLElement)
      : sourceBlock.querySelector<HTMLElement>(":scope > pre")
    if (pre && !pre.classList.contains("slide-mermaid")) {
      const code = pre.querySelector<HTMLElement>("code")
      const lines = code
        ? Array.from(code.children).filter((child) => child.hasAttribute("data-line"))
        : []
      if (!code || lines.length < 2) return false

      appendSegmentedBlock(() => {
        const preShell = pre.cloneNode(false) as HTMLElement
        const itemContainer = code.cloneNode(false) as HTMLElement
        preShell.append(itemContainer)
        const shell = wrapSplitBlock(sourceBlock, pre, preShell)
        return { shell, itemContainer }
      }, lines)
      return true
    }

    return false
  }

  for (const sourceBlock of sourceBlocks) {
    appendAtomicBlock(sourceBlock)
  }

  // A heading-only section should still produce one slide.
  if (sourceBlocks.length === 0 && !sectionHeading) {
    currentPage.remove()
  }
}

function createContinuationSlide(
  sourceSlide: HTMLElement,
  sectionHeading: Element | undefined,
  continuation: boolean,
): HTMLElement {
  const slide = sourceSlide.cloneNode(true) as HTMLElement
  const inner = slide.querySelector<HTMLElement>(".slide-inner")!
  inner.replaceChildren()
  inner.style.transform = ""

  if (sectionHeading) {
    const heading = sectionHeading.cloneNode(true) as HTMLElement
    if (continuation) {
      heading.classList.add("continued-heading")
      const marker = slide.ownerDocument.createElement("span")
      marker.className = "continued-marker"
      marker.textContent = "continued"
      heading.append(marker)
    }
    inner.append(heading)
  }

  return slide
}

function slideContentFits(slide: HTMLElement): boolean {
  const content = slide.querySelector<HTMLElement>(".slide-content")
  const inner = slide.querySelector<HTMLElement>(".slide-inner")
  if (!content || !inner) return true

  const available = slideContentBox(content)
  return inner.scrollHeight <= available.height + 1 && inner.scrollWidth <= available.width + 1
}

function slideContentBox(content: HTMLElement): { width: number; height: number } {
  const view = content.ownerDocument.defaultView
  const style = view?.getComputedStyle(content)
  const horizontalPadding =
    Number.parseFloat(style?.paddingLeft ?? "0") + Number.parseFloat(style?.paddingRight ?? "0")
  const verticalPadding =
    Number.parseFloat(style?.paddingTop ?? "0") + Number.parseFloat(style?.paddingBottom ?? "0")

  return {
    width: Math.max(0, content.clientWidth - horizontalPadding),
    height: Math.max(0, content.clientHeight - verticalPadding),
  }
}

function docCreateElement(source: Element, tagName: string): HTMLElement {
  return source.ownerDocument.createElement(tagName)
}

function wrapSplitBlock(
  sourceBlock: Element,
  splitTarget: Element,
  splitTargetClone: HTMLElement,
): HTMLElement {
  if (sourceBlock === splitTarget) return splitTargetClone

  const wrapper = sourceBlock.cloneNode(false) as HTMLElement
  wrapper.append(splitTargetClone)
  return wrapper
}

function setupSlideDeck(target: Window): () => void {
  const doc = target.document
  const slides = Array.from(doc.querySelectorAll<HTMLElement>(".slide"))
  const counter = doc.querySelector<HTMLElement>(".slide-counter")
  const previous = doc.querySelector<HTMLButtonElement>('[data-slide-action="previous"]')
  const next = doc.querySelector<HTMLButtonElement>('[data-slide-action="next"]')
  const present = doc.querySelector<HTMLButtonElement>('[data-slide-action="present"]')
  const print = doc.querySelector<HTMLButtonElement>('[data-slide-action="print"]')
  let current = 0

  const fitSlide = (slide: HTMLElement) => {
    const content = slide.querySelector<HTMLElement>(".slide-content")
    const inner = slide.querySelector<HTMLElement>(".slide-inner")
    if (!content || !inner) return

    inner.style.transform = ""
    const available = slideContentBox(content)
    const widthScale = available.width / Math.max(inner.scrollWidth, 1)
    const heightScale = available.height / Math.max(inner.scrollHeight, 1)
    const scale = Math.min(1, widthScale, heightScale)

    if (scale < 0.995) {
      inner.style.transform = `scale(${scale})`
    }
  }

  const show = (index: number) => {
    current = Math.max(0, Math.min(index, slides.length - 1))
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== current
    })
    if (counter) counter.textContent = `${current + 1} / ${slides.length}`
    if (previous) previous.disabled = current === 0
    if (next) next.disabled = current === slides.length - 1
    fitSlide(slides[current])
  }

  const refresh = () => {
    const hidden = slides.map((slide) => slide.hidden)
    slides.forEach((slide) => {
      slide.hidden = false
      fitSlide(slide)
    })
    slides.forEach((slide, index) => {
      slide.hidden = hidden[index]
    })
    show(current)
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
      event.preventDefault()
      show(current + 1)
    } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault()
      show(current - 1)
    } else if (event.key === "Home") {
      event.preventDefault()
      show(0)
    } else if (event.key === "End") {
      event.preventDefault()
      show(slides.length - 1)
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault()
      void doc.documentElement.requestFullscreen?.()
    }
  }

  const onBeforePrint = () => {
    slides.forEach((slide) => {
      slide.hidden = false
      fitSlide(slide)
    })
  }
  const onAfterPrint = () => show(current)

  previous?.addEventListener("click", () => show(current - 1))
  next?.addEventListener("click", () => show(current + 1))
  present?.addEventListener("click", () => void doc.documentElement.requestFullscreen?.())
  print?.addEventListener("click", () => {
    target.focus()
    target.print()
  })
  target.addEventListener("keydown", onKeydown)
  target.addEventListener("resize", refresh)
  target.addEventListener("beforeprint", onBeforePrint)
  target.addEventListener("afterprint", onAfterPrint)

  show(0)
  return refresh
}

function waitForSlidesDocumentReady(target: Window): Promise<void> {
  if (target.document.readyState === "complete") return Promise.resolve()

  return new Promise((resolve) => {
    target.addEventListener("load", () => resolve(), { once: true })
  })
}

async function waitForSlideAssets(target: Window): Promise<void> {
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

function escapeSlidesHTML(str: string): string {
  const div = document.createElement("div")
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

const slideDeckStyles = String.raw`
  :root {
    --slide-accent: #2563eb;
    --slide-text: #18212f;
    --slide-muted: #64748b;
    --slide-border: #dbe3ee;
    --slide-surface: #f7f9fc;
    --slide-code: #eef2f7;
    color-scheme: light;
  }

  * { box-sizing: border-box; }

  html, body { min-height: 100%; }

  body {
    margin: 0;
    overflow: hidden;
    color: var(--slide-text);
    background: #111827;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .deck {
    display: grid;
    place-items: center;
    width: 100vw;
    height: calc(100vh - 4.5rem);
    padding: 1.5rem;
  }

  .slide {
    position: relative;
    display: flex;
    flex-direction: column;
    width: min(calc(100vw - 3rem), calc((100vh - 7.5rem) * 16 / 9));
    height: min(calc((100vw - 3rem) * 9 / 16), calc(100vh - 7.5rem));
    max-width: 13.333in;
    max-height: 7.5in;
    min-height: 0;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    color: var(--slide-text);
    background:
      radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.11), transparent 31%),
      #fff;
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 12px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
  }

  .slide[hidden] { display: none !important; }

  .slide-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    padding: 0.58in 0.72in 0.28in;
  }

  .slide-inner {
    width: 100%;
    transform-origin: top center;
    font-size: 24px;
    line-height: 1.42;
  }

  .slide h1, .slide h2, .slide h3, .slide h4, .slide h5, .slide h6 {
    color: var(--slide-text);
    font-family: inherit;
    font-weight: 700;
    line-height: 1.12;
    letter-spacing: -0.025em;
  }

  .slide h1, .slide h2 {
    margin: 0 0 0.38em;
    font-size: 1.78em;
  }

  .slide h2 {
    padding-bottom: 0.2em;
    border-bottom: 3px solid var(--slide-accent);
  }

  .slide h3 { margin: 0.7em 0 0.28em; font-size: 1.32em; }
  .slide h4, .slide h5, .slide h6 { margin: 0.6em 0 0.22em; font-size: 1.08em; }
  .slide .continued-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5em; }
  .slide .continued-marker { color: var(--slide-muted); font-size: 0.34em; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }
  .slide p { margin: 0.35em 0; }
  .slide ul, .slide ol { margin: 0.35em 0 0.35em 1.3em; padding: 0; }
  .slide li { margin: 0.16em 0; }
  .slide li > p { margin: 0.12em 0; }
  .slide a { color: var(--slide-accent); text-decoration-thickness: 1px; text-underline-offset: 0.12em; }
  .slide a[role="anchor"], .slide .external-icon { display: none; }

  .slide blockquote {
    margin: 0.55em 0;
    padding: 0.35em 0.72em;
    color: #475569;
    background: var(--slide-surface);
    border-left: 4px solid var(--slide-accent);
  }

  .slide code {
    padding: 0.08em 0.25em;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 0.73em;
    background: var(--slide-code);
    border-radius: 0.18em;
  }

  .slide pre {
    margin: 0.45em 0;
    padding: 0.48em 0.62em;
    overflow: hidden;
    font-size: 0.82em;
    line-height: 1.36;
    background: var(--slide-code);
    border: 1px solid var(--slide-border);
    border-radius: 0.32em;
  }

  .slide pre > code { padding: 0; font-size: inherit; background: transparent; }
  .slide img { display: block; max-width: 100%; max-height: 4.55in; margin: 0.38em auto; object-fit: contain; }
  .slide video, .slide iframe { max-width: 100%; max-height: 4.55in; }

  .slide table {
    width: 100%;
    margin: 0.45em 0;
    border-collapse: collapse;
    font-size: 0.68em;
  }

  .slide th, .slide td { padding: 0.34em 0.5em; border: 1px solid var(--slide-border); text-align: left; }
  .slide th { background: var(--slide-surface); }

  .slide .callout {
    margin: 0.48em 0;
    padding: 0.42em 0.62em;
    background: var(--slide-surface);
    border: 1px solid var(--slide-border);
    border-left: 5px solid var(--slide-accent);
    border-radius: 0.28em;
  }

  .slide .callout-title { font-weight: 700; }
  .slide .callout-content p { margin: 0.2em 0; }
  .slide .footnotes { font-size: 0.64em; }

  .slide pre.slide-mermaid {
    padding: 0;
    overflow: hidden;
    background: transparent;
    border: 0;
  }

  .slide pre.slide-mermaid code.mermaid {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    overflow: hidden;
    background: transparent;
    line-height: 0;
  }

  .slide pre.slide-mermaid code.mermaid::after { display: none; }
  .slide pre.slide-mermaid svg {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: 4.6in !important;
    margin: auto;
    overflow: hidden;
  }

  .slide footer {
    display: flex;
    flex: 0 0 auto;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.13in 0.44in 0.17in;
    color: var(--slide-muted);
    font-size: 0.14in;
    border-top: 1px solid var(--slide-border);
  }

  .slide footer span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .title-slide .slide-content {
    display: flex;
    align-items: center;
    padding: 0.78in 1in 0.45in;
  }

  .title-slide .slide-inner { transform-origin: center; }
  .title-slide h1 { max-width: 10.5in; margin: 0.14em 0 0.28em; font-size: 0.62in; }

  .slide-kicker {
    margin: 0;
    color: var(--slide-accent);
    font-size: 0.18in;
    font-weight: 750;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .slide-meta { color: var(--slide-muted); font-size: 0.23in; }
  .slide-source { margin-top: 0.42in !important; color: var(--slide-muted); font-size: 0.15in; overflow-wrap: anywhere; }

  .slide-toolbar {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    height: 4.5rem;
    padding: 0 1.5rem;
    color: #e5e7eb;
    background: #0b1120;
    border-top: 1px solid #273244;
  }

  .slide-toolbar button {
    padding: 0.55rem 0.85rem;
    color: #f8fafc;
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 0.42rem;
    cursor: pointer;
    font: 600 0.86rem/1.1 inherit;
  }

  .slide-toolbar button:hover { background: #334155; }
  .slide-toolbar button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
  .slide-toolbar button:disabled { cursor: default; opacity: 0.42; }
  .slide-counter { min-width: 4.4rem; text-align: center; font-variant-numeric: tabular-nums; }
  .toolbar-spacer { flex: 1; }

  :fullscreen .deck { height: 100vh; padding: 0; background: #000; }
  :fullscreen .slide { width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); max-width: none; max-height: none; border: 0; border-radius: 0; box-shadow: none; }
  :fullscreen .slide-toolbar { display: none; }

  @media (max-width: 680px) {
    .deck { height: calc(100vh - 7rem); padding: 0.5rem; }
    .slide { width: min(calc(100vw - 1rem), calc((100vh - 8rem) * 16 / 9)); height: min(calc((100vw - 1rem) * 9 / 16), calc(100vh - 8rem)); border-radius: 6px; }
    .slide-toolbar { height: 7rem; padding: 0.65rem; flex-wrap: wrap; align-content: center; }
    .toolbar-spacer { display: none; }
  }

  @page { size: 13.333in 7.5in; margin: 0; }

  @media print {
    html, body { width: 13.333in; min-height: 7.5in; overflow: visible; background: #fff; }
    .slide-toolbar { display: none !important; }
    .deck { display: block; width: auto; height: auto; padding: 0; }
    .slide {
      display: flex !important;
      width: 13.333in;
      height: 7.5in;
      margin: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      break-after: page;
      page-break-after: always;
    }
    .slide:last-child { break-after: auto; page-break-after: auto; }
  }
`
