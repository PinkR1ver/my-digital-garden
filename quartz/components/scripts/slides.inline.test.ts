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
    assert.match(slidesScript, /requestFullscreen/)
    assert.match(slidesScript, /Print \/ Save PDF/)
    assert.match(slidesScript, /@page \{ size: 13\.333in 7\.5in/)
    assert.match(slidesScript, /beforeprint/)
    assert.match(slidesScript, /code\.mermaid/)
    assert.match(slidesScript, /renderSlideMermaid/)
    assert.match(slidesScript, /theme: "default"/)
    assert.match(slidesScript, /overflow: hidden/)
  })
})
