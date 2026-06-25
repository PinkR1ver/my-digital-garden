# Quartz and Deployment

This site uses Quartz v4 to generate a static site from `content/`.

## Quartz Configuration

Key settings in `quartz.config.ts`:

- `pageTitle`: `🎣 JudeW's Knowledge Brain`
- `enableSPA`: `true`
- `enablePopovers`: `true`
- `analytics.provider`: `plausible`
- `locale`: `en-US`
- `baseUrl`: `www.pinktalk.online`
- `ignorePatterns`: `["private", "templates", ".obsidian", "arch"]`
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
- After every successful local build or preview setup, report the exact local
  link address the user can open. For note edits, include the specific note URL,
  not only the site root.
- For note work, treat preview as a review gate: provide the preview URL first,
  then wait for the user to explicitly say to commit and push. Do not commit or
  push merely because the build passed.

Use `npx quartz build --help` for all options. Important flags:

- `-d`, `--directory`: content folder
- `-o`, `--output`: output folder
- `--serve`: local hot-reloading server
- `--port`: preview server port
- `--concurrency`: worker count

### Recommended Local Preview

For a stable preview, prefer a one-shot Quartz build followed by a static server
that serves `public/`:

```bash
npm ci
npx quartz build
node -e "import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; const root=path.resolve('public'); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4'}; function send(res,file){fs.readFile(file,(err,data)=>{if(err){res.writeHead(404); res.end('Not found'); return} res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}); res.end(data)})} http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'); let p=decodeURIComponent(url.pathname); let rel=p.replace(/^\/+/, ''); let candidates=[]; if(p==='/'||p==='') candidates.push(path.join(root,'index.html')); else {candidates.push(path.join(root,rel)); candidates.push(path.join(root,rel+'.html')); candidates.push(path.join(root,rel,'index.html'));} const file=candidates.find(f=>f.startsWith(root)&&fs.existsSync(f)&&fs.statSync(f).isFile()); send(res,file||path.join(root,'404.html'));}).listen(8080,()=>console.log('Serving Quartz static site at http://localhost:8080'));"
```

This server supports Quartz clean URLs by trying the requested path, then
`path.html`, then `path/index.html`.

If port `8080` is busy, change the port in the final `listen(...)` call and
report the new URL.

After starting the preview server, convert the edited note path to a clean URL.
For example:

```text
content/computer_sci/llm/architecture/deepseek_v4_architecture_tricks.md
-> http://localhost:8080/computer_sci/llm/architecture/deepseek_v4_architecture_tricks
```

### Local Preview Pitfalls

- `npm run docs` is an upstream Quartz documentation script. It runs
  `npx quartz build --serve -d docs`, so it serves `docs/` instead of this
  garden's `content/` notes. Do not use it to preview user content.
- `npx quartz build --serve` is the normal Quartz hot-reload command, but in
  this repository it can repeatedly trigger hard rebuilds after generated
  output changes. If that happens, stop it with `Ctrl-C`, run `npx quartz build`
  once, and serve `public/` with the static server above.
- Python's `python3 -m http.server --directory public` can serve the generated
  files, but it does not resolve Quartz clean URLs such as
  `/computer_sci/.../note`; users would need to add `.html`. Prefer the Node
  static server above for realistic previews.

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
- Copies `static-root/.` into `public/` when `static-root/` exists. This is used
  for root-mounted static routes that should bypass Quartz content rendering.
- Uploads `public/` with `actions/upload-pages-artifact@v3`

Deploy job:

- Depends on the build job
- Uses GitHub Pages environment
- Publishes with `actions/deploy-pages@v4`

Operational notes:

- Generated output lives in `public/` and is ignored locally. Do not commit it.
- Root-mounted static route sources live in `static-root/`. The portfolio
  mounted at `/resume/` is sourced from `static-root/resume/` and is copied
  into `public/resume/` during deployment.
- The current branch is expected to be `v4` for deployment.
- A successful push to `v4` should rebuild the site and publish via GitHub Pages.
- Because GitHub Pages deployment is push-triggered, do not use production
  deployment as the first review step. Give the user a local preview URL, or an
  external deploy-preview URL if one is explicitly available, and wait for
  commit/push approval.
- The repository still contains some upstream Quartz workflows that only run for
  `jackyzha0/quartz`; do not rely on those for this personal site.

## Validation

- Run `npx quartz build` when content structure, links, assets, config, or layout
  changed.
- Run `npm run check` when TypeScript, Quartz config, layout, or component code
  changed.
- Report skipped validation clearly.
