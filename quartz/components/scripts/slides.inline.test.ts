import test, { describe } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"

const slidesScript = fs.readFileSync(path.join(import.meta.dirname, "slides.inline.ts"), "utf8")

describe("slides inline script", () => {
  test("builds, presents, and prints a slide deck", () => {
    assert.match(slidesScript, /splitIntoSlides/)
    assert.match(slidesScript, /element\.tagName === "HR"/)
    assert.match(slidesScript, /\^H\[12\]\$/)
    assert.match(slidesScript, /paginateSlideSections/)
    assert.match(slidesScript, /slideContentFits/)
    assert.match(slidesScript, /slideContentBox/)
    assert.match(slidesScript, /paddingTop/)
    assert.match(slidesScript, /continued-marker/)
    assert.match(slidesScript, /sourceBlock\.matches\("ul, ol"\)/)
    assert.match(slidesScript, /querySelector<HTMLTableElement>\(":scope > table"\)/)
    assert.match(slidesScript, /querySelector<HTMLElement>\(":scope > pre"\)/)
    assert.match(slidesScript, /wrapSplitBlock/)
    assert.match(slidesScript, /setupSlideDeck/)
    assert.match(slidesScript, /deck-viewport/)
    assert.match(slidesScript, /deck-stage/)
    assert.match(slidesScript, /width: 1920px/)
    assert.match(slidesScript, /height: 1080px/)
    assert.match(slidesScript, /Math\.min\(availableWidth \/ 1920, availableHeight \/ 1080\)/)
    assert.match(slidesScript, /classList\.toggle\("active", active\)/)
    assert.match(slidesScript, /classList\.toggle\("visible", active\)/)
    assert.match(slidesScript, /touchstart/)
    assert.match(slidesScript, /touchend/)
    assert.match(slidesScript, /wheel/)
    assert.match(slidesScript, /data-slide-action="style"/)
    assert.match(slidesScript, /quartz-slide-style/)
    assert.match(slidesScript, /data-slide-style="swiss"/)
    assert.match(slidesScript, /data-slide-style="midnight"/)
    assert.match(slidesScript, /data-slide-style="broadside"/)
    assert.match(slidesScript, /data-slide-style="botanical"/)
    assert.match(slidesScript, /data-slide-style="notebook"/)
    assert.match(slidesScript, /data-slide-style="voltage"/)
    assert.match(slidesScript, /data-slide-style="pastel"/)
    assert.match(slidesScript, /<optgroup label="Core Presets">/)
    assert.match(slidesScript, /<optgroup label="Bold Template Pack">/)
    const slideStyleValues = Array.from(
      slidesScript.matchAll(/<option value="([^"]+)">/g),
      (match) => match[1],
    )
    assert.equal(slideStyleValues.length, 48)
    assert.equal(new Set(slideStyleValues).size, 48)
    for (const style of [
      "bold-signal",
      "paper-ink",
      "8-bit-orbit",
      "neo-grid-bold",
      "retro-windows",
      "sakura-chroma",
      "signal",
      "vellum",
    ]) {
      assert.ok(slideStyleValues.includes(style), `missing slide style ${style}`)
      assert.match(slidesScript, new RegExp(`data-slide-style="${style}"`))
    }
    assert.match(slidesScript, /styleSelect\?\.addEventListener\("change"/)
    assert.match(slidesScript, /requestFullscreen/)
    assert.match(slidesScript, /Print \/ Save PDF/)
    assert.match(slidesScript, /@page \{ size: 13\.333in 7\.5in/)
    assert.match(slidesScript, /beforeprint/)
    assert.match(slidesScript, /code\.mermaid/)
    assert.match(slidesScript, /renderSlideMermaid/)
    assert.match(slidesScript, /theme: "default"/)
    assert.match(slidesScript, /foreignObject div/)
    assert.match(slidesScript, /line-height: 1\.2 !important/)
    assert.doesNotMatch(slidesScript, /code\.mermaid \{[^}]*line-height: 0/s)
    assert.match(slidesScript, /overflow: hidden/)
    assert.match(slidesScript, /prefers-reduced-motion: reduce/)
    assert.doesNotMatch(slidesScript, /slide\.hidden/)
  })
})
