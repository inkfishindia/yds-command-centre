---
paths:
  - "public/**"
  - "src/js/**"
  - "src/css/**"
  - "server/**"
  - "server.js"
---

# External References — Canonical Docs

When writing code that touches the technologies below, **prefer these official sources** over training-data recall. Versions and APIs drift; the primer in your training set may be older than the docs.

| Stack area | When to consult | Official source |
|---|---|---|
| Alpine.js (state, DOM directives, `x-data`/`x-show`/`x-for`/`x-bind`/`x-on`) | Any new partial in `public/partials/`, any module in `src/js/modules/`, any directive use in `public/index.html` | https://alpinejs.dev/start-here |
| Express.js routing (CommonJS) | New routes under `server/routes/`, middleware ordering, error-handling patterns | https://expressjs.com/en/guide/routing.html |
| Apache ECharts (vanilla JS) | If a future view needs BI-grade charts (line/bar/heatmap/sankey, time-series with zoom, large datasets). Bind to a `<div>` — no framework adapter needed | https://echarts.apache.org/handbook/en/get-started/ |
| Chart.js | Lighter alternative to ECharts when the metric is simple (single line / single bar / single donut). Pick **one** library per page; don't load both | https://www.chartjs.org/docs/latest/getting-started/ |
| Preline UI (Tailwind components, vanilla JS) | **Reference only** — this project does **not** use Tailwind. Snippets are copy-as-inspiration for layout patterns; rewrite in our hand-rolled CSS using `design-system/TOKENS.md` | https://preline.co/docs/index.html |

## Rules

1. **No new chart library without a decision row.** Adding ECharts or Chart.js is a stack decision — log to `data/sessions/decisions.md` first, then load via CDN in `public/index.html` or as a per-view module.
2. **Tailwind stays out of this repo.** The dark theme uses CSS custom properties in `public/css/styles.css` and patterns in `design-system/CSS-PATTERNS.md`. Preline snippets must be ported, not pasted with `class="bg-gray-900 …"`.
3. **One chart lib per view.** Don't mix ECharts and Chart.js on the same page — bundle weight + cognitive overhead.
4. **CommonJS only on server.** Express docs may show ESM examples; translate to `require()` / `module.exports` to match `server/` conventions.

## Why this file exists

Older training data may pre-date current Alpine.js 3.x directive list, Express 5 async-error semantics, or ECharts 5.x option shape. When the doc and the model disagree, the doc wins. Read the page first if you're unsure.
