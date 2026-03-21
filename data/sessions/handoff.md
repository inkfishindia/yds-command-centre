# Session Handoff — Command Centre

## Last Session
- 2026-03-21 00:29 IST

## Current State
- Server status: local dev server restarted during session; port `3000` confirmed listening
- Active features:
  - Google Sheets env wired locally for confirmed workbooks
  - Business Model Canvas redesigned into a hybrid executive canvas
- Open bugs:
  - `STRATEGY_SPREADSHEET_ID` intentionally left pending final verification
  - Legacy CRM pipeline parser likely still mismatches current `LEAD_FLOWS` value conventions

## Key Decisions
- Only map spreadsheet IDs when evidence is exact; do not guess strategy wiring.
- Keep Google Sheets as the short-term source of truth instead of migrating immediately.
- Use service-account auth for Sheets; current backend does not actively use browser Google OAuth for sheet access.
- Redesign BMC as a hybrid executive canvas: classic BMC structure + modern dashboard hierarchy + edit-ready detail drawer.

## Confirmed Local Sheets Wiring
- `GOOGLE_SERVICE_ACCOUNT_KEY` points at `Zreference/gen-lang-client-0910892311-9c5f454b53f7.json`
- `GOOGLE_SHEETS_ID` → legacy CRM pipeline workbook (`CRM - Core`, `LEAD_FLOWS`)
- `EXECUTION_SPREADSHEET_ID` → execution workbook
- `APP_LOGGING_SPREADSHEET_ID` → `YD - App`
- `BMC_SPREADSHEET_ID` → `YDC - Business model canvas`

## Next Steps
- Share the confirmed Google Sheets with service account `155749101771-compute@developer.gserviceaccount.com` if not already shared.
- Final-verify `STRATEGY_SPREADSHEET_ID` only when exact tab-name alignment is proven.
- Refresh and visually review the BMC page in-browser; latest code includes hero summary, richer section cards, and improved page-level scrolling.
- If CRM pipeline data loads but looks wrong, update `server/services/sheets.js#getPipelineData()` to match current `LEAD_FLOWS` schema and values.
