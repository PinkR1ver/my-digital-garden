# Project Memory

- This is Jude Wang's Quartz v4 digital garden.
- Agent-facing stable documentation lives in `.agents/docs/`.
- Agent-facing evolving memory lives in `.agents/memory/`.
- Public notes live in `content/`.
- The main public entry points are `content/_index.md` and `content/atlas.md`.
- The production base URL in `quartz.config.ts` is `https://pinktalk.online/`.
- Deployment runs from GitHub Actions on pushes to branch `v4`.
- GitHub Pages builds with Node.js 22 and publishes the generated `public/`
  directory.
- Do not commit `public/`, `.quartz-cache/`, `node_modules/`, `content/.trash/`,
  or `content/copilot/`.
- Treat `content/` as an Obsidian-style vault: preserve wikilinks, MOCs,
  backlinks, tags, and the author's bilingual note style.
