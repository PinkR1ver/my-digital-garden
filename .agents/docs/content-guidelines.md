# Content Guidelines

The vault is topic-first and MOC-driven. Keep related notes near their topic MOC,
preserve the author's style, and avoid broad cleanup unless requested.

## Adding Notes

1. Put the note in the nearest existing topic folder.
2. If it starts a new topic cluster, create or update a nearby MOC.
3. Add a link from the relevant MOC so the note is discoverable.
4. Only add it to `content/atlas.md` when it is a new major area or durable
   top-level entry point.

## Frontmatter

Use YAML frontmatter at the top of public notes:

```yaml
---
title: Human Readable Title
date: 2026-04-29
tags:
  - topic
  - MOC
---
```

Guidelines:

- `title` should be readable as a page heading. It may contain emoji if nearby
  notes already use emoji.
- `date` should use ISO format: `YYYY-MM-DD`.
- Use `tags` as a YAML list. Keep tags short and lowercase when possible.
- Use `MOC` tag for map-of-content pages, matching the existing vault style.
- Do not mark publishable pages as drafts unless the user asks. Quartz removes
  draft pages through `Plugin.RemoveDrafts()`.
- Quartz renders the frontmatter `title` as the page heading. Do not repeat the
  same title as a body-level `# H1`; start the note body at `##` unless there is
  a deliberate separate top-level section.

Existing notes are bilingual and informal in places. Preserve the author's voice
and language choice. Do not mass-normalize spelling, casing, emoji, or folder
names unless the user explicitly requests cleanup.

## Markdown and Links

Quartz is configured with:

```ts
Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false })
Plugin.GitHubFlavoredMarkdown()
Plugin.CrawlLinks({ markdownLinkResolution: "shortest" })
```

Rules:

- Both Markdown links and Obsidian wikilinks are acceptable.
- Prefer existing local style in the file or folder you are editing.
- For MOCs, existing content commonly uses Markdown links like
  `[Title](path/to/note.md)` and wikilinks with aliases like
  `[[path/to/note|Display Title]]`.
- Because link resolution is `shortest`, avoid ambiguous duplicate basenames when
  possible. Use enough path segments in wikilinks if there may be duplicates.
- Internal Markdown links should point to source `.md` paths, not generated HTML.
- External links are fine for portfolios, GitHub, Notion, Instagram, papers, and
  references.
- Keep filenames stable once linked by other notes. Renaming notes can break
  backlinks and should be done deliberately with a search-and-update pass.

## MOC Rules

MOC means "Map of Content". It is the main navigation mechanism for this vault.

- Keep MOCs concise and navigational.
- Group links under meaningful headings.
- Link to child MOCs before individual leaf notes when a topic is large.
- Update parent MOCs when adding a new child MOC.
- Keep `content/atlas.md` high signal.

## Excerpt Notes

These rules apply only to quote/excerpt collection notes, such as notes under
`content/hobbies/literature/sentence/`.

- Add newer excerpts before older excerpts instead of appending them at the
  bottom.
- By default, only add the excerpt itself. Do not add agent-written summaries,
  explanations, interpretations, or commentary unless the user explicitly asks
  for them.

## Assets and Attachments

- Public reusable assets belong under `content/assets/`.
- Topic-specific attachments can live near their notes, following existing
  `attachments/` folders.
- Use relative links that Quartz can resolve.
- Avoid committing large binary artifacts unless they are already part of the
  public site or the user explicitly asks.
- Some transcript PDFs and personal images exist under `content/assets/`; do not
  modify or remove them without direct instruction.

## Privacy and Publish Boundary

Already ignored:

- `private/`
- `/content/.trash`
- `/content/copilot`
- `.obsidian`
- `public`
- `.quartz-cache`
- `node_modules`

Agent rules:

- Do not move private, trash, or Copilot material into public content without
  explicit user approval. `content/copilot/` was deleted on 2026-05-01 at user
  request; do not recreate a Copilot MOC for it.
- Be careful with personal documents, transcripts, IDs, resume material, and
  unpublished research notes.
- If a note looks sensitive, ask before making it more discoverable from public
  MOCs.

## Safe Editing Workflow

Before editing:

1. Run `git status --short --branch`.
2. Read the nearby MOC and one or two neighboring notes.
3. Check whether the target content is public, private, ignored, or sensitive.

When editing notes:

1. Preserve existing voice, mixed English/Chinese style, and terminology.
2. Keep changes narrow and purposeful.
3. Maintain frontmatter.
4. Update relevant MOCs and backlinks if adding or moving notes.
5. Do not rewrite large note sets unless explicitly asked.

## Formatting Boundary

`content/` is intentionally excluded from Prettier. It is an Obsidian vault with
local plugins, themes, mixed-language notes, and author-specific Markdown style.
Use targeted manual formatting for edited notes instead of running Prettier over
the vault.
