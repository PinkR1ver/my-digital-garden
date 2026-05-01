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
- 2026-04-29: Current `v4` branch is a fork of Quartz around `v4.2.3`
  (`package.json` version `4.2.3`; merge base with `upstream/v4` is
  `b9dee0775`, described as `v4.2.3-9-gb9dee0775`). Upstream has active
  `v4` and `v5` branches; `v4` is at `4.5.2` plus later commits and `v5`
  migrates configuration/layout to YAML plus community plugins.
- Do not commit `public/`, `.quartz-cache/`, `node_modules/`, or
  `content/.trash/`.
- 2026-05-01: User requested deletion of all Copilot-related content. Do not
  recreate `content/copilot/` or a Copilot MOC unless explicitly asked.
- Treat `content/` as an Obsidian-style vault: preserve wikilinks, MOCs,
  backlinks, tags, and the author's bilingual note style.
