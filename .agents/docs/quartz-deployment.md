# Quartz and Deployment

This site uses Quartz v4 to generate a static site from `content/`.

## Quartz Configuration

Key settings in `quartz.config.ts`:

- `pageTitle`: `🎣 JudeW's Knowledge Brain`
- `enableSPA`: `true`
- `enablePopovers`: `true`
- `analytics.provider`: `plausible`
- `locale`: `en-US`
- `baseUrl`: `https://pinktalk.online/`
- `ignorePatterns`: `["private", "templates", ".obsidian"]`
- `defaultDateType`: `created`
- Theme fonts:
  - Header: `Schibsted Grotesk`
  - Body: `Source Sans Pro`
  - Code: `IBM Plex Mono`

Transformers:

- `FrontMatter()`
- `CreatedModifiedDate({ priority: ["frontmatter", "filesystem"] })`
- `Latex({ renderEngine: "katex" })`
- `SyntaxHighlighting({ light: "github-light", dark: "github-dark" })`
- `ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false })`
- `GitHubFlavoredMarkdown()`
- `TableOfContents()`
- `CrawlLinks({ markdownLinkResolution: "shortest" })`
- `Description()`

Filters:

- `RemoveDrafts()`

Emitters:

- Alias redirects
- Component resources
- Content pages
- Folder pages
- Tag pages
- Content index with sitemap and RSS
- Assets
- Static files
- 404 page

## Layout Configuration

Key settings in `quartz.layout.ts`:

- Shared footer links:
  - GitHub: `https://github.com/PinkR1ver`
  - Instagram: `https://www.instagram.com/jude.wang.yc/`
  - Strava: `https://www.strava.com/athletes/109116948`
- Content pages show:
  - Breadcrumbs
  - Article title
  - Content metadata
  - Tags
  - Page title
  - Search
  - Dark mode
  - Recent notes titled `Recent writing`
  - Graph
  - Table of contents on desktop
  - Backlinks
- The Explorer is disabled on normal content pages and enabled on list pages.

When changing layout, verify both a normal note and a list page such as a folder
or tag page.

## Local Development

Requirements from `package.json`:

- Node.js `>=18.14`
- npm `>=9.3.1`

Common commands:

```bash
npm ci
npx quartz build
npx quartz build --serve
npx quartz build --serve --port 8080
npm run check
npm test
```

Build defaults:

- Source directory: `content`
- Output directory: `public`
- Local preview: `http://localhost:8080/` unless another port is provided

Use `npx quartz build --help` for all options. Important flags:

- `-d`, `--directory`: content folder
- `-o`, `--output`: output folder
- `--serve`: local hot-reloading server
- `--port`: preview server port
- `--concurrency`: worker count

## GitHub Pages Deployment

Deployment is handled by `.github/workflows/deploy.yaml`.

Trigger:

- Push to branch `v4`
- Manual GitHub Actions dispatch is not configured for this deploy workflow.

Build job:

- Runs on `ubuntu-22.04`
- Checks out full git history with `fetch-depth: 0`
- Uses Node.js `22`
- Runs `npm ci`
- Runs `npx quartz build`
- Uploads `public/` with `actions/upload-pages-artifact@v3`

Deploy job:

- Depends on the build job
- Uses GitHub Pages environment
- Publishes with `actions/deploy-pages@v4`

Operational notes:

- Generated output lives in `public/` and is ignored locally. Do not commit it.
- The current branch is expected to be `v4` for deployment.
- A successful push to `v4` should rebuild the site and publish via GitHub Pages.
- The repository still contains some upstream Quartz workflows that only run for
  `jackyzha0/quartz`; do not rely on those for this personal site.

## Validation

- Run `npx quartz build` when content structure, links, assets, config, or layout
  changed.
- Run `npm run check` when TypeScript, Quartz config, layout, or component code
  changed.
- Report skipped validation clearly.
