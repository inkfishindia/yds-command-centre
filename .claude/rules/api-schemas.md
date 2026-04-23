# API Schema Samples

Before writing new parsing logic against Notion, Sheets, or GitHub — read the
matching sample in `data/schemas/` first. These are real captured responses
(arrays trimmed) and are the source of truth for shape.

| Writing code against… | Read first |
|---|---|
| Notion database query result | `data/schemas/notion-query-database.json` |
| Google Sheets registry read | `data/schemas/sheets-fetch-sheet.json` |
| GitHub repo activity | `data/schemas/github-repo-activity.json` |

## Rules

1. **Do not guess shapes.** If you're about to write `result.properties.X.rich_text[0].plain_text` without checking, stop and Read the sample.
2. **If the sample is missing**, run `node scripts/capture-schemas.js` to capture one before writing the parser. Do not invent a shape from memory or `notion-hub.md` alone.
3. **Use the simplified helpers when they exist.** `notion.js` has a `simplify()` helper that flattens Notion property objects. Prefer it over re-implementing property parsing.
4. **Do not commit captured samples.** They contain live data and are gitignored. Only the rule file and `data/schemas/README.md` are tracked.
