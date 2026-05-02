# marketingOps CSS — FILE-MAP

Split from `marketingOps.css` (600 lines at hard cap) on 2026-05-03.
Entry shim: `src/css/views/marketingOps.css` (14 lines, @import only).

---

## Public exports

All classes exported from this package are available via the `marketingOps.css` shim import.
External consumers (partials, core.css markers) should continue referencing class names — do not import leaf files directly.

---

## Files

| File | Owns | DO NOT add |
|------|------|-----------|
| `base.css` | `.mktops-view`, `.mktops-meta-banner*`, `.mktops-filters`, `.clickable-cell`, status-badge data-attrs, `.table-wrap` | UTM builder, kanban boards, morning briefing |
| `kanban.css` | Campaign/content/sequence kanban boards (`.mktops-*-board`), `.kanban-card-blocked`, `.mktops-alert-*`, sequence health, inline actions, `.action-btn-spinner`, `.view-toggle-*` | UTM builder, detail panel, morning briefing |
| `detail.css` | `.detail-commitments`, `.commitment-*`, `.mktops-metrics` | Kanban, UTM, morning briefing |
| `utm.css` | All `.utm-builder-*`, `.utm-*`, `.mini-action-btn--danger` | Kanban boards, morning briefing, base rules |
| `utils.css` | Inline-style migration utilities (`.mktops-empty-spaced`, `.mktops-ai-*`, `.mktops-skeleton-col`, `.mktops-select-pointer`, `.mktops-card-pointer`), task board + task cards | UTM builder, morning briefing |
| `morning.css` | Tier 1 metrics strip (`.mktops-t1-*`), morning sections (`.mktops-morning-*`), today's content table, campaign morning board, pulse rows, `.notion-link-btn` | Kanban, UTM, base rules |

---

## Want to add a feature?

| Intent | File |
|--------|------|
| New kanban board or card variant | `kanban.css` |
| New UTM-related UI element | `utm.css` |
| Change the morning briefing layout | `morning.css` |
| Add a metric to the Tier 1 strip | `morning.css` |
| Notion deep-link button changes | `morning.css` |
| Detail panel changes | `detail.css` |
| Task board changes | `utils.css` |
| View container / tab bar changes | `base.css` |

---

## Dep graph

```
marketingOps.css (shim)
  → base.css       (no internal deps)
  → kanban.css     (no internal deps)
  → detail.css     (no internal deps)
  → utm.css        (no internal deps)
  → utils.css      (no internal deps)
  → morning.css    (no internal deps)
```

All leaves are independent. Dep graph is acyclic.

---

## Constraining decisions

- `decisions.md #72/#79/#80/#90` — CSS split methodology (esbuild @import inlining, shim entry, leaf file structure)
- `decisions.md #99` — IG view is a separate `/ig` view, not embedded in marketingOps
- `open-loops.md` — marketingOps.css at 600-line hard cap was a known open loop; this split resolves it
