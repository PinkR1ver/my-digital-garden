# Project Overview

This repository is Jude Wang's personal digital garden, built with Quartz v4 and
published as a static website.

## Purpose

- The public website is generated from Markdown notes in `content/`.
- The site title is `🎣 JudeW's Knowledge Brain`.
- The configured production base URL is `https://pinktalk.online/`.
- The content is an Obsidian-style vault: Markdown notes, MOC pages, wikilinks,
  backlinks, tags, assets, and some Obsidian-only syntax.
- The repository vendors Quartz source code under `quartz/`.

## Repository Map

- `content/`: source notes and assets for the public digital garden.
- `content/_index.md`: home page.
- `content/atlas.md`: main map of maps, linking to major knowledge areas.
- `content/**/MOC.md`, `content/**/*_MOC.md`, `content/**/*_moc.md`: map-of-content
  pages that organize topic clusters.
- `content/assets/`: public assets used by notes.
- `content/.obsidian/`: local Obsidian configuration. Quartz ignores it.
- `content/.trash/`: ignored trash folder. Do not publish or maintain it.
- `content/copilot/`: deleted on 2026-05-01 at user request. If Copilot
  prompt/conversation exports reappear, treat them as ignored private tooling
  exports and do not publish or maintain them unless the user explicitly asks.
- `docs/`: upstream Quartz documentation.
- `quartz/`: Quartz v4 implementation.
- `quartz.config.ts`: site configuration, plugins, theme, link handling, filters,
  emitters.
- `quartz.layout.ts`: visible page layout and components.
- `.github/workflows/deploy.yaml`: GitHub Pages deployment workflow.

## Main Content Areas

- `content/computer_sci/`: programming, algorithms, web, LLM, ML, software notes.
  LLM has a dedicated canonical subtree at `content/computer_sci/llm/`; keep
  LLM architecture, training, fine-tuning, inference, RAG, framework, and
  evaluation notes there instead of under `deep_learning_and_machine_learning/`.
- `content/data_sci/`: data science, fitting, stochastic processes, visualization.
- `content/math/`: calculus, statistics, optimization, real analysis.
- `content/physics/`: electromagnetism, optics, waves.
- `content/electrical_electronics/`: RF, antennas, MCU, hardware notes.
- `content/signal/`: signal processing and hardware.
- `content/research_career/`: research plans, papers, devices, MSc/FYP material.
- `content/report/`: reports and longer writeups.
- `content/hobbies/`: photography, literature, food, games, IELTS, music.
- `content/toolkit/`: practical tool notes.
- `content/plan/`, `content/log/`, `content/news.md`: personal pages and
  updates. The old resume page is archived under `content/arch/`; the current
  portfolio is external at `https://pinkr1ver.github.io/resume/`.

## Dual Git Repo

`content/` is a **nested git repository** (not a submodule) that tracks notes independently:

| Repo | Remote | Branch |
| :--- | :--- | :--- |
| Root (Quartz site) | `github.com/PinkR1ver/my-digital-garden` | `v4` |
| `content/` (notes only) | `github.com/PinkR1ver/Jude.W-s-Knowledge-Brain` | `master` |

When committing and pushing, **always check both repos**:

1. Run `git status` in `content/` first — stage and commit any note changes, push to `master`
2. Run `git status` in the root — stage and commit any note + infrastructure changes, push to `v4`

### Why?

The content repo is synced separately so notes can be used outside of the Quartz build system (e.g., in Obsidian or other tools) without pulling in the entire site infrastructure.

## Public Entry Path

```text
content/_index.md -> content/atlas.md -> topic MOCs -> leaf notes
```

Use this path when deciding whether a page is discoverable enough for the public
site.
