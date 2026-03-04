---
paths:
  - "public/**"
---

# Frontend Patterns

- Alpine.js only: `x-data`, `x-show`, `x-for`, `x-text`, `x-html`, `x-on`, `x-bind`. No React, no Vue, no other framework.
- All state and methods live in the single `app()` function in `public/js/app.js`. Do not split into components or separate files.
- No build step. Edit files directly, refresh browser. No transpilation, no bundling, no npm run build.
- `marked.parse()` for rendering markdown content from Colin or Notion.
- Dark theme uses CSS custom properties defined in `:root` in `public/css/styles.css`. Do not hardcode colors.

## Adding a New View
1. Add nav button in `public/index.html`
2. Add view template with `x-show="view === 'yourview'"`
3. Add state variables and methods to `app()` in `public/js/app.js`
4. Add styles in `public/css/styles.css`

## SSE Handling
- Chat responses stream via SSE. The event handler in `app.js` routes by event type: `text` → append to message, `approval` → show approval UI, `error` → display error, `done` → finalize.
- Do not poll. Do not use fetch for streaming. Use `EventSource` or the existing SSE client pattern.
