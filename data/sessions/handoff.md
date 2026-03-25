# Session Handoff — Command Centre

## Last Session
- 2026-03-26 03:06 IST

## Current State
- **Deployed live** at yds-command-centre.vercel.app (private, password-gated)
- GitHub repo: inkfishindia/yds-command-centre (private)
- Vercel auto-deploys on every push to main
- Server status: local dev working on port 3000
- All 690 tests passing, lint clean

## What Was Built This Session
- Auth gate middleware (ACCESS_PASSWORD env var, cookie-based)
- Vercel deployment config (vercel.json, module.exports for serverless)
- CORS simplified — password gate handles access control
- Google Sheets auth supports inline JSON (for Vercel, no file path)
- CEO dashboard — new route, service, test, dedicated /ceo page
- 7-panel dashboard architecture spec saved as roadmap

## Key Decisions
- Deploy to Vercel free tier (serverless); may migrate to Render for better perf
- No Claude chat on live site — dashboard only, notes/lists for Colin to pick up
- Password gate is the primary access control (no CORS whitelist needed)
- Simplified CORS to `cors()` since auth gate protects all routes
- Keep Google Sheets as short-term source of truth
- Use service-account auth for Sheets, not browser OAuth

## Open Issues
- Vercel cold starts make the app slow (~2-5s per request)
- `STRATEGY_SPREADSHEET_ID` still pending verification
- Legacy CRM pipeline parser may mismatch current LEAD_FLOWS values
- GitHub repo is PUBLIC — should be switched to private

## Env Vars on Vercel
- ACCESS_PASSWORD, NOTION_TOKEN, NODE_ENV=production
- All SPREADSHEET_IDs, GOOGLE_SERVICE_ACCOUNT_KEY (inline JSON)
- No ANTHROPIC_API_KEY (chat disabled on live site)

## Next Steps
- Consider migrating from Vercel to Render for always-on server (no cold starts)
- Build Panel 1 (Pulse Bar) and Panel 5 (Strategic Layer) from 7-panel spec
- Verify all Google Sheets are shared with service account email
- Revoke exposed tokens (GitHub PATs, Notion, Google SA key, Vercel token)
