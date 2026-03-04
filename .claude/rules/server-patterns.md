---
paths:
  - "server/**/*.js"
  - "server.js"
---

# Server Patterns

- CommonJS only: `require()`/`module.exports`. No ES modules, no `import`/`export`.
- All Notion API calls go through `server/services/notion.js` — never call the Notion SDK directly. 5-min cache is built in. To clear stale data: `POST /api/notion/cache/clear`.
- SSE event types: `text`, `tool_use`, `approval`, `error`, `done`. Do not add new types without updating the Alpine.js handler in `public/js/app.js`.
- Write operations (Notion create/update, file writes) MUST go through the approval gate in `server/services/approval.js`. Add write tools to the write tools Set. Never bypass.
- Agent loop in `server/services/agent.js`: Claude responds → check for tool calls → execute or request approval → feed results back → repeat until no tool calls. Do not break this loop pattern.

## File Placement
- Route handlers → `server/routes/`
- Business logic → `server/services/`
- Tool definitions and schemas → `server/tools/`
- New tool: define schema in `notion-tools.js` or `file-tools.js`, add execution in `tool-handler.js`, add to write tools Set if it writes.

## Error Handling
- Wrap every async handler: `try/catch`, log the error, return `{ error: message }` with appropriate HTTP status.
- Never let an unhandled promise rejection crash the SSE stream.
