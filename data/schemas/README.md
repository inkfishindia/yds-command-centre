# API Sample Schemas

Concrete JSON shapes from the live APIs the Command Centre services call.
Agents read these before writing new parsing logic, instead of guessing at
Notion/Sheets/GitHub response shapes.

## Files

| File | Source |
|---|---|
| `notion-query-database.json` | `server/services/notion.js` → `queryDatabase()` |
| `sheets-fetch-sheet.json` | `server/services/sheets.js` → `fetchSheet()` |
| `github-repo-activity.json` | `server/services/github.js` → `getRepoActivity()` |

Each sample has `_capturedAt`, `_source`, and `sample`. Arrays are trimmed to
the first 2 items.

## Regenerate

```bash
node scripts/capture-schemas.js
```

Needs `.env` with `NOTION_TOKEN` (+ optionally `GOOGLE_SERVICE_ACCOUNT_KEY`,
`GOOGLE_SHEETS_ID`, `GITHUB_TOKEN`). Missing creds → that capture is skipped,
not fatal.

## Privacy

The JSON files contain live workspace data (page titles, row values, PR text)
and are **gitignored**. This README and the rule file are the only tracked
artifacts. If you want to share a shape with a third party, redact first.
