# Project Memory

- This is Jude Wang's Quartz v4 digital garden.
- Agent-facing stable documentation lives in `.agents/docs/`.
- Agent-facing evolving memory lives in `.agents/memory/`.
- Public notes live in `content/`.
- The main public entry points are `content/_index.md` and `content/atlas.md`.
- The production base URL in `quartz.config.ts` is `www.pinktalk.online`.
- Deployment runs from GitHub Actions on pushes to branch `v4`.
- GitHub Pages builds with Node.js 22 and publishes the generated `public/`
  directory.
- 2026-06-25: The research portfolio/resume moved out of Quartz and is linked
  at `https://pinkr1ver.github.io/resume/`. The old Quartz resume note remains
  archived at `content/arch/resume.md`, and `arch` is ignored by Quartz.
- 2026-04-29: Current `v4` branch is a fork of Quartz around `v4.2.3`
  (`package.json` version `4.2.3`; merge base with `upstream/v4` is
  `b9dee0775`, described as `v4.2.3-9-gb9dee0775`). Upstream has active
  `v4` and `v5` branches; `v4` is at `4.5.2` plus later commits and `v5`
  migrates configuration/layout to YAML plus community plugins.
- Do not commit `public/`, `.quartz-cache/`, `node_modules/`, or
  `content/.trash/`.
- 2026-07-02: Mermaid diagrams are enhanced by
  `quartz/components/scripts/mermaid.inline.ts`, wired from
  `quartz/plugins/transformers/ofm.ts`, with modal styles in
  `quartz/styles/base.scss`. Keep `.inline.ts` files as raw browser scripts;
  do not use `export default` inside them.
- 2026-07-15: Notes can opt into a browser-rendered 16:9 presentation with
  `slides: true`. Its page action is labeled Print, while internally using the
  slides renderer instead of the standard document print renderer. It uses the
  already-rendered article HTML, creates sections from horizontal rules and
  H1/H2 headings, then automatically paginates overlong sections by rendered
  height. It splits lists between items, tables between rows, and highlighted
  code between lines, and supports
  fullscreen, keyboard navigation, and print/save-to-PDF. Mermaid definitions
  are retained and rerendered with a light theme for Slides; fit calculations
  subtract content padding so diagrams do not overlap the footer.
- 2026-07-22: The `frontend-slides` skill from
  `zarazhangrui/frontend-slides` is installed project-locally at
  `.agents/skills/frontend-slides/`. The Quartz Slides renderer now adopts its
  fixed-stage contract: slides are authored at 1920×1080 and the whole stage is
  uniformly transformed to fit each viewport, including phones. Slide switching
  uses `.active` / `.visible`; touch, wheel, reveal motion, reduced-motion, and
  one-slide-per-page printing are supported. Keep the existing semantic
  auto-pagination and Mermaid preparation when applying this skill in future.
- 2026-07-22: Slides Mermaid labels use SVG `foreignObject` HTML and must not
  inherit a zero line height from the diagram container. Keep `code.mermaid` at
  normal line height and explicitly reset `foreignObject` `div`, `span`, and `p`
  to `line-height: 1.2`; also remove paragraph margins there. A zero inherited
  line height collapses the label boxes and makes Chinese and multiline node
  text appear clipped or overlapped.
- 2026-07-22: The Slides/Print toolbar exposes 48 live styles: 14 Core Presets
  (the 12 official `frontend-slides` presets plus Editorial and Midnight) and
  all 34 styles from its Bold Template Pack. The expanded presets vary
  typography, composition, surface, and signature decoration rather than only
  recoloring one template. Keep the native selector grouped with `<optgroup>`
  and derive the allowed-style set from its options to prevent the catalog from
  drifting. Themes retain the same fixed-stage geometry; switching refits slide
  content after fonts load and does not repaginate the note. The renderer
  persists the selection under `quartz-slide-style` in local storage, and
  Print/PDF uses the active theme.
  Keep Mermaid on a light inset surface in dark themes, and explicitly isolate
  slide paragraph/list/table colors from the main-site stylesheet so dark-theme
  body text remains readable.
- 2026-07-26: The `lieflat-charts` skill from
  `larashero3-dotcom/lieflat-charts` is installed project-locally at
  `.agents/skills/lieflat-charts/`, pinned to audited commit `e5b369d`. It is
  suitable for personal/noncommercial use. See
  `.agents/memory/lieflat-charts-audit.md` for CDN, license, and untrusted-label
  handling constraints.
- 2026-07-20: Notes with `report: true` retain the ordinary Quartz reading
  layout on screen. The flag automatically exposes the Print action; only the
  generated print document (and direct-print fallback) receives the A4 report
  typography, tables, figures, hidden sidebars, and page-break rules. Report
  markers remain on `#quartz-root` and the article for print targeting. The
  implementation is centered in `quartz/components/renderPage.tsx`,
  `quartz/components/pages/Content.tsx`, `quartz/components/Print.tsx`,
  `quartz/components/scripts/print.inline.ts`, and `quartz/styles/report.scss`.
- 2026-07-20: `content/report/vestibular_home_business_plan.md` names the two
  programs `Pipeline 1` (CV-based home nystagmus monitoring) and `Pipeline 2`
  (home vestibular rehabilitation), matching the IncuBio deck terminology.
  Pipeline 1 may show the existing analysis-result product screenshot and state
  approximately 4-degree eye-angle measurement precision, conservatively based
  on the recorded 3.25-degree repeatability dispersion. Keep clear that this is
  not diagnostic sensitivity, specificity, or clinical accuracy. Do not include
  or cite the former public reference 18 / pHINTS calibration note in this plan.
  Do not reintroduce iPhone framing or raw experiment details. The report intentionally
  omits technical-asset, patent, and IP-planning sections. The expanded market
  model preserves legacy BP assumptions but labels hospital volumes, pricing
  anchors, channel interviews, revenue sharing, and national GMV ranges as
  hypotheses pending real single-center validation. Pipeline 2 section 7.4 is
  framed as a modular device concept rather than completed progress: a combined
  camera-and-projector base station supports independent training for mild cases;
  head/body IMUs and an optional balance board add feedback for moderate cases;
  safety rails, protection, and supervision support severe or high-fall-risk
  cases. The configuration should change dynamically as the patient improves or
  deteriorates. Keep both the Xiaohei modular explanation figure and the original
  all-in-one rehabilitation-device concept in Pipeline 2; the original concept is
  the hardware-form source and should not be discarded. Pipeline 1 includes the
  magnetic clip/shade mounting concept as its acquisition-end form. The previous
  registration and clinical-validation section was removed at the user's request,
  with all following chapters renumbered. The market material is now consolidated
  into only two chapters: section 8 covers market size (demand, institutional
  capacity, market definitions, single-center model, and revenue scenarios), and
  section 9 covers the current competitive landscape and market gap (including a
  clearly labeled heuristic six-dimensional radar comparison and the entry path).
- 2026-05-01: User requested deletion of all Copilot-related content. Do not
  recreate `content/copilot/` or a Copilot MOC unless explicitly asked.
- Treat `content/` as an Obsidian-style vault: preserve wikilinks, MOCs,
  backlinks, tags, and the author's bilingual note style.
