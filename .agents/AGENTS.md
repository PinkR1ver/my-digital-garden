# Agent Entry Point

This repository is Jude Wang's Quartz v4 digital garden. Agents should treat it
as a public, long-lived knowledge base sourced from an Obsidian-style vault.

## Task-Driven Reading

Read only what the task needs. This agent file is loaded automatically; do not
pre-read all docs upfront.

| Task type | Read |
|-----------|------|
| New note or edit existing note | `.agents/docs/content-guidelines.md` (frontmatter, links, MOC rules) |
| New topic area or MOC restructure | above + `.agents/docs/project-overview.md` (content areas map) |
| Secret/encrypted note | above + `.agents/docs/secret-notes.md` |
| Quartz config, layout, deploy | `.agents/docs/quartz-deployment.md` |
| Build, preview, or CI debugging | `.agents/docs/quartz-deployment.md` |
| Task depends on prior decisions | relevant `.agents/memory/*.md` files (scan titles, read matching ones) |

Before any file change, run `git status --short --branch` and look at the
nearest MOC and one or two neighboring notes for style.

After completing work, write one short memory file to `.agents/memory/` only
if you learned something reusable: a user preference, a decision, or a
non-obvious fact. Do not record what the repo already documents.

## Folder Roles

- `.agents/docs/`: general, relatively stable project documentation. Put durable
  descriptions, operating manuals, and technical references here.
- `.agents/memory/`: evolving memory for future agents. Put preferences,
  decisions, unresolved questions, and facts learned during collaboration here.
- `.agents/skills/`: reserved for project-local skills if later needed.

Do not store secrets, credentials, private IDs, or unpublished personal material
in `.agents/`.

## Core Rules

- Public site source lives in `content/`.
- Generated output lives in `public/` and should not be edited or committed.
- Normal note work should stay in `content/`; Quartz internals under `quartz/`
  should be changed only when the task explicitly requires it.
- Preserve the author's bilingual, Obsidian-style, MOC-driven note system.
- Do not move ignored/private material into public content without explicit user
  approval.
- Before editing, run `git status --short --branch` and inspect nearby notes or
  MOCs.
- For substantial content, link, asset, config, or layout changes, verify with
  `npx quartz build`.
- Do not start a preview server or provide a preview URL by default after note
  work. Only preview when the user explicitly asks; then provide the exact URL
  for the changed page. Do not commit or push until the user explicitly says to
  commit/push.
- When committing note changes, always check both repos: `content/` (notes
  only, default branch `encrypted-notes`, remote `PinkR1ver/Jude.W-s-Knowledge-Brain`,
  plaintext backup on `master`) and the root (full Quartz site, branch `v4`,
  remote `PinkR1ver/my-digital-garden`). Commit content/ first, then root.
  See `.agents/docs/project-overview.md`.
- For TypeScript, config, layout, or component changes, run `npm run check` when
  feasible.

## Parallel Session Isolation

This repository may be edited by multiple agent sessions at the same time.
Branches alone do not isolate uncommitted or untracked files: sessions that use
the same working directory still share one filesystem and can see, overwrite,
build, or accidentally stage each other's work.

- Every new note task or feature task must start on its own dedicated branch
  **and** in its own dedicated `git worktree` before any task file is created or
  edited.
- Use `notes/<short-slug>` for note-only work and `feature/<short-slug>` for
  application, Quartz, automation, or other code changes. An agent-specific
  prefix such as `agent/<short-slug>` is also acceptable when required by its
  publishing workflow.
- Create the worktree from the latest intended base branch. Note work normally
  targets `content/encrypted-notes`; full-site or Quartz work targets root `v4`.
- Do not switch branches in the primary/shared working directory when another
  session may be active. Do not assume an untracked file belongs to the branch
  currently shown by `git status`.
- Run builds, formatters, generators, and previews inside the task worktree, not
  the shared primary worktree. A Quartz build deletes and regenerates `public/`,
  so running it in a shared directory can disrupt another session even though
  `public/` is ignored by Git.
- Before staging or merging, inspect `git status`, `git diff`, and
  `git worktree list`. Stage explicit paths only; never absorb files from a
  different session merely because they are visible in the worktree.
- When a note must be recorded in both repositories, use isolated worktrees for
  both: commit the canonical note in `content/` first, then integrate the same
  scoped content change into the root repository. Do not mix the two indexes.
- If a task is discovered to have started in the shared worktree, stop before
  moving, cleaning, resetting, or committing its files. Establish ownership
  with the user or other session, then migrate it to an isolated worktree
  without discarding changes.
- Remove a task worktree only after its changes are committed or intentionally
  abandoned, and only after confirming it contains no unrelated or untracked
  work.

## Current Project Facts

- Site title: `🎣 JudeW's Knowledge Brain`
- Production base URL: `https://pinktalk.online/`
- Main entry pages: `content/_index.md` and `content/atlas.md`
- Deploy branch: `v4`
- Deploy workflow: `.github/workflows/deploy.yaml`
- Local preview: prefer `npx quartz build`, then serve `public/` with the
  clean-URL Node static server documented in
  `.agents/docs/quartz-deployment.md`.

## Do Not Do Without Explicit Request

- Do not delete or rewrite large parts of `content/`.
- Do not rename folders broadly.
- Do not expose ignored/private material.
- Do not edit generated `public/`.
- Do not casually change the production domain, deploy branch, or GitHub Pages
  workflow.
- Do not commit or push note changes before the user has reviewed the preview
  URL and explicitly asked for commit/push.
- Do not run destructive git commands.
