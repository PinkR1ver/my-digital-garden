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
