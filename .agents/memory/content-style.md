# Content Style Memory

- Notes are informal, bilingual, and topic-driven. Preserve the author's voice.
- Use YAML frontmatter with `title`, `date`, and `tags` for public notes.
- Use ISO dates: `YYYY-MM-DD`.
- MOC pages should carry the `MOC` tag and organize links rather than contain long
  essays.
- Both Markdown links and Obsidian wikilinks are valid. Match nearby style.
- Prefer placing new notes under the closest topic folder and linking them from
  the nearest MOC.
- Keep `content/atlas.md` as the high-level map, not a dump of every note.
- User preference: after running a Quartz build or local preview for note work,
  always provide the exact local link address for the changed note/page.
- User preference: when adding references to notes, use inline citation links in
  the body that jump to a lightweight bibliography entry. Prefer numeric
  citations such as `[1]`, `[2]`, `[3]` in the body.
- 2026-04-30: Use Catppuccin Latte for light mode and Catppuccin Frappe for dark
  mode. Fonts match Jacky Zhao's stack: DM Serif Display headings, Bricolage
  Grotesque body, JetBrains Mono code.
- 2026-04-29: Date and metadata text should use a handwritten annotation feel;
  current implementation uses `Caveat` in `quartz/styles/custom.scss`.
- 2026-04-30: Theme toggling should feel like a curtain opening from the
  top-left corner; current implementation uses the View Transition API with a
  clip-path fallback to normal color transitions.
- 2026-04-30: The home page should render as a welcome/entry page, not as a
  normal note. It should hide article title metadata such as date, reading time,
  and tags. Prefer Jacky Zhao-style invitation prose with a small Chinese touch;
  avoid card/button navigation and avoid explaining all the blog's content areas.
  Keep the welcome understated, include a plain path into notes via `atlas`, and
  use Chinese only as a light handwritten signoff touch before Jude's name. Keep
  the normal Quartz sidebars and layout on the home page; use CSS for home-only
  presentation tweaks instead of conditional layout components. Include plain
  inline paths to both `atlas` for notes and `resume` for About me. Keep the
  final signoff split into two lines: small readable handwritten/xingshu-style
  `欢迎` on the left, then `Jude` right-aligned below it. Avoid overly cursive
  Chinese fonts that make the characters hard to read.
- 2026-04-30: User rejected a single aggregate MOC as too shallow for broad
  organization work. Use generated audits only as temporary analysis, then
  integrate notes into nearest topic MOCs or create focused local MOCs. Avoid
  publishing a catch-all index as the main navigation strategy.
- 2026-05-01: `content/garden_index_MOC.md` was deleted after the distributed
  MOC organization was verified. Do not recreate a giant garden-wide MOC unless
  the user explicitly asks for an index artifact.
- 2026-05-01: Computer Science organization should favor clear local MOC
  hierarchies over long flat lists. LLM notes were consolidated under
  `content/computer_sci/llm/` with child MOCs for architecture, training,
  fine-tuning, and inference; do not split new LLM notes back into
  `deep_learning_and_machine_learning/LLM/`.
- 2026-05-06: User wants practical CLI/tooling notes to read like personal
  operation logs, not tutorials. Avoid "my goal", "become an expert", lesson
  plans, or motivational framing; prefer concrete terminal scenarios, shortcut
  tables, terse notes, and an explicit low-AI-tone review when requested.
- 2026-05-07: For the home page's `Recent writing`, the user likes a subtle
  animated `new` badge on the newest note's date rather than a GIF-heavy
  treatment. Keep the motion lightweight and local to that latest entry.
- 2026-05-07: For the home page's `Recent writing`, do not show tags. Keep the
  sidebar list minimal: title, date, and the newest-note `new` badge only.
- 2026-05-07: For the home page's newest-note badge, make `New` noticeably
  larger and keep the outline circle visually obvious. The motion should read
  as a drawn ring, not a fade-in.
- 2026-05-07: For the home page's newest-note badge, use a one-shot draw
  animation for the outline circle, not an infinite loop. Keep the `New` text
  color aligned with the date metadata styling.
- 2026-05-19: For the home page signoff, user liked the first historical
  calligraphy preview: 王羲之 `欢` paired with 米芾 `迎`. Use a transparent PNG
  asset rather than a font file for this two-character treatment.
