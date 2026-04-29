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
- `content/copilot/`: ignored Copilot prompt/conversation exports. Do not publish
  or maintain it unless the user explicitly asks.
- `docs/`: upstream Quartz documentation.
- `quartz/`: Quartz v4 implementation.
- `quartz.config.ts`: site configuration, plugins, theme, link handling, filters,
  emitters.
- `quartz.layout.ts`: visible page layout and components.
- `.github/workflows/deploy.yaml`: GitHub Pages deployment workflow.

## Main Content Areas

- `content/computer_sci/`: programming, algorithms, web, LLM, ML, software notes.
- `content/data_sci/`: data science, fitting, stochastic processes, visualization.
- `content/math/`: calculus, statistics, optimization, real analysis.
- `content/physics/`: electromagnetism, optics, waves.
- `content/electrical_electronics/`: RF, antennas, MCU, hardware notes.
- `content/signal/`: signal processing and hardware.
- `content/research_career/`: research plans, papers, devices, MSc/FYP material.
- `content/report/`: reports and longer writeups.
- `content/hobbies/`: photography, literature, food, games, IELTS, music.
- `content/toolkit/`: practical tool notes.
- `content/plan/`, `content/log/`, `content/news.md`, `content/resume.md`:
  personal pages and updates.

## Public Entry Path

```text
content/_index.md -> content/atlas.md -> topic MOCs -> leaf notes
```

Use this path when deciding whether a page is discoverable enough for the public
site.
