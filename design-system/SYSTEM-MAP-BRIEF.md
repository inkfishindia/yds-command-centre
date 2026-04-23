# System Map Page — Design Brief

**Purpose:** Self-documenting view showing YDS Command Centre's own structure: repo directories, API routes, Notion databases, Google Sheets, frontend modules, and documentation. Serves as internal orientation + future session context.

**Last Updated:** 2026-04-22

---

## Design Pattern

**Reuse existing:** Registry page (`public/partials/registry.html`) + Status page (`public/partials/status.html`)

- Header bar with emoji + title + refresh action
- Collapsible sections grouped by domain (Repo, Routes, Databases, Sheets, Modules, Docs)
- Search/filter bar for all sections (client-side)
- Count badge per section
- Cards/rows showing item metadata (name, ID, description, links)
- Empty state fallback

---

## Layout Structure

### 1. View Header Bar
```
🗺️  System Map
Self-documenting architecture overview — file ownership, routes, data sources
[Search box] [Refresh] [Export?]
```

**Classes:** `.view-header-bar`, `.view-header-left`, `.view-header-emoji`, `.view-header-text`, `.view-header-actions` (reuse from registry/status)

---

### 2. Search / Filter Bar
- **Type:** Text input + "Filter all sections"
- **Behavior:** Client-side filter across all section titles, descriptions, IDs, tech stack
- **Placeholder:** "Search repo, routes, databases, modules..."
- **Styling:** `.filter-bar` + input styled like `/api/notion/databases` search input (14px mono font, --bg-input, --border)

---

### 3. Sections (Collapsible via Alpine.js)

#### Section A: **Repo & File Ownership** (collapsible)
**State:** `systemMapExpanded.repo` (boolean)

**Header:**
- Title: "Repo & File Ownership"
- Count badge: "6 directories"
- Chevron (↓/→ icon, no emoji)

**Body:** Tree structure with indentation:
```
server/
  routes/        [backend-builder]  ← Agent badge
  services/      [backend-builder]
  tools/         [backend-builder]
  data/          [devops-infra]
src/js/
  modules/       [frontend-builder]
  app.js         [frontend-builder]
public/
  css/           [frontend-builder]
  js/            [frontend-builder]
  partials/      [frontend-builder]
.claude/
  agents/        [code-reviewer]
  rules/         [code-reviewer]
  skills/        [design-planner]
  docs/          [scribe]
data/
  sessions/      [—]
```

**Component:** 
- Directory rows: `.system-map-dir-row` with left padding (8px per level)
- Agent badge: `.agent-badge` (small pill, semantic color: blue for backend-builder, green for frontend-builder, orange for devops-infra, purple for design-planner)
- Hover: --bg-hover background
- Font: --font-mono for paths, 13px

---

#### Section B: **API Routes** (collapsible)
**State:** `systemMapExpanded.routes` (boolean)

**Header:**
- Title: "API Routes"
- Count badge: "15 route files"

**Body:** Grouped by route file, then listed:
```
Chat Routes (server/routes/chat.js) [5 endpoints]
  POST /api/chat
  POST /api/chat/approve
  POST /api/chat/clear
  GET /api/chat/pending
  [Sync status enum]

Notion Routes (server/routes/notion.js) [18 endpoints]
  GET /api/notion/morning-brief
  GET /api/notion/dashboard
  GET /api/notion/focus-areas
  [... truncated with indicator]
```

**Component:**
- Route group header: `.system-map-route-group` (bold, --text-primary, small uppercase label)
- Route row: `.system-map-route-item` with method badge (POST, GET, PATCH, DELETE) + path + one-line description
- Method badge colors: GET = --accent (blue), POST = --green, PATCH = --amber, DELETE = --red
- Hover: Show copy-to-clipboard icon for path
- Font: --font-mono, 13px

**Empty state:** "No routes match search"

---

#### Section C: **Notion Databases** (collapsible)
**State:** `systemMapExpanded.databases` (boolean)

**Header:**
- Title: "Notion Databases"
- Count badge: "7 databases"

**Body:** Card grid (reuse `.registry-grid` for 2–3 columns on mobile/tablet, wider on desktop):
```
┌─────────────────────────────┐
│ Commitments                 │
│ ID: a1b2c3d4e5f6...          │
│ Property schema link →      │
│ Used by: dashboard,         │
│          decision-log, team │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Decisions                   │
│ ID: f6e5d4c3b2a1...          │
│ Property schema link →      │
│ Used by: dashboard,         │
│          decision-log       │
└─────────────────────────────┘
```

**Component:**
- Card: `.system-map-db-card` (reuse registry-grid + reg-card styling)
- Title: Database name (clickable → GET /api/notion/databases/:id)
- ID row: Truncated ID with `[copy]` button (--text-muted, mono, 12px)
- Schema link: "View schema →" (inline link, --accent blue)
- Used by: "Used by: page1, page2" (--text-secondary)
- Hover: --bg-hover + shadow lift (small card elevation)

**Empty state:** "No databases match search"

---

#### Section D: **Google Sheets** (collapsible)
**State:** `systemMapExpanded.sheets` (boolean)

**Header:**
- Title: "Google Sheets"
- Count badge: "12 sheets"

**Body:** Similar card grid:
```
┌──────────────────────────┐
│ Execution                │
│ Sheet Key: aB12cD3...    │
│ Tabs: Campaigns,         │
│       Tasks, People      │
│ Read by: crm, marketing  │
│          -ops, bmc       │
└──────────────────────────┘
```

**Component:**
- Card: `.system-map-sheet-card` (same structure as DB card)
- Tabs: List inline with comma separation (--text-muted)
- Read/Write indicator: "(read-only)" or "(read-write)" badge

**Empty state:** "No sheets configured"

---

#### Section E: **Frontend Modules** (collapsible)
**State:** `systemMapExpanded.modules` (boolean)

**Header:**
- Title: "Frontend Modules"
- Count badge: "14 modules"

**Body:** Table-like list (reuse registry-grid or system-status-list):
```
src/js/modules/chat.js
  Powers: Chat view
  API dependencies: POST /api/chat, /api/chat/approve, /api/chat/pending
  State: messages[], inputText, streaming, pendingApprovals[]

src/js/modules/dashboard.js
  Powers: Dashboard view
  API dependencies: GET /api/notion/dashboard, /notion/morning-brief
  State: dashboard, upcomingCommitments[], expandedDecision
```

**Component:**
- Module row: `.system-map-module-row` with file path (--font-mono, bold)
- Powers: "Powers: Chat view" (secondary text, link to view)
- API deps: Comma-separated list of endpoints (mono, 12px, --text-muted)
- State count: "12 state vars" (inline, clickable → expand full list or tooltip)
- Hover: Highlight row, show full state list in tooltip or inline expansion

**Empty state:** "No modules match search"

---

#### Section F: **Documentation** (collapsible)
**State:** `systemMapExpanded.docs` (boolean)

**Header:**
- Title: "Documentation & Sessions"
- Count badge: "4 docs + recent sessions"

**Body:** Two subsections:

**Subsection F1 — Core Docs:**
```
app-reference.md
  Last updated: 2026-03-21
  Contains: Routes, Views, State, Methods, CSS, Tools
  View →

notion-hub.md
  Last updated: 2026-01-15
  Contains: DB IDs, Schemas, Write templates
  View →

tech-brief.md
  Last updated: 2026-03-20
  Contains: Architecture, Stack, Critical Patterns
  View →

CLAUDE.md (local)
  Last updated: 2026-04-22
  Contains: File Map, Agent Routing, Workflows
  View →
```

**Subsection F2 — Recent Sessions:**
```
Last 5 entries from data/sessions/handoff.md:
  2026-04-22 | design-planner | System Map page spec → [View full]
  2026-04-21 | frontend-builder | Marketing Ops calendar view → [View full]
  2026-04-20 | backend-builder | Tech Team agents endpoint → [View full]
  ...
```

**Component:**
- Doc card: `.system-map-doc-card` (reuse status/registry card pattern)
- Title: Doc name (link)
- Metadata: Updated date (--text-muted)
- Description: Brief summary
- Action: "View →" link (--accent)
- Session entry: Time + agent badge + task name + "View full" link

**Empty state:** "No sessions yet" / "No documentation"

---

## Colors & Typography

**Use existing tokens from `design-system/TOKENS.md`:**

| Element | Token | Purpose |
|---------|-------|---------|
| Background | `--bg-primary` | Page |
| Cards | `--bg-card` | Section bodies, card backgrounds |
| Hover | `--bg-hover` | Card hover states |
| Text primary | `--text-primary` | Headings, primary content |
| Text secondary | `--text-secondary` | Section subtitles, metadata |
| Text muted | `--text-muted` | IDs, dates, hints |
| Accent | `--accent` (blue) | Links, copyable IDs, interactive |
| GET badge | `--accent` (blue) | GET method |
| POST badge | `--green` | POST method |
| PATCH badge | `--amber` | PATCH method |
| DELETE badge | `--red` | DELETE method |
| Border | `--border` | Cards, rows, separators |
| Font UI | `--font-ui` (Inter) | Headings, labels, body |
| Font mono | `--font-mono` | Paths, IDs, code, endpoints |

**Typography Scale:**
- **Section header:** 16px, 600 weight, --text-primary
- **Count badge:** 12px, 500 weight, --text-secondary
- **Card title:** 14px, 500 weight, --text-primary
- **Body text:** 13–14px, 400 weight, --text-primary
- **Secondary text:** 13px, 400 weight, --text-secondary
- **Muted text (IDs, dates):** 12px, 400 weight, --text-muted
- **Mono text (paths, endpoints):** --font-mono, 13px or 12px, 500 weight

---

## Interactive Behaviors

### Collapsible Sections
- Click section header to toggle expand/collapse
- Chevron rotates (0° closed, 90° open) with smooth transition (--transition-fast)
- State stored in `systemMapExpanded` object (one property per section)
- All sections default to **expanded** on first load
- On mobile, sections may auto-collapse if total height > viewport

### Search Filter
- Input updates `systemMapFilter` state (debounced, 150ms)
- Filters all sections in real-time: section title, item names, descriptions, IDs, tech stack
- If no matches in a section, that section shows empty state
- Search term highlighted in results? Optional for now (can add later)

### Copy Actions
- Database IDs: Hover → show `[copy]` button → click → copy to clipboard + toast "Copied: a1b2c3d4e5f6"
- Google Sheet IDs: Same
- API endpoints: Hover → show `[copy]` button
- Toast duration: 2 seconds, positioned bottom-right (match existing approval/action-feedback toasts)

### Links & Navigation
- "View →" links in docs section: Open detail panel (existing pattern) or new tab
- View schema / View full: Open Notion page in new tab or detail panel
- API path hover: Show "Copy" icon (pencil icon or copy icon from Lucide)

### Refresh Action
- Button in header bar: "Refresh"
- Triggers `loadSystemMap()` → GET /api/system-map (new endpoint to be built by backend-builder)
- Shows loading spinner while fetching
- Updates all sections on return

---

## Empty States & Loading

### Loading State (initial)
```
┌────────────────────────────┐
│ [skeleton-bar]             │  ← section header skeleton
│ ┌──────────┐ ┌──────────┐  │
│ │ skeleton │ │ skeleton │  │  ← card skeletons (2–3 per row)
│ └──────────┘ └──────────┘  │
└────────────────────────────┘
```

**Component:** Reuse `.loading-skeleton` + `.skeleton-card` from existing patterns

### Empty Section (no items)
```
No routes match your search.
Try a different keyword.
```

**Component:** Reuse `.empty-state` class + centered text (--text-secondary)

### Network Error (GET /api/system-map fails)
```
⚠️  Failed to load system map.
[Retry]
```

**Component:** Reuse approval/error message styling

---

## Mobile Responsive Behavior

- **Search bar:** Full width, 44px height (touch target)
- **Section headers:** Full width, 44px minimum height for tap target
- **Cards:** 
  - Mobile (< 768px): Single column, 100% width
  - Tablet (768–1024px): 2 columns
  - Desktop (> 1024px): 3 columns
- **Route rows:** Single row layout, method badge on left, path in middle, description wrapped
- **Collapsible sections:** Default to collapsed on mobile if content > 3 items
- **Copy button:** Touch-friendly size (40px minimum)
- **Chevron icon:** 20px × 20px, easy to tap

---

## Anti-patterns to Avoid

1. **Do NOT:**
   - Invent new component classes (reuse `.registry-grid`, `.system-status-card`, `.filter-bar`, etc.)
   - Hardcode colors (always use CSS variables)
   - Use emojis for route methods or statuses (use badges with semantic colors)
   - Show all 50+ routes at once without pagination/grouping
   - Allow horizontal scroll in route table on mobile

2. **DO:**
   - Collapse large sections by default (Modules, Routes, Databases)
   - Use monospace font for IDs and endpoints (improves scannability)
   - Show count badges on section headers (helps with mental model)
   - Provide copy-to-clipboard for IDs (reduces manual work)
   - Test all links (Notion, GitHub, Google Drive) before delivery

---

## Backend Requirements (for frontend-builder's reference)

**New endpoint:** `GET /api/system-map`

**Returns:**
```json
{
  "directories": [
    {
      "path": "server/routes",
      "owner": "backend-builder",
      "files": 10
    },
    ...
  ],
  "routes": [
    {
      "file": "chat.js",
      "method": "POST",
      "path": "/api/chat",
      "description": "Stream chat via SSE",
      "endpoints": 5
    },
    ...
  ],
  "databases": [
    {
      "name": "Commitments",
      "id": "a1b2c3d4e5f6...",
      "schemaUrl": "...",
      "usedBy": ["dashboard", "decision-log"]
    },
    ...
  ],
  "sheets": [
    {
      "name": "Execution",
      "key": "aB12cD3...",
      "tabs": ["Campaigns", "Tasks"],
      "readBy": ["crm", "marketing-ops"]
    },
    ...
  ],
  "modules": [
    {
      "path": "src/js/modules/chat.js",
      "powers": "Chat view",
      "apiDeps": ["/api/chat"],
      "stateVars": 5
    },
    ...
  ],
  "docs": [
    {
      "name": "app-reference.md",
      "updated": "2026-03-21",
      "description": "...",
      "path": "..."
    },
    ...
  ],
  "recentSessions": [
    {
      "date": "2026-04-22",
      "agent": "design-planner",
      "task": "System Map page spec",
      "file": "data/sessions/handoff.md"
    },
    ...
  ]
}
```

---

## Files to Write

- `src/js/modules/system-map.js` — State, methods, Alpine.js directives
- `public/partials/system-map.html` — Template (collapsible sections, search, cards)
- `public/css/styles.css` — Add `.system-map-*` classes (reuse existing where possible)
- `server/routes/system-map.js` — GET /api/system-map endpoint (new)
- `server/services/system-map-service.js` — Compose route/module/DB metadata from file inspection

---

## Handoff for frontend-builder

1. **Sections are collapsible** — use `x-show` + chevron rotation for UX. State in `systemMapExpanded` object.
2. **Search/filter is client-side** — debounced input filters all sections in real-time.
3. **Reuse existing card patterns** — Registry grid, Status card, Filter bar classes. No new CSS patterns.
4. **Copy-to-clipboard for IDs** — Show `[copy]` on hover, toast feedback for 2 seconds.
5. **Backend to provide:** GET /api/system-map with routes, DB names/IDs, sheets, modules, docs metadata. Frontend renders it into sections.

---

**Status:** Design spec complete. Awaiting backend-builder for endpoint, then frontend-builder for UI implementation.
