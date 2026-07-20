import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "../..")
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

const frontmatter = read("quartz/plugins/transformers/frontmatter.ts")
const content = read("quartz/components/pages/Content.tsx")
const renderPage = read("quartz/components/renderPage.tsx")
const print = read("quartz/components/Print.tsx")
const printScript = read("quartz/components/scripts/print.inline.ts")
const styles = read("quartz/styles/report.scss")

assert.match(frontmatter, /report: boolean/)
assert.match(content, /frontmatter\?\.report === true \? \["report-page"\]/)
assert.match(renderPage, /componentData\.fileData\.frontmatter\?\.report === true/)
assert.match(renderPage, /class=\{isReport \? "page report-layout" : "page"\}/)
assert.match(print, /frontmatter\?\.report !== true/)
assert.match(styles, /#quartz-root\.report-layout/)
assert.match(styles, /article\.report-page/)
assert.match(styles, /@page \{\s*size: A4;/)
assert.ok(styles.trimStart().startsWith("@media print"))
assert.match(printScript, /article\?\.classList\.contains\("report-page"\)/)
assert.match(printScript, /class=\"report-print\"/)
assert.match(printScript, /\.report-print/)

console.log("report frontmatter print rendering tests passed")
