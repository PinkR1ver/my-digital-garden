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

## Opt-in Note Exports

- `print: true` in note frontmatter shows the existing print action.
- `report: true` keeps the normal Quartz reading layout on screen, automatically
  shows the print action, and applies the A4 report typography, tables, figures,
  hidden sidebars, and page-break rules only to the generated print document or
  direct-print fallback. Report pages do not also need `print: true`. The print
  styles live in `quartz/styles/report.scss` and the print-window rendering is
  handled by `quartz/components/scripts/print.inline.ts`.
- `slides: true` shows a Print action that converts the rendered note HTML into
  a printable 16:9 presentation rather than the standard document layout. The
  title becomes a cover slide; Markdown horizontal
  rules and H1/H2 headings start content sections. Sections that exceed one
  slide are automatically paginated using their rendered height; continuation
  slides repeat the section heading, and lists, tables, and code are split only
  between semantic items, rows, or lines. The generated deck supports keyboard
  navigation, fullscreen presentation, and browser printing/saving as PDF with
  one slide per page. Mermaid source is retained before normal page rendering so
  Slides can rerender diagrams for its light background; pagination and scaling
  use the padding-adjusted content box to keep diagrams above the footer. The
  renderer follows the project-local `frontend-slides` skill: every slide is
  authored on a fixed 1920×1080 stage, the stage scales uniformly to fit desktop
  and phone viewports without reflowing slide content, and visibility is managed
  with `.active` / `.visible` rather than `display: none`. Touch swipe, mouse
  wheel, keyboard navigation, reveal motion, and reduced-motion preferences are
  supported. The Slides toolbar includes 48 live styles grouped as 14 Core
  Presets and the complete 34-style `frontend-slides` Bold Template Pack. Each
  option has its own typography, palette, surface treatment, and signature
  decoration while retaining the fixed-stage geometry. The selected theme is
  persisted in browser local storage and is used for presentation and
  print/PDF output.
- The implementation lives in `quartz/components/Slides.tsx` and
  `quartz/components/scripts/slides.inline.ts`, and is registered in
  `quartz.layout.ts`.
