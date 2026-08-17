<!-- diagram-design-profile
name: Catppuccin Latte
slug: catppuccin-latte
source-url: none
created: 2026-08-16
updated: 2026-08-16
notes: Jude's digital garden brand — Catppuccin Latte (light) / Frappe (dark); DM Serif Display / Bricolage Grotesque / JetBrains Mono
-->
# Style Guide

**The single source of truth for colors, typography, and tokens.** Every diagram draws from this — not from hex values inlined in other reference files. If you want to change the visual skin of Diagram Design, change this file.

Skin: Catppuccin Latte (light) / Catppuccin Frappe (dark).

---

## Tokens

### Semantic roles

Every token is referred to by **semantic role**, not by its hex value. Type references (`type-*.md`) and SKILL.md say `accent`, not `#8839ef`.

| Role | Purpose | Light | Dark |
|---|---|---|---|
| `paper` | Page background, default node fill | `#eff1f5` (base) | `#303446` (base) |
| `paper-2` | Diagram container bg, secondary fill | `#e6e9ef` (mantle) | `#292c3c` (mantle) |
| `ink` | Primary text, primary stroke | `#4c4f69` (text) | `#c6d0f5` (text) |
| `muted` | Secondary text, default arrow stroke | `#6c6f85` (subtext0) | `#a5adce` (subtext0) |
| `soft` | Sublabels, boundary labels | `#8c8fa1` (overlay1) | `#838ba7` (overlay1) |
| `rule` | Hairline borders | `rgba(76,79,105,0.12)` | `rgba(198,208,245,0.12)` |
| `rule-solid` | Stronger borders, baselines | `#bcc0cc` (surface1) | `#51576d` (surface1) |
| `accent` | Focal / 1–2 max per diagram | `#8839ef` (mauve) | `#ca9ee6` (mauve) |
| `accent-tint` | Fill for accent-bordered boxes | `rgba(136,57,239,0.08)` | `rgba(202,158,230,0.10)` |
| `link` | HTTP/API calls, external arrows | `#1e66f5` (blue) | `#8caaee` (blue) |

> **Brand palette source:** Catppuccin Latte / Frappe. `paper`=base, `paper-2`=mantle, `ink`=text, `muted`=subtext0, `soft`=overlay1, `rule-solid`=surface1, `accent`=mauve, `link`=blue. `rule` is `ink` at 0.12 opacity; `accent-tint` is `accent` at 0.08 light / 0.10 dark.

> **Note:** The pre-baked example HTML files in `assets/` were built under an earlier skin. New diagrams the skill produces will use the tokens above.

### Inversion rule (light → dark)

`rgba(76,79,105, X)` in light becomes `rgba(198,208,245, X)` in dark. Same opacities, RGB flipped to the Frappe text color.

### Series palette (multi-series chart types only)

A small set of desaturated, editorial-tone colors for chart types that genuinely need to distinguish multiple overlapping entities (currently: **radar**). The "1-focal" rule still holds — `accent` is reserved for the focal series; the palette below covers the rest.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `series-1` | `#40a02b` (green) | `#a6d189` | Non-focal series |
| `series-2` | `#1e66f5` (blue) | `#8caaee` | Non-focal series |
| `series-3` | `#df8e1d` (yellow) | `#e5c890` | Non-focal series |
| `series-4` | `#e64553` (maroon) | `#ea999c` | Non-focal series |
| `series-5` | `#209fb5` (sapphire) | `#85c1dc` | Non-focal series |

Fills sit at `0.18` opacity light, `0.22` dark; strokes use the full color. **Don't backfill these tokens to non-chart types** — architecture, swimlane, etc. continue to use muted-ink variants. The series palette is opt-in for diagrams where overlapping shapes demand distinguishable color, not a license to add color elsewhere.

### Terminal skin (opt-in alternate)

A self-contained palette for the terminal-window primitive (see [primitive-terminal.md](primitive-terminal.md)) — a CLI-chrome register for dev-tool posts and technical social cards. It does not replace the default skin above and isn't affected by onboarding; it's a second, fixed skin you opt into per-diagram.

| Token | Hex | Purpose |
|---|---|---|
| `terminal-page` | `#0a0a0a` | Page background behind the window |
| `terminal-paper` | `#141414` | Window body, node fill |
| `terminal-bar` | `#1b1b1b` | Titlebar strip |
| `terminal-border` | `#2b2b2b` | Window border, hairlines |
| `terminal-ink` | `#f5f5f5` | Primary text, primary stroke |
| `terminal-muted` | `#9a9a9a` | Secondary text, sublabels, ring stroke |
| `terminal-soft` | `#5c5c5c` | Tertiary — inactive dots, spokes |
| `terminal-accent` | `#ff5a36` | The one accent — focal station, prompt sign, active dot |
| `terminal-accent-tint` | `rgba(255,90,54,0.12)` | Fill for accent-bordered boxes |

**1-accent rule still holds.** Everything that isn't `terminal-ink` or `terminal-muted`/`terminal-soft` should be `terminal-accent` — never introduce a second hue.

---

## Typography

| Role | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `title` | DM Serif Display | 1.75rem | 400 | Page H1 |
| `node-name` | Bricolage Grotesque | 12px | 600 | Human-readable labels |
| `sublabel` | JetBrains Mono | 9px | 400 | Port, protocol, URL, field type |
| `eyebrow` | JetBrains Mono | 7–8px | 500, tracked 0.18em, uppercase | Type tags, axis labels |
| `arrow-label` | JetBrains Mono | 8px | 400, tracked 0.06em | Arrow annotations |
| `callout` | DM Serif Display *italic* | 14px | 400 | Editorial asides only |

### Font stack

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600&display=swap" rel="stylesheet">
```

**Load-bearing rule:** Mono is for *technical* content (ports, commands, URLs, field types). Names go in Bricolage Grotesque. Page title is DM Serif Display. Italic DM Serif Display is reserved for annotation callouts. **Never use a mono font as a blanket "dev" font.** For CJK labels, extend the family on those `<text>` elements — `'Bricolage Grotesque', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif` for names and `'JetBrains Mono', 'Noto Sans Mono CJK SC', monospace` for mono sublabels.

---

## Stroke, radius, spacing

| Token | Value | Use |
|---|---|---|
| `stroke-thin` | `0.8` | Tag-box outlines, leaf nodes |
| `stroke-default` | `1` | Most strokes |
| `stroke-strong` | `1.2` | Emphasis strokes |
| `radius-sm` | `4` | Small tags |
| `radius-md` | `6` | Node boxes |
| `radius-lg` | `8` | Containers, rings |
| `grid` | `4` | Every coord, size, and gap is divisible by 4 (hard rule) |

---

## Node type → treatment

Semantic role combinations — reference these by name in type specs.

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` | `accent` |
| `backend` | `#ffffff` (white) | `ink` |
| `store` | `ink @ 0.05` | `muted` |
| `external` | `ink @ 0.03` | `ink @ 0.30` |
| `input` | `muted @ 0.10` | `soft` |
| `optional` | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| `security` | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

---

## Customizing the skin

Four options:

1. **Run onboarding** — see [`onboarding.md`](onboarding.md). Drop a URL; the skill extracts the palette + fonts and rewrites this file.
2. **Edit by hand** — change the hex values in the tables above. Run the pre-output taste gate afterward to verify the accent still reads as "focal" against the new paper color.
3. **Brand handoff** — paste your existing design-token JSON into a new section here and map its tokens to the semantic roles above.
4. **Client profiles** — save and switch named skins, or bind one to a project, using [`profiles.md`](profiles.md).

### Constraints (don't break these)

- **Contrast**: `ink` must hit WCAG AA on `paper`. `muted` must hit AA on `paper` for 11px+ text.
- **One accent**: pick one color for `accent`. Two accents erases the focal signal.
- **No rainbow palette**: if your brand ships 8 colors, pick 3 (paper, ink, accent). The rest become `muted` variants.
- **Serif + sans + mono**: three families, not more. If brand typography is all sans, keep DM Serif Display for `title` and `callout` anyway — the contrast is load-bearing.
- **Paper is warm-neutral, not pure white**: pure white turns the design sterile. Pick a cream, bone, or light grey with a hint of warmth.
- **Dot pattern is optional, not default**: the 22×22 dot pattern is an opt-in "dotted paper" variant (good for long-form editorial hero diagrams). The default background is a clean `paper` fill, no pattern. When the pattern is enabled, it should sit at ~10% opacity of `ink` on `paper` — visible but quiet.
- **Container is clean by default**: the diagram sits directly on the page paper, no secondary container background or border. A framed variant (`paper-2` bg + `rule` border + 8px radius + padding) is available as an opt-in for card-heavy layouts, but don't reach for it by default — the extra chrome fights the figure.
