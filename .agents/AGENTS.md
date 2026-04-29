# Agent Entry Point

This repository is Jude Wang's Quartz v4 digital garden. Agents should treat it
as a public, long-lived knowledge base sourced from an Obsidian-style vault.

## Read Order

Before changing files, read these in order:

1. `.agents/AGENTS.md`: current entry point and operating rules.
2. `.agents/docs/project-overview.md`: stable repository structure and purpose.
3. `.agents/docs/content-guidelines.md`: note-writing, MOC, linking, assets, and
   privacy rules.
4. `.agents/docs/quartz-deployment.md`: Quartz config, local build, and GitHub
   Pages deployment details.
5. Relevant files in `.agents/memory/` when the task depends on prior decisions
   or user preferences.

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
- For TypeScript, config, layout, or component changes, run `npm run check` when
  feasible.

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
- Do not run destructive git commands.
