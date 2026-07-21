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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;700&family=Alfa+Slab+One&family=Archivo:wght@400;700;800;900&family=Archivo+Black&family=Archivo+Narrow:wght@400;700&family=Barlow:wght@400;600;700;800;900&family=Barlow+Condensed:wght@600;800;900&family=Bebas+Neue&family=Big+Shoulders+Display:wght@700;900&family=Bodoni+Moda:wght@400;700;900&family=Bowlby+One&family=Caveat:wght@400;700&family=Chakra+Petch:wght@400;600;700&family=Cormorant:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&family=Courier+Prime:wght@400;700&family=DM+Sans:wght@300;400;500;700;800&family=DM+Mono:wght@300;400;500&family=Fraunces:opsz,wght@9..144,400;9..144,700;9..144,900&family=Fredoka:wght@500;600;700&family=Hanken+Grotesk:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;600&family=Instrument+Serif:ital@0;1&family=Jost:wght@200;300;400;600;800&family=Libre+Baskerville:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Manrope:wght@400;500;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,600&family=Noto+Sans+JP:wght@400;700;900&family=Noto+Sans+SC:wght@300;400;500;700;900&family=Noto+Serif+SC:wght@300;400;700;900&family=Outfit:wght@400;500;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Press+Start+2P&family=Quicksand:wght@500;600;700&family=Shrikhand&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Stardos+Stencil:wght@400;700&family=Syne:wght@700;800&family=Tektur:wght@600;700;800;900&family=VT323&family=Work+Sans:wght@400;500;700&display=swap">
<style>${slideDeckStyles}</style>
</head>
<body>
  <div class="deck-viewport">
    <main class="deck-stage deck" aria-label="${escapeSlidesHTML(title)} slide deck">
      ${slidesHTML}
    </main>
  </div>
  <nav class="slide-toolbar deck-controls" aria-label="Slide controls">
    <button type="button" data-slide-action="previous" aria-label="Previous slide">← Previous</button>
    <span class="slide-counter" aria-live="polite"></span>
    <button type="button" data-slide-action="next" aria-label="Next slide">Next →</button>
    <label class="slide-style-control">
      <span>Style</span>
      <select data-slide-action="style" aria-label="Slide style">
        <optgroup label="Core Presets">
          <option value="editorial">Editorial</option>
          <option value="bold-signal">Bold Signal</option>
          <option value="electric-studio">Electric Studio</option>
          <option value="voltage">Creative Voltage</option>
          <option value="botanical">Dark Botanical</option>
          <option value="notebook">Notebook Tabs</option>
          <option value="pastel">Pastel Geometry</option>
          <option value="split-pastel">Split Pastel</option>
          <option value="vintage-editorial">Vintage Editorial</option>
          <option value="neon-cyber">Neon Cyber</option>
          <option value="terminal-green">Terminal Green</option>
          <option value="swiss">Swiss Modern</option>
          <option value="paper-ink">Paper &amp; Ink</option>
          <option value="midnight">Midnight</option>
        </optgroup>
        <optgroup label="Bold Template Pack">
          <option value="8-bit-orbit">8-Bit Orbit</option>
          <option value="biennale-yellow">Biennale Yellow</option>
          <option value="block-frame">BlockFrame</option>
          <option value="blue-professional">Blue Professional</option>
          <option value="bold-poster">Bold Poster</option>
          <option value="broadside">Broadside</option>
          <option value="capsule">Capsule</option>
          <option value="cartesian">Cartesian</option>
          <option value="cobalt-grid">Cobalt Grid</option>
          <option value="coral">Coral</option>
          <option value="creative-mode">Creative Mode</option>
          <option value="daisy-days">Daisy Days</option>
          <option value="editorial-forest">Editorial Forest</option>
          <option value="editorial-tri-tone">Editorial Tri-Tone</option>
          <option value="emerald-editorial">Emerald Editorial</option>
          <option value="grove">Grove</option>
          <option value="long-table">Long Table</option>
          <option value="mat">Mat</option>
          <option value="monochrome">Monochrome</option>
          <option value="neo-grid-bold">Neo-Grid Bold</option>
          <option value="peoples-platform">People's Platform</option>
          <option value="pin-and-paper">Pin &amp; Paper</option>
          <option value="pink-script">Pink Script — After Hours</option>
          <option value="playful">Playful</option>
          <option value="raw-grid">Raw Grid</option>
          <option value="retro-windows">Retro Windows</option>
          <option value="retro-zine">Retro Zine</option>
          <option value="sakura-chroma">Sakura Chroma</option>
          <option value="scatterbrain">Scatterbrain</option>
          <option value="signal">Signal</option>
          <option value="soft-editorial">Soft Editorial</option>
          <option value="stencil-tablet">Stencil &amp; Tablet</option>
          <option value="studio">Studio</option>
          <option value="vellum">Vellum</option>
        </optgroup>
      </select>
    </label>
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

    slide.querySelectorAll<HTMLElement>(".slide-inner > *").forEach((element) => {
      element.classList.add("reveal")
    })
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
  const stage = doc.querySelector<HTMLElement>(".deck-stage")
  const counter = doc.querySelector<HTMLElement>(".slide-counter")
  const previous = doc.querySelector<HTMLButtonElement>('[data-slide-action="previous"]')
  const next = doc.querySelector<HTMLButtonElement>('[data-slide-action="next"]')
  const present = doc.querySelector<HTMLButtonElement>('[data-slide-action="present"]')
  const print = doc.querySelector<HTMLButtonElement>('[data-slide-action="print"]')
  const styleSelect = doc.querySelector<HTMLSelectElement>('[data-slide-action="style"]')
  const styleStorageKey = "quartz-slide-style"
  const allowedStyles = new Set(
    Array.from(styleSelect?.options ?? []).map((option) => option.value),
  )
  let current = 0
  let touchStartX = 0
  let touchStartY = 0
  let lastWheelNavigation = 0

  const scaleStage = () => {
    if (!stage) return

    const controlsVisible = !doc.fullscreenElement
    const controlsHeight = controlsVisible ? 88 : 0
    const availableWidth = target.innerWidth
    const availableHeight = Math.max(1, target.innerHeight - controlsHeight)
    const scale = Math.min(availableWidth / 1920, availableHeight / 1080)
    const x = (availableWidth - 1920 * scale) / 2
    const y = (availableHeight - 1080 * scale) / 2
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }

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
      const active = slideIndex === current
      slide.classList.toggle("active", active)
      slide.classList.toggle("visible", active)
      slide.setAttribute("aria-hidden", String(!active))
    })
    if (counter) counter.textContent = `${current + 1} / ${slides.length}`
    if (previous) previous.disabled = current === 0
    if (next) next.disabled = current === slides.length - 1
    fitSlide(slides[current])
  }

  const refresh = () => {
    slides.forEach(fitSlide)
    scaleStage()
    show(current)
  }

  const applyStyle = (requestedStyle: string | null, persist: boolean) => {
    const style = requestedStyle && allowedStyles.has(requestedStyle) ? requestedStyle : "editorial"
    doc.body.dataset.slideStyle = style
    if (styleSelect) styleSelect.value = style

    if (persist) {
      try {
        target.localStorage.setItem(styleStorageKey, style)
      } catch {
        // Storage may be unavailable in privacy-focused browsing modes.
      }
    }

    refresh()
    void doc.fonts?.ready.then(() => refresh())
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
    slides.forEach(fitSlide)
  }
  const onAfterPrint = () => {
    show(current)
    scaleStage()
  }

  const onTouchStart = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    touchStartX = touch.clientX
    touchStartY = touch.clientY
  }

  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - touchStartX
    const deltaY = touch.clientY - touchStartY
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return
    show(current + (deltaX < 0 ? 1 : -1))
  }

  const onWheel = (event: WheelEvent) => {
    if ((event.target as Element | null)?.closest?.(".slide-toolbar")) return
    if (Math.abs(event.deltaY) < 24 && Math.abs(event.deltaX) < 24) return
    const now = Date.now()
    if (now - lastWheelNavigation < 450) return
    lastWheelNavigation = now
    show(current + (event.deltaY > 0 || event.deltaX > 0 ? 1 : -1))
  }

  previous?.addEventListener("click", () => show(current - 1))
  next?.addEventListener("click", () => show(current + 1))
  present?.addEventListener("click", () => void doc.documentElement.requestFullscreen?.())
  styleSelect?.addEventListener("change", () => applyStyle(styleSelect.value, true))
  print?.addEventListener("click", () => {
    target.focus()
    target.print()
  })
  target.addEventListener("keydown", onKeydown)
  target.addEventListener("resize", refresh)
  doc.addEventListener("fullscreenchange", scaleStage)
  target.addEventListener("touchstart", onTouchStart, { passive: true })
  target.addEventListener("touchend", onTouchEnd, { passive: true })
  target.addEventListener("wheel", onWheel, { passive: true })
  target.addEventListener("beforeprint", onBeforePrint)
  target.addEventListener("afterprint", onAfterPrint)

  let initialStyle: string | null = null
  try {
    initialStyle = target.localStorage.getItem(styleStorageKey)
  } catch {
    // Use the default style when storage is unavailable.
  }
  applyStyle(initialStyle, false)
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
  /* === THEME: KNOWLEDGE GARDEN EDITORIAL === */
  :root {
    --stage-bg: #0b1220;
    --slide-bg: #fbfaf6;
    --slide-accent: #1d4ed8;
    --slide-accent-soft: rgba(29, 78, 216, 0.1);
    --slide-text: #172033;
    --slide-muted: #687386;
    --slide-border: #d7dce4;
    --slide-surface: #f0f2f5;
    --slide-code: #e9edf2;
    --stage-atmosphere: radial-gradient(circle at 18% 22%, rgba(37, 99, 235, 0.16), transparent 30%);
    --slide-pattern:
      linear-gradient(rgba(23, 32, 51, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(23, 32, 51, 0.025) 1px, transparent 1px),
      radial-gradient(circle at 100% 0%, var(--slide-accent-soft), transparent 33%),
      var(--slide-bg);
    --slide-pattern-size: 48px 48px, 48px 48px, auto, auto;
    --font-display: "DM Serif Display", "Noto Serif CJK SC", serif;
    --font-body: "Bricolage Grotesque", "Noto Sans CJK SC", sans-serif;
    --font-code: "JetBrains Mono", "Noto Sans Mono CJK SC", monospace;
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    color-scheme: light;
  }

  /* === LIVE STYLE PRESETS ===
     Themes share geometry so switching styles does not repaginate the deck. */
  body[data-slide-style="swiss"] {
    --stage-bg: #111111;
    --slide-bg: #ffffff;
    --slide-accent: #ff3300;
    --slide-accent-soft: rgba(255, 51, 0, 0.12);
    --slide-text: #0a0a0a;
    --slide-muted: #505050;
    --slide-border: #111111;
    --slide-surface: #f3f3f1;
    --slide-code: #efefec;
    --stage-atmosphere: linear-gradient(135deg, #1d1d1d, #050505);
    --slide-pattern:
      linear-gradient(rgba(10, 10, 10, 0.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(10, 10, 10, 0.055) 1px, transparent 1px),
      linear-gradient(135deg, transparent 0 82%, var(--slide-accent-soft) 82% 100%),
      var(--slide-bg);
    --slide-pattern-size: 64px 64px, 64px 64px, auto, auto;
    --font-display: "Bricolage Grotesque", "Noto Sans CJK SC", sans-serif;
  }

  body[data-slide-style="midnight"] {
    --stage-bg: #020617;
    --slide-bg: #0d1424;
    --slide-accent: #39d353;
    --slide-accent-soft: rgba(57, 211, 83, 0.12);
    --slide-text: #edf7ef;
    --slide-muted: #9aada0;
    --slide-border: #294132;
    --slide-surface: #15231b;
    --slide-code: #07110b;
    --stage-atmosphere: radial-gradient(circle at 78% 18%, rgba(57, 211, 83, 0.16), transparent 34%);
    --slide-pattern:
      linear-gradient(rgba(57, 211, 83, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(57, 211, 83, 0.045) 1px, transparent 1px),
      radial-gradient(circle at 100% 0%, var(--slide-accent-soft), transparent 35%),
      var(--slide-bg);
    --slide-pattern-size: 52px 52px, 52px 52px, auto, auto;
    --font-display: "JetBrains Mono", "Noto Sans Mono CJK SC", monospace;
    color-scheme: dark;
  }

  body[data-slide-style="broadside"] {
    --stage-bg: #111111;
    --slide-bg: #111111;
    --slide-accent: #e85d26;
    --slide-accent-soft: rgba(232, 93, 38, 0.12);
    --slide-text: #f0ece5;
    --slide-muted: #888880;
    --slide-border: #282826;
    --slide-surface: #1a1a18;
    --slide-code: #1a1a18;
    --stage-atmosphere: linear-gradient(#111111, #111111);
    --slide-pattern: linear-gradient(#111111, #111111);
    --slide-pattern-size: auto;
    --font-display: "Barlow", "Noto Serif SC", sans-serif;
    --font-body: "Barlow", "Noto Sans SC", sans-serif;
    --font-code: "IBM Plex Mono", "Noto Sans SC", monospace;
    color-scheme: dark;
  }

  body[data-slide-style="botanical"] {
    --stage-bg: #090909;
    --slide-bg: #0f0f0f;
    --slide-accent: #d4a574;
    --slide-accent-soft: rgba(212, 165, 116, 0.12);
    --slide-text: #e8e4df;
    --slide-muted: #9a9590;
    --slide-border: #38332f;
    --slide-surface: #1a1817;
    --slide-code: #191817;
    --stage-atmosphere: radial-gradient(circle at 76% 18%, rgba(232, 180, 184, 0.16), transparent 35%);
    --slide-pattern: linear-gradient(#0f0f0f, #0f0f0f);
    --slide-pattern-size: auto;
    --font-display: "Cormorant Garamond", "Noto Serif SC", serif;
    --font-body: "IBM Plex Sans", "Noto Sans SC", sans-serif;
    color-scheme: dark;
  }

  body[data-slide-style="notebook"] {
    --stage-bg: #2d2d2d;
    --slide-bg: #f8f6f1;
    --slide-accent: #507c68;
    --slide-accent-soft: rgba(80, 124, 104, 0.12);
    --slide-text: #1a1a1a;
    --slide-muted: #68655f;
    --slide-border: #cbc5ba;
    --slide-surface: #efeae1;
    --slide-code: #e9e5dd;
    --stage-atmosphere: linear-gradient(135deg, #383838, #202020);
    --slide-pattern:
      linear-gradient(rgba(75, 68, 60, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(75, 68, 60, 0.03) 1px, transparent 1px),
      var(--slide-bg);
    --slide-pattern-size: 42px 42px, 42px 42px, auto;
    --font-display: "Bodoni Moda", "Noto Serif SC", serif;
    --font-body: "DM Sans", "Noto Sans SC", sans-serif;
  }

  body[data-slide-style="voltage"] {
    --stage-bg: #101025;
    --slide-bg: #101025;
    --slide-accent: #d4ff00;
    --slide-accent-soft: rgba(212, 255, 0, 0.12);
    --slide-text: #ffffff;
    --slide-muted: #c6c9ed;
    --slide-border: rgba(255, 255, 255, 0.24);
    --slide-surface: rgba(16, 16, 37, 0.82);
    --slide-code: #0b0b20;
    --stage-atmosphere: radial-gradient(circle at 20% 20%, rgba(0, 102, 255, 0.3), transparent 35%);
    --slide-pattern:
      linear-gradient(90deg, #0066ff 0 48%, #1a1a2e 48% 100%),
      var(--slide-bg);
    --slide-pattern-size: auto;
    --font-display: "Syne", "Noto Sans SC", sans-serif;
    --font-body: "Space Grotesk", "Noto Sans SC", sans-serif;
    --font-code: "Space Mono", "Noto Sans SC", monospace;
    color-scheme: dark;
  }

  body[data-slide-style="pastel"] {
    --stage-bg: #c8d9e6;
    --slide-bg: #faf9f7;
    --slide-accent: #705fa3;
    --slide-accent-soft: rgba(112, 95, 163, 0.12);
    --slide-text: #20212a;
    --slide-muted: #626779;
    --slide-border: #c9c9d4;
    --slide-surface: #f0edf5;
    --slide-code: #ebeaf1;
    --stage-atmosphere: linear-gradient(135deg, #c8d9e6, #a8d4c4);
    --slide-pattern:
      linear-gradient(118deg, rgba(240, 180, 212, 0.2) 0 28%, transparent 28% 72%, rgba(168, 212, 196, 0.22) 72% 100%),
      var(--slide-bg);
    --slide-pattern-size: auto;
    --font-display: "Plus Jakarta Sans", "Noto Sans SC", sans-serif;
    --font-body: "Plus Jakarta Sans", "Noto Sans SC", sans-serif;
  }

  body[data-slide-style="bold-signal"] {
    --stage-bg: #171717; --slide-bg: #1a1a1a; --slide-accent: #ff5722;
    --slide-accent-soft: rgba(255,87,34,.18); --slide-text: #ffffff; --slide-muted: #b9b9b9;
    --slide-border: #3a3a3a; --slide-surface: #242424; --slide-code: #111111;
    --stage-atmosphere: linear-gradient(135deg,#2d2d2d,#0d0d0d);
    --slide-pattern: linear-gradient(135deg,rgba(255,87,34,.16),transparent 42%),#1a1a1a;
    --slide-pattern-size: auto; --font-display: "Archivo Black","Noto Sans SC",sans-serif;
    --font-body: "Space Grotesk","Noto Sans SC",sans-serif; color-scheme: dark;
  }

  body[data-slide-style="electric-studio"] {
    --stage-bg: #0a0a0a; --slide-bg: #ffffff; --slide-accent: #4361ee;
    --slide-accent-soft: rgba(67,97,238,.14); --slide-text: #0a0a0a; --slide-muted: #525252;
    --slide-border: #0a0a0a; --slide-surface: #eef1ff; --slide-code: #e5e9ff;
    --stage-atmosphere: linear-gradient(135deg,#181818,#050505);
    --slide-pattern: linear-gradient(180deg,#ffffff 0 55%,#4361ee 55% 100%);
    --slide-pattern-size: auto; --font-display: "Manrope","Noto Sans SC",sans-serif;
    --font-body: "Manrope","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="split-pastel"] {
    --stage-bg: #d8d0df; --slide-bg: #f5e6dc; --slide-accent: #3d6554;
    --slide-accent-soft: rgba(61,101,84,.13); --slide-text: #1a1a1a; --slide-muted: #655f67;
    --slide-border: #91899b; --slide-surface: rgba(255,255,255,.5); --slide-code: #ede8ef;
    --stage-atmosphere: linear-gradient(135deg,#f5e6dc,#e4dff0);
    --slide-pattern: linear-gradient(90deg,#f5e6dc 0 50%,#e4dff0 50% 100%),linear-gradient(rgba(26,26,26,.04) 1px,transparent 1px);
    --slide-pattern-size: auto,48px 48px; --font-display: "Outfit","Noto Sans SC",sans-serif;
    --font-body: "Outfit","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="vintage-editorial"] {
    --stage-bg: #d9d4ca; --slide-bg: #f5f3ee; --slide-accent: #b65d3c;
    --slide-accent-soft: rgba(182,93,60,.12); --slide-text: #1a1a1a; --slide-muted: #555555;
    --slide-border: #a49c90; --slide-surface: #e8d4c0; --slide-code: #ece5da;
    --stage-atmosphere: linear-gradient(135deg,#e8d4c0,#b9afa2);
    --slide-pattern: radial-gradient(circle at 88% 18%,transparent 0 78px,#1a1a1a 80px 82px,transparent 84px),#f5f3ee;
    --slide-pattern-size: auto; --font-display: "Fraunces","Noto Serif SC",serif;
    --font-body: "Work Sans","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="neon-cyber"] {
    --stage-bg: #030712; --slide-bg: #0a0f1c; --slide-accent: #00ffcc;
    --slide-accent-soft: rgba(0,255,204,.14); --slide-text: #effffc; --slide-muted: #8bbab2;
    --slide-border: #00a98b; --slide-surface: #101a2c; --slide-code: #050916;
    --stage-atmosphere: radial-gradient(circle at 82% 16%,rgba(255,0,170,.25),transparent 34%);
    --slide-pattern: linear-gradient(rgba(0,255,204,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,204,.06) 1px,transparent 1px),radial-gradient(circle at 80% 20%,rgba(255,0,170,.18),transparent 30%),#0a0f1c;
    --slide-pattern-size: 54px 54px,54px 54px,auto,auto; --font-display: "Tektur","Noto Sans SC",sans-serif;
    --font-body: "Space Grotesk","Noto Sans SC",sans-serif; color-scheme: dark;
  }

  body[data-slide-style="terminal-green"] {
    --stage-bg: #010409; --slide-bg: #0d1117; --slide-accent: #39d353;
    --slide-accent-soft: rgba(57,211,83,.12); --slide-text: #d5f7dc; --slide-muted: #7ca986;
    --slide-border: #24492d; --slide-surface: #111b15; --slide-code: #050a06;
    --stage-atmosphere: radial-gradient(circle at 50% 50%,rgba(57,211,83,.09),transparent 48%);
    --slide-pattern: repeating-linear-gradient(0deg,rgba(57,211,83,.035) 0 2px,transparent 2px 6px),#0d1117;
    --slide-pattern-size: auto; --font-display: "JetBrains Mono","Noto Sans SC",monospace;
    --font-body: "JetBrains Mono","Noto Sans SC",monospace; --font-code: "JetBrains Mono","Noto Sans SC",monospace; color-scheme: dark;
  }

  body[data-slide-style="paper-ink"] {
    --stage-bg: #282522; --slide-bg: #faf9f7; --slide-accent: #c41e3a;
    --slide-accent-soft: rgba(196,30,58,.1); --slide-text: #1a1a1a; --slide-muted: #68605a;
    --slide-border: #c9c0b5; --slide-surface: #f0ebe4; --slide-code: #ebe5dd;
    --stage-atmosphere: linear-gradient(135deg,#3a3530,#1c1a18);
    --slide-pattern: radial-gradient(rgba(26,26,26,.045) .7px,transparent .8px),#faf9f7;
    --slide-pattern-size: 7px 7px,auto; --font-display: "Cormorant Garamond","Noto Serif SC",serif;
    --font-body: "Source Serif 4","Noto Serif SC",serif;
  }

  body[data-slide-style="8-bit-orbit"] {
    --stage-bg:#05071a; --slide-bg:#0a0e27; --slide-accent:#5edcf4; --slide-accent-soft:rgba(240,166,202,.16);
    --slide-text:#ffffff; --slide-muted:#e2d5f2; --slide-border:#5edcf4; --slide-surface:#0f1b3d; --slide-code:#05071a;
    --stage-atmosphere:radial-gradient(circle at 80% 20%,rgba(240,166,202,.2),transparent 32%);
    --slide-pattern:linear-gradient(rgba(94,220,244,.08) 2px,transparent 2px),linear-gradient(90deg,rgba(94,220,244,.08) 2px,transparent 2px),#0a0e27;
    --slide-pattern-size:40px 40px,40px 40px,auto; --font-display:"Tektur","Noto Sans SC",sans-serif; --font-body:"Chakra Petch","Noto Sans SC",sans-serif; --font-code:"Space Mono",monospace; color-scheme:dark;
  }

  body[data-slide-style="biennale-yellow"] {
    --stage-bg:#dcd6c4; --slide-bg:#e9e5db; --slide-accent:#1b2566; --slide-accent-soft:rgba(241,238,46,.36);
    --slide-text:#1b2566; --slide-muted:#1b2566; --slide-border:#1b2566; --slide-surface:#f1ee2e; --slide-code:#f8f39b;
    --stage-atmosphere:radial-gradient(circle at 78% 18%,#f1ee2e,transparent 35%);
    --slide-pattern:radial-gradient(circle at 82% 22%,rgba(241,238,46,.75),transparent 28%),#e9e5db; --slide-pattern-size:auto;
    --font-display:"Instrument Serif","Noto Serif SC",serif; --font-body:"Archivo","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="block-frame"] {
    --stage-bg:#000; --slide-bg:#fffdf5; --slide-accent:#fe90e8; --slide-accent-soft:rgba(192,247,254,.55);
    --slide-text:#000; --slide-muted:#333; --slide-border:#000; --slide-surface:#c0f7fe; --slide-code:#ffdc8b;
    --stage-atmosphere:linear-gradient(135deg,#fe90e8,#99e885); --slide-pattern:linear-gradient(135deg,transparent 0 72%,rgba(247,203,70,.6) 72%),#fffdf5; --slide-pattern-size:auto;
    --font-display:"Archivo Black","Noto Sans SC",sans-serif; --font-body:"Space Grotesk","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="blue-professional"] {
    --stage-bg:#1623c9; --slide-bg:#fdfae7; --slide-accent:#1e2bfa; --slide-accent-soft:rgba(30,43,250,.08);
    --slide-text:#111; --slide-muted:#6b6b6b; --slide-border:rgba(30,43,250,.22); --slide-surface:#f2f2ff; --slide-code:#e7e8ff;
    --stage-atmosphere:linear-gradient(135deg,#2635ff,#0d168f); --slide-pattern:radial-gradient(circle at 90% 12%,rgba(30,43,250,.15),transparent 27%),#fdfae7; --slide-pattern-size:auto;
    --font-display:"Space Grotesk","Noto Sans SC",sans-serif; --font-body:"Manrope","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="bold-poster"] {
    --stage-bg:#1c1410; --slide-bg:#fff; --slide-accent:#d8000f; --slide-accent-soft:rgba(216,0,15,.1);
    --slide-text:#1c1410; --slide-muted:#625750; --slide-border:#1c1410; --slide-surface:#f5f2ef; --slide-code:#f1ece8;
    --stage-atmosphere:linear-gradient(135deg,#d8000f,#1c1410); --slide-pattern:linear-gradient(90deg,#d8000f 0 20px,transparent 20px),#fff; --slide-pattern-size:auto;
    --font-display:"Shrikhand","Noto Serif SC",serif; --font-body:"Libre Baskerville","Noto Serif SC",serif; --font-code:"Space Grotesk",sans-serif;
  }

  body[data-slide-style="capsule"] {
    --stage-bg:#d8cfef; --slide-bg:#f5f5f0; --slide-accent:#e85d4e; --slide-accent-soft:rgba(197,181,224,.24);
    --slide-text:#1a1a1a; --slide-muted:#595959; --slide-border:#1e1e1e; --slide-surface:#fff; --slide-code:#edf3de;
    --stage-atmosphere:radial-gradient(circle at 20% 20%,#8bb4f7,transparent 28%),radial-gradient(circle at 80% 75%,#c4d94e,transparent 26%);
    --slide-pattern:radial-gradient(circle at 85% 15%,rgba(232,93,78,.16),transparent 25%),#f5f5f0; --slide-pattern-size:auto;
    --font-display:"Bodoni Moda","Noto Serif SC",serif; --font-body:"Space Grotesk","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="cartesian"] {
    --stage-bg:#b8b0a4; --slide-bg:#ede8e0; --slide-accent:#8a8178; --slide-accent-soft:rgba(138,129,120,.12);
    --slide-text:#1a1a1a; --slide-muted:#5a5a5a; --slide-border:#b8b0a4; --slide-surface:#e2dbd1; --slide-code:#e2dbd1;
    --stage-atmosphere:linear-gradient(135deg,#d8d0c6,#9e958b); --slide-pattern:radial-gradient(circle at 82% 20%,transparent 0 110px,rgba(138,129,120,.35) 111px 113px,transparent 114px),#ede8e0; --slide-pattern-size:auto;
    --font-display:"Playfair Display","Noto Serif SC",serif; --font-body:"Work Sans","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="cobalt-grid"] {
    --stage-bg:#1f2be0; --slide-bg:#f0ebde; --slide-accent:#1f2be0; --slide-accent-soft:rgba(31,43,224,.1);
    --slide-text:#1f2be0; --slide-muted:#5560e5; --slide-border:#1f2be0; --slide-surface:#e6e0ce; --slide-code:#e1dccd;
    --stage-atmosphere:linear-gradient(135deg,#4450ef,#111a9e); --slide-pattern:linear-gradient(rgba(31,43,224,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(31,43,224,.09) 1px,transparent 1px),#f0ebde; --slide-pattern-size:36px 36px,36px 36px,auto;
    --font-display:"Newsreader","Noto Serif SC",serif; --font-body:"Hanken Grotesk","Noto Sans SC",sans-serif; --font-code:"DM Mono",monospace;
  }

  body[data-slide-style="coral"] {
    --stage-bg:#1a1a1a; --slide-bg:#f5f0e8; --slide-accent:#e85d5d; --slide-accent-soft:rgba(232,93,93,.18);
    --slide-text:#1a1a1a; --slide-muted:#6b6b6b; --slide-border:#1a1a1a; --slide-surface:#e85d5d; --slide-code:#e8e0d4;
    --stage-atmosphere:linear-gradient(135deg,#e85d5d,#1a1a1a); --slide-pattern:linear-gradient(110deg,#e85d5d 0 28%,transparent 28% 78%,#1a1a1a 78%),#f5f0e8; --slide-pattern-size:auto;
    --font-display:"Bebas Neue","Noto Sans SC",sans-serif; --font-body:"Space Grotesk","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="creative-mode"] {
    --stage-bg:#1f8a4c; --slide-bg:#efe9d9; --slide-accent:#1f8a4c; --slide-accent-soft:rgba(240,108,168,.18);
    --slide-text:#0f0f0f; --slide-muted:#2a2a2a; --slide-border:#0f0f0f; --slide-surface:#f06ca8; --slide-code:#e4dcc4;
    --stage-atmosphere:linear-gradient(135deg,#1f8a4c,#136636); --slide-pattern:linear-gradient(135deg,transparent 0 78%,rgba(240,108,168,.72) 78%),#efe9d9; --slide-pattern-size:auto;
    --font-display:"Archivo Black","Noto Sans SC",sans-serif; --font-body:"Space Grotesk","Noto Sans SC",sans-serif; --font-code:"JetBrains Mono",monospace;
  }

  body[data-slide-style="daisy-days"] {
    --stage-bg:#7ecdc0; --slide-bg:#f5f0e6; --slide-accent:#57436a; --slide-accent-soft:rgba(247,200,212,.28);
    --slide-text:#29242c; --slide-muted:#655b69; --slide-border:#29242c; --slide-surface:#fde68a; --slide-code:#dff2e9;
    --stage-atmosphere:linear-gradient(135deg,#7ecdc0,#d4a5e8); --slide-pattern:radial-gradient(circle at 88% 16%,#fde68a 0 34px,#f7c8d4 35px 46px,transparent 47px),#f5f0e6; --slide-pattern-size:auto;
    --font-display:"Fredoka","Noto Sans SC",sans-serif; --font-body:"Quicksand","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="editorial-forest"] {
    --stage-bg:#243a21; --slide-bg:#2e4a2a; --slide-accent:#e89cb1; --slide-accent-soft:rgba(232,156,177,.13);
    --slide-text:#efe7d4; --slide-muted:#d3c9b5; --slide-border:#6d8065; --slide-surface:#3a5a36; --slide-code:#243a21;
    --stage-atmosphere:radial-gradient(circle at 80% 20%,rgba(232,156,177,.2),transparent 33%); --slide-pattern:linear-gradient(135deg,transparent 0 78%,rgba(232,156,177,.18) 78%),#2e4a2a; --slide-pattern-size:auto;
    --font-display:"Source Serif 4","Noto Serif SC",serif; --font-body:"Source Serif 4","Noto Serif SC",serif; --font-code:"JetBrains Mono",monospace; color-scheme:dark;
  }

  body[data-slide-style="editorial-tri-tone"] {
    --stage-bg:#7a1f35; --slide-bg:#f2b6c6; --slide-accent:#7a1f35; --slide-accent-soft:rgba(242,216,106,.35);
    --slide-text:#7a1f35; --slide-muted:#7a1f35; --slide-border:#7a1f35; --slide-surface:#f2d86a; --slide-code:#edc5a0;
    --stage-atmosphere:linear-gradient(135deg,#f2b6c6,#f2d86a); --slide-pattern:linear-gradient(115deg,transparent 0 72%,#f2d86a 72%),#f2b6c6; --slide-pattern-size:auto;
    --font-display:"Bricolage Grotesque","Noto Sans SC",sans-serif; --font-body:"Bricolage Grotesque","Noto Sans SC",sans-serif; --font-code:"JetBrains Mono",monospace;
  }

  body[data-slide-style="emerald-editorial"] {
    --stage-bg:#0f1a5c; --slide-bg:#3cd896; --slide-accent:#0f1a5c; --slide-accent-soft:rgba(241,233,214,.24);
    --slide-text:#0f1a5c; --slide-muted:#1b2774; --slide-border:#0f1a5c; --slide-surface:#f1e9d6; --slide-code:#2dc684;
    --stage-atmosphere:linear-gradient(135deg,#3cd896,#25b377); --slide-pattern:linear-gradient(90deg,transparent 0 95%,rgba(15,26,92,.13) 95%),#3cd896; --slide-pattern-size:auto;
    --font-display:"Bodoni Moda","Noto Serif SC",serif; --font-body:"Manrope","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="grove"] {
    --stage-bg:#101d12; --slide-bg:#192b1b; --slide-accent:#c8524a; --slide-accent-soft:rgba(200,82,74,.13);
    --slide-text:#d4cfbf; --slide-muted:#aaa596; --slide-border:#445447; --slide-surface:#1e3221; --slide-code:#101d12;
    --stage-atmosphere:radial-gradient(circle at 82% 18%,rgba(200,82,74,.18),transparent 32%); --slide-pattern:radial-gradient(circle at 88% 18%,rgba(200,82,74,.14),transparent 25%),#192b1b; --slide-pattern-size:auto;
    --font-display:"Playfair Display","Noto Serif SC",serif; --font-body:"Jost","Noto Sans SC",sans-serif; --font-code:"JetBrains Mono",monospace; color-scheme:dark;
  }

  body[data-slide-style="long-table"] {
    --stage-bg:#8e2d1f; --slide-bg:#faf1e2; --slide-accent:#b53d2a; --slide-accent-soft:rgba(181,61,42,.1);
    --slide-text:#8e2d1f; --slide-muted:#a45345; --slide-border:#b53d2a; --slide-surface:#f2e5cf; --slide-code:#e8d7b6;
    --stage-atmosphere:linear-gradient(135deg,#b53d2a,#692116); --slide-pattern:radial-gradient(rgba(181,61,42,.11) 1px,transparent 1px),#faf1e2; --slide-pattern-size:8px 8px,auto;
    --font-display:"Bricolage Grotesque","Noto Sans SC",sans-serif; --font-body:"Fraunces","Noto Serif SC",serif;
  }

  body[data-slide-style="mat"] {
    --stage-bg:#172019; --slide-bg:#232e26; --slide-accent:#c07030; --slide-accent-soft:rgba(192,112,48,.12);
    --slide-text:#f0e8d2; --slide-muted:#b9b09a; --slide-border:#526054; --slide-surface:#ede6d0; --slide-code:#19221b;
    --stage-atmosphere:radial-gradient(circle at 82% 82%,rgba(122,78,36,.42),transparent 38%); --slide-pattern:radial-gradient(circle at 90% 100%,rgba(122,78,36,.28),transparent 34%),#232e26; --slide-pattern-size:auto;
    --font-display:"Bricolage Grotesque","Noto Sans SC",sans-serif; --font-body:"DM Sans","Noto Sans SC",sans-serif; --font-code:"DM Mono",monospace; color-scheme:dark;
  }

  body[data-slide-style="monochrome"] {
    --stage-bg:#1a1a16; --slide-bg:#fafadf; --slide-accent:#1a1a16; --slide-accent-soft:rgba(26,26,22,.07);
    --slide-text:#1a1a16; --slide-muted:#5e5e54; --slide-border:#1a1a16; --slide-surface:#f2f2d2; --slide-code:#f0f0d4;
    --stage-atmosphere:linear-gradient(135deg,#4b4b43,#141412); --slide-pattern:linear-gradient(rgba(26,26,22,.035) 1px,transparent 1px),#fafadf; --slide-pattern-size:46px 46px,auto;
    --font-display:"Jost","Noto Sans SC",sans-serif; --font-body:"Jost","Noto Sans SC",sans-serif; --font-code:"JetBrains Mono",monospace;
  }

  body[data-slide-style="neo-grid-bold"] {
    --stage-bg:#1a1a1a; --slide-bg:#f5f4ef; --slide-accent:#e6ff3d; --slide-accent-soft:rgba(230,255,61,.35);
    --slide-text:#0a0a0a; --slide-muted:#595954; --slide-border:#0a0a0a; --slide-surface:#e6ff3d; --slide-code:#ecece8;
    --stage-atmosphere:linear-gradient(135deg,#30302e,#111); --slide-pattern:linear-gradient(rgba(10,10,10,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(10,10,10,.045) 1px,transparent 1px),linear-gradient(135deg,transparent 0 82%,#e6ff3d 82%),#f5f4ef; --slide-pattern-size:64px 64px,64px 64px,auto,auto;
    --font-display:"Space Grotesk","Noto Sans SC",sans-serif; --font-body:"Space Grotesk","Noto Sans SC",sans-serif; --font-code:"JetBrains Mono",monospace;
  }

  body[data-slide-style="peoples-platform"] {
    --stage-bg:#1b1bb0; --slide-bg:#f5f2ea; --slide-accent:#2c2cdc; --slide-accent-soft:rgba(242,160,58,.24);
    --slide-text:#1b1bb0; --slide-muted:#44449e; --slide-border:#1b1bb0; --slide-surface:#f2a03a; --slide-code:#f4e9d6;
    --stage-atmosphere:linear-gradient(135deg,#2c2cdc,#e83a2a); --slide-pattern:linear-gradient(115deg,transparent 0 75%,rgba(242,160,58,.78) 75%),radial-gradient(rgba(27,27,176,.06) 1px,transparent 1px),#f5f2ea; --slide-pattern-size:auto,6px 6px,auto;
    --font-display:"Alfa Slab One","Noto Serif SC",serif; --font-body:"Archivo Narrow","Noto Sans SC",sans-serif; --font-code:"DM Mono",monospace;
  }

  body[data-slide-style="pin-and-paper"] {
    --stage-bg:#1f3a8a; --slide-bg:#efe56a; --slide-accent:#1f3a8a; --slide-accent-soft:rgba(31,58,138,.1);
    --slide-text:#1f3a8a; --slide-muted:#2d4fb8; --slide-border:#1f3a8a; --slide-surface:#f8f1d6; --slide-code:#f5eca0;
    --stage-atmosphere:linear-gradient(135deg,#2d4fb8,#13245a); --slide-pattern:radial-gradient(rgba(31,58,138,.08) .8px,transparent .9px),linear-gradient(135deg,rgba(255,255,255,.2),transparent 42%),#efe56a; --slide-pattern-size:6px 6px,auto,auto;
    --font-display:"Space Grotesk","Noto Sans SC",sans-serif; --font-body:"Caveat","Noto Sans SC",cursive; --font-code:"DM Mono",monospace;
  }

  body[data-slide-style="pink-script"] {
    --stage-bg:#020203; --slide-bg:#060507; --slide-accent:#ed3d8c; --slide-accent-soft:rgba(237,61,140,.17);
    --slide-text:#f5edf1; --slide-muted:#c9b9c1; --slide-border:#5d2642; --slide-surface:#0f0d11; --slide-code:#0f0d11;
    --stage-atmosphere:radial-gradient(ellipse at 18% 10%,rgba(237,61,140,.22),transparent 42%); --slide-pattern:radial-gradient(ellipse at 15% 8%,rgba(237,61,140,.14),transparent 38%),#060507; --slide-pattern-size:auto;
    --font-display:"DM Serif Display","Noto Serif SC",serif; --font-body:"DM Sans","Noto Sans SC",sans-serif; --font-code:"JetBrains Mono",monospace; color-scheme:dark;
  }

  body[data-slide-style="playful"] {
    --stage-bg:#d79b70; --slide-bg:#f0c8a0; --slide-accent:#1a1a1a; --slide-accent-soft:rgba(26,26,26,.08);
    --slide-text:#1a1a1a; --slide-muted:#514538; --slide-border:#1a1a1a; --slide-surface:#f7dec6; --slide-code:#e8b88e;
    --stage-atmosphere:linear-gradient(135deg,#f0c8a0,#c88f67); --slide-pattern:radial-gradient(ellipse at 86% 18%,rgba(247,222,198,.8),transparent 28%),#f0c8a0; --slide-pattern-size:auto;
    --font-display:"Syne","Noto Sans SC",sans-serif; --font-body:"Space Grotesk","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="raw-grid"] {
    --stage-bg:#0a0a0a; --slide-bg:#fff; --slide-accent:#0a0a0a; --slide-accent-soft:rgba(242,212,207,.6);
    --slide-text:#0a0a0a; --slide-muted:#333; --slide-border:#0a0a0a; --slide-surface:#f2d4cf; --slide-code:#e5edd6;
    --stage-atmosphere:linear-gradient(135deg,#f2d4cf,#e5edd6); --slide-pattern:linear-gradient(90deg,transparent 0 72%,rgba(229,237,214,.72) 72%),#fff; --slide-pattern-size:auto;
    --font-display:"Archivo Black","Noto Sans SC",sans-serif; --font-body:"Archivo","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="retro-windows"] {
    --stage-bg:#008080; --slide-bg:#c0c0c0; --slide-accent:#000080; --slide-accent-soft:rgba(0,0,128,.12);
    --slide-text:#000; --slide-muted:#333; --slide-border:#000; --slide-surface:#d4d0c8; --slide-code:#fff;
    --stage-atmosphere:linear-gradient(135deg,#008080,#005c5c); --slide-pattern:repeating-linear-gradient(0deg,rgba(0,0,0,.025) 0 1px,transparent 1px 4px),#c0c0c0; --slide-pattern-size:auto;
    --font-display:"Press Start 2P","Noto Sans SC",monospace; --font-body:"VT323","Noto Sans SC",monospace; --font-code:"VT323",monospace;
  }

  body[data-slide-style="retro-zine"] {
    --stage-bg:#008f4d; --slide-bg:#c8b99a; --slide-accent:#008f4d; --slide-accent-soft:rgba(0,143,77,.13);
    --slide-text:#1a1a1a; --slide-muted:#4f4a40; --slide-border:#1a1a1a; --slide-surface:#f4efe6; --slide-code:#b8a98a;
    --stage-atmosphere:linear-gradient(135deg,#00a85d,#005f34); --slide-pattern:radial-gradient(rgba(26,26,26,.08) .8px,transparent .9px),linear-gradient(125deg,transparent 0 78%,rgba(0,143,77,.23) 78%),#c8b99a; --slide-pattern-size:6px 6px,auto,auto;
    --font-display:"Bebas Neue","Noto Sans SC",sans-serif; --font-body:"Space Grotesk","Noto Sans SC",sans-serif; --font-code:"Caveat",cursive;
  }

  body[data-slide-style="sakura-chroma"] {
    --stage-bg:#3a2516; --slide-bg:#f1e6cb; --slide-accent:#e5392a; --slide-accent-soft:rgba(229,68,137,.16);
    --slide-text:#3a2516; --slide-muted:#715d4a; --slide-border:#3a2516; --slide-surface:#e5d6b0; --slide-code:#f5dab8;
    --stage-atmosphere:linear-gradient(135deg,#e5392a,#3f8bc4); --slide-pattern:radial-gradient(rgba(58,37,22,.12) .8px,transparent .9px),#f1e6cb; --slide-pattern-size:4px 4px,auto;
    --font-display:"Big Shoulders Display","Noto Sans JP","Noto Sans SC",sans-serif; --font-body:"Albert Sans","Noto Sans SC",sans-serif; --font-code:"JetBrains Mono",monospace;
  }

  body[data-slide-style="scatterbrain"] {
    --stage-bg:#9a6d3f; --slide-bg:#f6ecd2; --slide-accent:#d84343; --slide-accent-soft:rgba(255,224,102,.35);
    --slide-text:#2b2720; --slide-muted:#645b4d; --slide-border:#6e6250; --slide-surface:#ffe066; --slide-code:#a5d8ff;
    --stage-atmosphere:radial-gradient(circle at 20% 20%,#c79b6d,#7e5733); --slide-pattern:radial-gradient(rgba(80,62,42,.12) 1px,transparent 1px),#f6ecd2; --slide-pattern-size:18px 18px,auto;
    --font-display:"Shrikhand","Noto Serif SC",serif; --font-body:"Caveat","Noto Sans SC",cursive; --font-code:"Space Mono",monospace;
  }

  body[data-slide-style="signal"] {
    --stage-bg:#11182e; --slide-bg:#1c2644; --slide-accent:#c8a870; --slide-accent-soft:rgba(200,168,112,.12);
    --slide-text:#e2dcd0; --slide-muted:#8a96a8; --slide-border:#4e5a6e; --slide-surface:#232f55; --slide-code:#131b32;
    --stage-atmosphere:radial-gradient(circle at 80% 18%,rgba(200,168,112,.13),transparent 34%); --slide-pattern:linear-gradient(rgba(200,168,112,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(200,168,112,.04) 1px,transparent 1px),#1c2644; --slide-pattern-size:80px 80px,80px 80px,auto;
    --font-display:"Source Serif 4","Noto Serif SC",serif; --font-body:"DM Sans","Noto Sans SC",sans-serif; --font-code:"IBM Plex Mono",monospace; color-scheme:dark;
  }

  body[data-slide-style="soft-editorial"] {
    --stage-bg:#b7c7a8; --slide-bg:#f2eedf; --slide-accent:#a45c7e; --slide-accent-soft:rgba(225,164,194,.22);
    --slide-text:#2a241b; --slide-muted:#5c5345; --slide-border:#b8ae9a; --slide-surface:#e8c9b6; --slide-code:#ece6d2;
    --stage-atmosphere:linear-gradient(135deg,#e1a4c2,#b7c7a8); --slide-pattern:radial-gradient(circle at 85% 17%,rgba(214,221,99,.34),transparent 23%),#f2eedf; --slide-pattern-size:auto;
    --font-display:"Cormorant Garamond","Noto Serif SC",serif; --font-body:"Work Sans","Noto Sans SC",sans-serif;
  }

  body[data-slide-style="stencil-tablet"] {
    --stage-bg:#0a0a0a; --slide-bg:#e2dcc9; --slide-accent:#a06a3c; --slide-accent-soft:rgba(199,59,122,.16);
    --slide-text:#0a0a0a; --slide-muted:#514b41; --slide-border:#000; --slide-surface:#f4efe0; --slide-code:#d4c8b4;
    --stage-atmosphere:linear-gradient(135deg,#a06a3c,#2d7e73); --slide-pattern:linear-gradient(125deg,transparent 0 80%,rgba(199,59,122,.24) 80%),#e2dcc9; --slide-pattern-size:auto;
    --font-display:"Stardos Stencil","Noto Serif SC",serif; --font-body:"Barlow Condensed","Noto Sans SC",sans-serif; --font-code:"DM Mono",monospace;
  }

  body[data-slide-style="studio"] {
    --stage-bg:#090909; --slide-bg:#1c1c1c; --slide-accent:#f5d200; --slide-accent-soft:rgba(245,210,0,.13);
    --slide-text:#f5d200; --slide-muted:#b8a737; --slide-border:#f5d200; --slide-surface:#242422; --slide-code:#111;
    --stage-atmosphere:linear-gradient(135deg,#242422,#080808); --slide-pattern:linear-gradient(135deg,transparent 0 82%,rgba(245,210,0,.14) 82%),#1c1c1c; --slide-pattern-size:auto;
    --font-display:"Barlow","Noto Sans SC",sans-serif; --font-body:"Barlow","Noto Sans SC",sans-serif; --font-code:"IBM Plex Mono",monospace; color-scheme:dark;
  }

  body[data-slide-style="vellum"] {
    --stage-bg:#1f2858; --slide-bg:#2a3870; --slide-accent:#e8d85c; --slide-accent-soft:rgba(58,120,120,.16);
    --slide-text:#e8d85c; --slide-muted:#b8b27a; --slide-border:#6270a5; --slide-surface:#343f80; --slide-code:#1f2858;
    --stage-atmosphere:radial-gradient(circle at 82% 16%,rgba(58,120,120,.24),transparent 32%); --slide-pattern:radial-gradient(circle at 88% 18%,rgba(58,120,120,.17),transparent 25%),#2a3870; --slide-pattern-size:auto;
    --font-display:"Cormorant Garamond","Noto Serif SC",serif; --font-body:"DM Sans","Noto Sans SC",sans-serif; --font-code:"Courier Prime",monospace; color-scheme:dark;
  }

  /* === BASE RESET === */
  * { box-sizing: border-box; }

  /* === FIXED 16:9 STAGE ===
     Slides are always authored at 1920×1080. Only this stage is scaled. */
  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    overflow: hidden;
    background: var(--stage-bg);
  }

  body {
    color: var(--slide-text);
    font-family: var(--font-body);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .deck-viewport {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--stage-atmosphere), var(--stage-bg);
  }

  .deck-stage {
    position: absolute;
    top: 0;
    left: 0;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    transform-origin: 0 0;
    background: var(--slide-bg);
  }

  .slide {
    position: absolute;
    inset: 0;
    display: block;
    visibility: hidden;
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    pointer-events: none;
    opacity: 0;
    color: var(--slide-text);
    background: var(--slide-pattern);
    background-size: var(--slide-pattern-size);
    transition: opacity 240ms ease;
  }

  .slide.active,
  .slide.visible {
    z-index: 1;
    visibility: visible;
    pointer-events: auto;
    opacity: 1;
  }

  .slide::before,
  .slide::after {
    content: "";
    position: absolute;
    z-index: 0;
    pointer-events: none;
  }

  .slide-content,
  .slide footer { z-index: 1; }

  /* Broadside: orange declaration cover, flat dark content, one hard accent. */
  body[data-slide-style="broadside"] .title-slide {
    --slide-text: #111111;
    --slide-muted: rgba(17, 17, 17, 0.68);
    --slide-accent: #111111;
    --slide-border: rgba(17, 17, 17, 0.2);
    background: #e85d26;
  }

  body[data-slide-style="broadside"] .slide h1,
  body[data-slide-style="broadside"] .slide h2,
  body[data-slide-style="broadside"] .slide h3 {
    font-weight: 900;
    letter-spacing: -0.025em;
  }

  body[data-slide-style="broadside"] .title-slide h1 { font-size: 124px; line-height: 1.04; }
  body[data-slide-style="broadside"] .slide h2 { border-bottom-width: 2px; }
  body[data-slide-style="broadside"] .slide ul > li { position: relative; list-style: none; }
  body[data-slide-style="broadside"] .slide ul > li::before {
    content: "/";
    position: absolute;
    left: -0.9em;
    color: var(--slide-accent);
    font-family: var(--font-code);
    font-weight: 700;
  }

  body[data-slide-style="broadside"] .slide pre,
  body[data-slide-style="broadside"] .slide blockquote,
  body[data-slide-style="broadside"] .slide .callout { border-radius: 0; box-shadow: none; }

  /* Dark Botanical: restrained serif typography and atmospheric soft forms. */
  body[data-slide-style="botanical"] .slide::before {
    top: -180px;
    right: -120px;
    width: 620px;
    height: 620px;
    background: radial-gradient(circle, rgba(232, 180, 184, 0.24), rgba(212, 165, 116, 0.08) 48%, transparent 70%);
    border-radius: 50%;
  }

  body[data-slide-style="botanical"] .slide::after {
    bottom: -210px;
    left: -120px;
    width: 520px;
    height: 520px;
    background: radial-gradient(circle, rgba(201, 184, 150, 0.16), transparent 68%);
    border-radius: 50%;
  }

  body[data-slide-style="botanical"] .title-slide h1 { font-size: 118px; font-weight: 600; }
  body[data-slide-style="botanical"] .slide h2 { font-weight: 600; border-bottom-width: 2px; }

  /* Notebook Tabs: paper grid, binder holes, and tactile color indexing. */
  body[data-slide-style="notebook"] .slide::before {
    top: 55px;
    bottom: 80px;
    left: 34px;
    width: 24px;
    background: radial-gradient(circle, #393939 0 7px, rgba(255, 255, 255, 0.55) 8px 10px, transparent 11px) 0 0 / 24px 112px repeat-y;
  }

  body[data-slide-style="notebook"] .slide::after {
    top: 190px;
    right: 24px;
    width: 28px;
    height: 96px;
    background: #98d4bb;
    border-radius: 999px;
    box-shadow:
      0 126px 0 #c7b8ea,
      0 252px 0 #f4b8c5,
      0 378px 0 #a8d8ea,
      0 504px 0 #ffe6a7;
  }

  body[data-slide-style="notebook"] .title-slide h1 { font-size: 112px; font-weight: 700; }
  body[data-slide-style="notebook"] .slide h2 { font-weight: 700; border-bottom-width: 2px; }

  /* Creative Voltage: split electric field with a restrained halftone patch. */
  body[data-slide-style="voltage"] .slide::after {
    top: 80px;
    right: 90px;
    width: 360px;
    height: 260px;
    opacity: 0.35;
    background-image: radial-gradient(circle, #d4ff00 0 3px, transparent 4px);
    background-size: 22px 22px;
    transform: rotate(-7deg);
  }

  body[data-slide-style="voltage"] .title-slide h1 { font-size: 116px; font-weight: 800; }
  body[data-slide-style="voltage"] .slide h2 { font-weight: 800; border-bottom-width: 7px; }

  /* Pastel Geometry: friendly pill markers and a soft geometric field. */
  body[data-slide-style="pastel"] .slide::after {
    top: 210px;
    right: 30px;
    width: 28px;
    height: 86px;
    background: #f0b4d4;
    border-radius: 999px;
    box-shadow:
      0 112px 0 #a8d4c4,
      0 224px 0 #5a7c6a,
      0 336px 0 #9b8dc4,
      0 448px 0 #7c6aad;
  }

  body[data-slide-style="pastel"] .title-slide h1 { font-size: 110px; font-weight: 800; }
  body[data-slide-style="pastel"] .slide h2 { font-weight: 800; border-bottom-width: 6px; }

  /* Additional core and gallery signatures. Layout geometry stays shared. */
  body[data-slide-style="bold-signal"] .title-slide {
    margin: 72px; width: 1776px; height: 936px; background: #ff5722;
    box-shadow: 28px 28px 0 rgba(0,0,0,.42);
    --slide-text: #171717; --slide-muted: rgba(23,23,23,.7); --slide-accent: #171717; --slide-border: rgba(23,23,23,.28);
  }
  body[data-slide-style="bold-signal"] .slide h1,
  body[data-slide-style="bold-signal"] .slide h2 { font-family: "Archivo Black","Noto Sans SC",sans-serif; text-transform: uppercase; }

  body[data-slide-style="electric-studio"] .title-slide footer { color: #fff; border-color: rgba(255,255,255,.3); }
  body[data-slide-style="electric-studio"] .slide h2 { border-bottom: 12px solid #4361ee; }
  body[data-slide-style="split-pastel"] .slide h2 { display: inline-block; padding: 10px 28px; background: #c8f0d8; border: 2px solid #1a1a1a; border-radius: 999px; }
  body[data-slide-style="vintage-editorial"] .slide h1,
  body[data-slide-style="vintage-editorial"] .slide h2 { font-variation-settings: "SOFT" 80, "WONK" 1; }
  body[data-slide-style="vintage-editorial"] .slide h2::after { content: " •"; color: var(--slide-accent); }
  body[data-slide-style="neon-cyber"] .slide { box-shadow: inset 0 0 0 2px rgba(0,255,204,.45), inset 0 0 70px rgba(0,255,204,.04); }
  body[data-slide-style="neon-cyber"] .slide h1,
  body[data-slide-style="neon-cyber"] .slide h2 { text-shadow: 0 0 22px rgba(0,255,204,.48); }
  body[data-slide-style="terminal-green"] .slide-kicker::before { content: "> "; }
  body[data-slide-style="paper-ink"] .slide h2 { border-bottom: 1px solid var(--slide-text); font-style: italic; }
  body[data-slide-style="paper-ink"] .slide p:first-of-type::first-letter { font-family: var(--font-display); }

  body[data-slide-style="8-bit-orbit"] .slide { box-shadow: inset 0 0 0 4px #5edcf4, inset 12px 12px 0 rgba(240,166,202,.18); }
  body[data-slide-style="8-bit-orbit"] .slide h1,
  body[data-slide-style="8-bit-orbit"] .slide h2 { text-shadow: 6px 6px 0 #0f1b3d, 10px 10px 0 rgba(240,166,202,.5); }
  body[data-slide-style="biennale-yellow"] .slide h1,
  body[data-slide-style="biennale-yellow"] .slide h2 { font-weight: 400; }
  body[data-slide-style="biennale-yellow"] .slide-kicker { background: #f1ee2e; color: #1b2566; padding: 8px 18px; display: inline-block; }
  body[data-slide-style="block-frame"] .slide,
  body[data-slide-style="raw-grid"] .slide,
  body[data-slide-style="neo-grid-bold"] .slide { box-shadow: inset 0 0 0 5px #000; }
  body[data-slide-style="block-frame"] .slide pre,
  body[data-slide-style="block-frame"] .slide blockquote,
  body[data-slide-style="block-frame"] .slide .callout,
  body[data-slide-style="raw-grid"] .slide pre,
  body[data-slide-style="raw-grid"] .slide blockquote,
  body[data-slide-style="raw-grid"] .slide .callout,
  body[data-slide-style="creative-mode"] .slide pre,
  body[data-slide-style="creative-mode"] .slide blockquote,
  body[data-slide-style="creative-mode"] .slide .callout { border: 4px solid #000; border-radius: 0; box-shadow: 8px 8px 0 #000; }
  body[data-slide-style="blue-professional"] .slide pre,
  body[data-slide-style="blue-professional"] .slide blockquote,
  body[data-slide-style="blue-professional"] .slide .callout { border-radius: 20px; }
  body[data-slide-style="blue-professional"] .slide-kicker { padding: 8px 18px; color: #fff; background: #1e2bfa; border-radius: 999px; display: inline-block; }
  body[data-slide-style="bold-poster"] .title-slide h1 { transform: rotate(-2deg); transform-origin: left center; }
  body[data-slide-style="bold-poster"] .slide h2 { border-left: 12px solid #d8000f; padding-left: 26px; }
  body[data-slide-style="capsule"] .slide { border-radius: 42px; }
  body[data-slide-style="capsule"] .slide pre,
  body[data-slide-style="capsule"] .slide blockquote,
  body[data-slide-style="capsule"] .slide .callout { border: 2px solid #1e1e1e; border-radius: 32px; box-shadow: 8px 8px 0 rgba(30,30,30,.16); }
  body[data-slide-style="cartesian"] .slide h1,
  body[data-slide-style="cartesian"] .slide h2 { font-weight: 400; }
  body[data-slide-style="cobalt-grid"] .slide { box-shadow: inset 0 4px 0 #1f2be0, inset 0 -4px 0 #1f2be0; }
  body[data-slide-style="cobalt-grid"] .slide h1,
  body[data-slide-style="cobalt-grid"] .slide h2 { font-style: italic; font-weight: 400; }
  body[data-slide-style="coral"] .slide:not(.title-slide) { background: #f5f0e8; }
  body[data-slide-style="coral"] .slide h1,
  body[data-slide-style="coral"] .slide h2 { letter-spacing: .01em; text-transform: uppercase; }
  body[data-slide-style="creative-mode"] .slide { box-shadow: inset 0 0 0 4px #0f0f0f; }
  body[data-slide-style="creative-mode"] .slide h1,
  body[data-slide-style="creative-mode"] .slide h2 { text-transform: uppercase; line-height: .95; }
  body[data-slide-style="daisy-days"] .slide::after {
    top: 72px; right: 70px; width: 180px; height: 180px; border-radius: 50%;
    background: radial-gradient(circle,#f7c8d4 0 22px,transparent 23px),radial-gradient(ellipse at 50% 0,#fff 0 28px,transparent 30px),radial-gradient(ellipse at 100% 50%,#fff 0 28px,transparent 30px),radial-gradient(ellipse at 50% 100%,#fff 0 28px,transparent 30px),radial-gradient(ellipse at 0 50%,#fff 0 28px,transparent 30px);
  }
  body[data-slide-style="daisy-days"] .slide pre,
  body[data-slide-style="daisy-days"] .slide blockquote,
  body[data-slide-style="daisy-days"] .slide .callout { border: 3px solid #29242c; border-radius: 28px; box-shadow: 7px 7px 0 #29242c; }
  body[data-slide-style="editorial-forest"] .slide h1,
  body[data-slide-style="editorial-forest"] .slide h2 { font-weight: 500; }
  body[data-slide-style="editorial-tri-tone"] .slide h2 { background: #f2d86a; padding: 14px 22px; border: 0; border-radius: 999px; }
  body[data-slide-style="emerald-editorial"] .slide h2 { border-top: 4px solid #0f1a5c; border-bottom: 4px double #0f1a5c; }
  body[data-slide-style="emerald-editorial"] .slide { border-radius: 0; }
  body[data-slide-style="grove"] .slide h1,
  body[data-slide-style="grove"] .slide h2 { font-weight: 400; }
  body[data-slide-style="grove"] .slide h1 em,
  body[data-slide-style="grove"] .slide h2 em { color: #c8524a; }
  body[data-slide-style="long-table"] .slide h1,
  body[data-slide-style="long-table"] .slide h2 { text-transform: uppercase; }
  body[data-slide-style="long-table"] .slide p { font-style: italic; }
  body[data-slide-style="mat"] .slide blockquote { background: #ede6d0; color: #1e2820; border-left-color: #c07030; }
  body[data-slide-style="monochrome"] .slide h1,
  body[data-slide-style="monochrome"] .slide h2 { font-weight: 200; letter-spacing: -.03em; }
  body[data-slide-style="neo-grid-bold"] .slide h1,
  body[data-slide-style="neo-grid-bold"] .slide h2 { text-transform: uppercase; font-weight: 700; }
  body[data-slide-style="neo-grid-bold"] .slide-kicker { display: inline-block; padding: 8px 14px; color: #0a0a0a; background: #e6ff3d; border: 2px solid #0a0a0a; }
  body[data-slide-style="peoples-platform"] .slide h1,
  body[data-slide-style="peoples-platform"] .slide h2 { text-transform: uppercase; text-shadow: 5px 5px 0 #e83a2a,10px 10px 0 #b7281c; }
  body[data-slide-style="peoples-platform"] .slide { box-shadow: inset 0 0 0 6px #1b1bb0; }
  body[data-slide-style="pin-and-paper"] .slide::after {
    top: 58px; right: 78px; width: 42px; height: 160px; border: 7px solid #1f3a8a; border-radius: 999px; transform: rotate(18deg);
  }
  body[data-slide-style="pin-and-paper"] .slide pre,
  body[data-slide-style="pin-and-paper"] .slide blockquote,
  body[data-slide-style="pin-and-paper"] .slide .callout { border: 2px solid #1f3a8a; border-radius: 4px; box-shadow: 6px 6px 0 #1f3a8a; background: #f8f1d6; }
  body[data-slide-style="pink-script"] .slide { box-shadow: inset 0 0 0 1px rgba(245,237,241,.62), inset 0 0 80px rgba(237,61,140,.04); }
  body[data-slide-style="pink-script"] .slide h1 em,
  body[data-slide-style="pink-script"] .slide h2 em { color: #ed3d8c; }
  body[data-slide-style="playful"] .slide h1 { transform: rotate(-1deg); transform-origin: left center; }
  body[data-slide-style="playful"] .slide pre,
  body[data-slide-style="playful"] .slide blockquote,
  body[data-slide-style="playful"] .slide .callout { border: 3px solid #1a1a1a; box-shadow: 8px 8px 0 rgba(26,26,26,.35); border-radius: 28px 48px 32px 52px; }
  body[data-slide-style="raw-grid"] .slide h1,
  body[data-slide-style="raw-grid"] .slide h2 { text-transform: uppercase; font-weight: 900; }
  body[data-slide-style="retro-windows"] .slide { border: 5px ridge #fff; box-shadow: 7px 7px 0 #000; }
  body[data-slide-style="retro-windows"] .slide::before { top: 10px; left: 10px; right: 10px; height: 54px; background: linear-gradient(90deg,#000080,#0000a0); }
  body[data-slide-style="retro-windows"] .slide h1,
  body[data-slide-style="retro-windows"] .slide h2 { letter-spacing: 0; }
  body[data-slide-style="retro-zine"] .slide { box-shadow: inset 0 0 0 3px #1a1a1a; }
  body[data-slide-style="retro-zine"] .slide h1,
  body[data-slide-style="retro-zine"] .slide h2 { text-transform: uppercase; }
  body[data-slide-style="sakura-chroma"] .slide::after {
    top: 92px; right: -130px; width: 560px; height: 150px; transform: rotate(-22deg);
    background: linear-gradient(180deg,#e5392a 0 20%,#e54489 20% 40%,#f09131 40% 60%,#3d9f47 60% 80%,#3f8bc4 80%);
  }
  body[data-slide-style="sakura-chroma"] .slide h1,
  body[data-slide-style="sakura-chroma"] .slide h2 { text-transform: uppercase; font-weight: 900; }
  body[data-slide-style="scatterbrain"] .slide::after {
    top: 90px; right: 80px; width: 230px; height: 190px; background: #ffe066; box-shadow: -210px 130px 0 #a5d8ff,15px 15px 30px rgba(50,35,20,.22); transform: rotate(4deg);
  }
  body[data-slide-style="scatterbrain"] .slide h1,
  body[data-slide-style="scatterbrain"] .slide h2 { transform: rotate(-1deg); transform-origin: left center; }
  body[data-slide-style="signal"] .slide { box-shadow: inset 0 0 0 1px rgba(200,168,112,.3); }
  body[data-slide-style="signal"] .slide h1,
  body[data-slide-style="signal"] .slide h2 { font-weight: 400; }
  body[data-slide-style="soft-editorial"] .slide pre,
  body[data-slide-style="soft-editorial"] .slide blockquote,
  body[data-slide-style="soft-editorial"] .slide .callout { border-radius: 32px; }
  body[data-slide-style="soft-editorial"] .slide h1,
  body[data-slide-style="soft-editorial"] .slide h2 { font-weight: 500; }
  body[data-slide-style="stencil-tablet"] .slide h1,
  body[data-slide-style="stencil-tablet"] .slide h2 { text-transform: uppercase; }
  body[data-slide-style="studio"] .slide h1,
  body[data-slide-style="studio"] .slide h2 { text-transform: uppercase; font-weight: 900; letter-spacing: -.025em; }
  body[data-slide-style="studio"] .slide pre,
  body[data-slide-style="studio"] .slide blockquote,
  body[data-slide-style="studio"] .slide .callout { border-radius: 0; box-shadow: none; }
  body[data-slide-style="vellum"] .slide h1,
  body[data-slide-style="vellum"] .slide h2 { font-style: italic; font-weight: 400; }

  .slide img,
  .slide video,
  .slide canvas,
  .slide svg {
    max-width: 100%;
    max-height: 100%;
  }

  /* === SLIDE CONTENT FRAME === */
  .slide-content {
    position: absolute;
    inset: 0 0 68px;
    overflow: hidden;
    padding: 104px 138px 46px;
  }

  .slide-inner {
    width: 100%;
    transform-origin: top center;
    font-size: 32px;
    line-height: 1.42;
  }

  /* === TYPOGRAPHY === */
  .slide h1, .slide h2, .slide h3, .slide h4, .slide h5, .slide h6 {
    color: var(--slide-text);
    font-family: var(--font-display);
    font-weight: 720;
    line-height: 1.08;
    letter-spacing: -0.035em;
  }

  .slide h1, .slide h2 {
    margin: 0 0 28px;
    font-size: 68px;
  }

  .slide h2 {
    position: relative;
    padding-bottom: 20px;
    border-bottom: 5px solid var(--slide-accent);
  }

  .slide h3 { margin: 30px 0 14px; font-size: 44px; }
  .slide h4, .slide h5, .slide h6 { margin: 26px 0 12px; font-size: 36px; }
  .slide .continued-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5em; }
  .slide .continued-marker { color: var(--slide-muted); font-size: 18px; font-weight: 680; letter-spacing: 0.12em; text-transform: uppercase; }
  .slide p, .slide li, .slide td, .slide th { color: var(--slide-text); }
  .slide p { margin: 13px 0; }
  .slide ul, .slide ol { margin: 13px 0 13px 1.25em; padding: 0; }
  .slide li { margin: 7px 0; }
  .slide li > p { margin: 5px 0; }
  .slide a { color: var(--slide-accent); text-decoration-thickness: 1px; text-underline-offset: 0.12em; }
  .slide a[role="anchor"], .slide .external-icon { display: none; }

  /* === STRUCTURED CONTENT === */
  .slide blockquote {
    margin: 22px 0;
    padding: 18px 28px;
    color: var(--slide-muted);
    background: var(--slide-surface);
    border-left: 6px solid var(--slide-accent);
  }

  .slide code {
    padding: 3px 9px;
    font-family: var(--font-code);
    font-size: 0.74em;
    background: var(--slide-code);
    border-radius: 6px;
  }

  .slide pre {
    margin: 18px 0;
    padding: 18px 24px;
    overflow: hidden;
    font-size: 0.8em;
    line-height: 1.36;
    background: var(--slide-code);
    border: 1px solid var(--slide-border);
    border-radius: 10px;
  }

  .slide pre > code { padding: 0; font-size: inherit; background: transparent; }
  .slide img { display: block; max-width: 100%; max-height: 650px; margin: 18px auto; object-fit: contain; }
  .slide video, .slide iframe { max-width: 100%; max-height: 650px; }

  .slide table {
    width: 100%;
    margin: 18px 0;
    border-collapse: collapse;
    font-size: 0.7em;
  }

  .slide th, .slide td { padding: 10px 15px; border: 1px solid var(--slide-border); text-align: left; }
  .slide th { background: var(--slide-surface); }

  .slide .callout {
    margin: 18px 0;
    padding: 16px 22px;
    background: var(--slide-surface);
    border: 1px solid var(--slide-border);
    border-left: 6px solid var(--slide-accent);
    border-radius: 10px;
  }

  .slide .callout-title { font-weight: 700; }
  .slide .callout-content p { margin: 8px 0; }
  .slide .footnotes { font-size: 0.64em; }

  /* === MERMAID === */
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
    line-height: normal;
  }

  .slide pre.slide-mermaid code.mermaid::after { display: none; }
  .slide pre.slide-mermaid foreignObject div,
  .slide pre.slide-mermaid foreignObject span,
  .slide pre.slide-mermaid foreignObject p {
    line-height: 1.2 !important;
  }

  .slide pre.slide-mermaid foreignObject p { margin: 0 !important; }

  .slide pre.slide-mermaid svg {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: 650px !important;
    margin: auto;
    overflow: hidden;
  }

  body[data-slide-style="midnight"] .slide pre.slide-mermaid,
  body[data-slide-style="bold-signal"] .slide pre.slide-mermaid,
  body[data-slide-style="broadside"] .slide pre.slide-mermaid,
  body[data-slide-style="botanical"] .slide pre.slide-mermaid,
  body[data-slide-style="voltage"] .slide pre.slide-mermaid,
  body[data-slide-style="neon-cyber"] .slide pre.slide-mermaid,
  body[data-slide-style="terminal-green"] .slide pre.slide-mermaid,
  body[data-slide-style="8-bit-orbit"] .slide pre.slide-mermaid,
  body[data-slide-style="editorial-forest"] .slide pre.slide-mermaid,
  body[data-slide-style="grove"] .slide pre.slide-mermaid,
  body[data-slide-style="mat"] .slide pre.slide-mermaid,
  body[data-slide-style="pink-script"] .slide pre.slide-mermaid,
  body[data-slide-style="signal"] .slide pre.slide-mermaid,
  body[data-slide-style="studio"] .slide pre.slide-mermaid,
  body[data-slide-style="vellum"] .slide pre.slide-mermaid {
    padding: 18px;
    background: #f8fafc;
    border: 1px solid #b8c2ce;
    border-radius: 12px;
  }

  /* === FOOTER === */
  .slide footer {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    gap: 24px;
    height: 68px;
    padding: 19px 64px 18px;
    color: var(--slide-muted);
    font-size: 20px;
    border-top: 1px solid var(--slide-border);
  }

  .slide footer span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* === TITLE SLIDE === */
  .title-slide .slide-content {
    display: flex;
    align-items: center;
    padding: 150px 180px 110px;
  }

  .title-slide .slide-inner { transform-origin: center; }
  .title-slide h1 { max-width: 1450px; margin: 20px 0 32px; font-size: 104px; line-height: 1.02; }

  .slide-kicker {
    margin: 0;
    color: var(--slide-accent);
    font-family: var(--font-display);
    font-size: 23px;
    font-weight: 760;
    letter-spacing: 0.19em;
    text-transform: uppercase;
  }

  .slide-meta { color: var(--slide-muted); font-size: 31px; }
  .slide-source { margin-top: 48px !important; color: var(--slide-muted); font-size: 20px; overflow-wrap: anywhere; }

  /* === REVEAL MOTION === */
  .reveal {
    opacity: 0;
    transform: translateY(24px);
    transition:
      opacity 520ms var(--ease-out-expo),
      transform 520ms var(--ease-out-expo);
  }

  .slide.visible .reveal { opacity: 1; transform: translateY(0); }
  .slide.visible .reveal:nth-child(1) { transition-delay: 70ms; }
  .slide.visible .reveal:nth-child(2) { transition-delay: 130ms; }
  .slide.visible .reveal:nth-child(3) { transition-delay: 190ms; }
  .slide.visible .reveal:nth-child(4) { transition-delay: 250ms; }

  /* === CONTROLS OUTSIDE THE STAGE === */
  .deck-controls {
    position: fixed;
    left: 50%;
    bottom: 14px;
    z-index: 1000;
    transform: translateX(-50%);
  }

  .slide-toolbar {
    display: flex;
    align-items: center;
    gap: 9px;
    width: max-content;
    max-width: calc(100vw - 20px);
    min-height: 58px;
    padding: 9px 12px;
    color: #e5e7eb;
    background: rgba(11, 18, 32, 0.92);
    border: 1px solid #334155;
    border-radius: 14px;
    box-shadow: 0 16px 46px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(14px);
  }

  .slide-toolbar button {
    padding: 9px 13px;
    color: #f8fafc;
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 8px;
    cursor: pointer;
    font: 650 14px/1.1 var(--font-body);
  }

  .slide-toolbar button:hover { background: #334155; }
  .slide-toolbar button:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
  .slide-toolbar button:disabled { cursor: default; opacity: 0.42; }
  .slide-counter { min-width: 66px; text-align: center; font-variant-numeric: tabular-nums; }
  .toolbar-spacer { width: 18px; }

  .slide-style-control {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #cbd5e1;
    font: 650 13px/1 var(--font-body);
  }

  .slide-style-control select {
    min-width: 116px;
    padding: 8px 28px 8px 10px;
    color: #f8fafc;
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 8px;
    cursor: pointer;
    font: 600 13px/1.1 var(--font-body);
  }

  .slide-style-control select:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }

  :fullscreen .slide-toolbar { display: none; }

  /* Small screens only adapt controls; slide content never reflows. */
  @media (max-width: 680px) {
    .slide-toolbar { bottom: 8px; justify-content: center; min-height: 50px; padding: 7px; flex-wrap: wrap; }
    .slide-toolbar button { padding: 7px 8px; font-size: 11px; }
    .slide-counter { min-width: 48px; font-size: 12px; }
    .slide-style-control span { display: none; }
    .slide-style-control select { width: 150px; min-width: 0; padding: 7px 22px 7px 8px; font-size: 11px; }
    .toolbar-spacer { display: none; }
  }

  /* === PRINT: ONE FIXED-STAGE SLIDE PER 16:9 PAGE === */
  @page { size: 13.333in 7.5in; margin: 0; }

  @media print {
    html,
    body {
      width: 1920px;
      height: auto;
      overflow: visible;
      background: #fff;
    }

    .deck-viewport {
      position: static;
      overflow: visible;
      background: #fff;
    }

    .deck-stage {
      position: static;
      width: auto;
      height: auto;
      overflow: visible;
      transform: none !important;
      background: none;
    }

    .slide {
      position: relative;
      display: block !important;
      visibility: visible !important;
      width: 1920px;
      height: 1080px;
      margin: 0;
      zoom: 0.66665;
      pointer-events: auto !important;
      opacity: 1 !important;
      break-after: page;
      page-break-after: always;
    }

    .slide:last-child { break-after: auto; page-break-after: auto; }
    .slide .reveal { opacity: 1 !important; transform: none !important; }
    .deck-controls { display: none !important; }
  }

  /* === REDUCED MOTION === */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.2s !important;
    }
  }
`
