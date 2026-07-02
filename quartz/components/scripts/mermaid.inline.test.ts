import test, { describe } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"

const mermaidScript = fs.readFileSync(path.join(import.meta.dirname, "mermaid.inline.ts"), "utf8")

describe("mermaid inline script", () => {
  test("renders Mermaid diagrams and wires a simple detail modal", () => {
    assert.match(mermaidScript, /mermaid\.run/)
    assert.match(mermaidScript, /setupMermaidModal/)
    assert.match(mermaidScript, /openMermaidModal/)
    assert.match(mermaidScript, /closeMermaidModal/)
    assert.match(mermaidScript, /cloneNode\(true\)/)
    assert.match(mermaidScript, /requestAnimationFrame\(setupMermaidModal\)/)
    assert.match(mermaidScript, /keydown/)
    assert.match(mermaidScript, /Escape/)
    assert.match(mermaidScript, /aria-label.*Open Mermaid diagram detail/s)
  })
})
