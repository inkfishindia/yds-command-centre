# MCC Notion + Infrastructure Setup

Authoritative setup for the Marketing Content Center backend. Replaces SETUP.md §1-2 (which has a bug — see [docs review notes in handoff](../../../data/sessions/handoff.md)).

## What this gets you

| Capability | Phase 1 (today) | Phase 2 (later) |
|---|---|---|
| Create / edit / delete drafts | ✅ real Notion writes | — |
| Schedule posts (status pipeline) | ✅ real Notion writes | — |
| Approval gate on writes | ✅ real (SSE) | — |
| Connect Instagram / LinkedIn | ❌ stubbed — Connect button hits Meta/LI but tokens never persist | needs Phase 2 |
| Actually publish to IG / LinkedIn | ❌ stubbed — `provider.post()` returns a fake ID, no HTTP call | needs Phase 2 |

**Bottom line:** for Phase 1 you only need step 1 (MCC Posts DB) and step 2 (one env var). The rest is forward-looking — set it up now if you want, but the code paths that consume it don't exist yet.

---

## 1. Create the MCC Posts database (REQUIRED for Phase 1)

Create a single Notion database. Name it whatever you want (the code finds it by ID, not name). Property names below are **case-sensitive and space-sensitive** — they must match exactly because the code reads/writes by string property name.

| Property name | Type | Options / notes | Used by |
|---|---|---|---|
| **Title** | Title | (Notion's default; just rename whatever the title col is called) | Internal label — read at [read-model.js:57](../../../server/services/mcc/read-model.js#L57), written at [drafter.js:30](../../../server/services/mcc/drafter.js#L30) |
| **Body** | Text (rich_text) | Free text. Will hold the actual post caption | drafter.js:31 / read-model.js:58 |
| **Platforms** | Multi-select | Add two options: `instagram`, `linkedin` (lowercase, no display name needed) | drafter.js:32 / read-model.js:59 |
| **Status** | Select | Add **exactly six** options in this order: `draft`, `scheduled`, `awaiting-approval`, `publishing`, `published`, `failed` | drafter.js:118 / read-model.js:60 — invalid status throws |
| **Scheduled For** | Date | Date + time enabled. Future date when post should publish | scheduler.js:35 / read-model.js:61 |
| **Media URLs** | Text (rich_text) | Stores a JSON array of URL strings (e.g. `["https://...", "https://..."]`). Code stringifies/parses — don't try to use Notion's URL or Files property here | drafter.js:35 / read-model.js:62 (`parseMediaUrls`) |
| **Owner** | Person | Optional. Notion person field. Code writes empty `[]` when no owner | drafter.js:41 / read-model.js:63 |
| **Brand** | Select | Add options as needed: `YDS`, `Colin`, etc. | drafter.js:34 / read-model.js:64 |
| **Published At** | Date | Set automatically on successful publish (don't pre-fill) | drafter.js:140 / read-model.js:65 |
| **Platform Post IDs** | Text (rich_text) | Stores a JSON object `{"instagram":"...", "linkedin":"..."}` after publish. Set automatically | drafter.js:139 / read-model.js:66 (`parsePlatformPostIds`) |
| **Failure Reason** | Text (rich_text) | Set automatically on failed publish | drafter.js:154 / read-model.js:67 |

**Two gotchas:**

1. **Status select must include every status verbatim** — `awaiting-approval` (with the hyphen), not `Awaiting Approval`. The code at [drafter.js:118](../../../server/services/mcc/drafter.js#L118) validates against this exact list and throws on mismatch.
2. **Media URLs is a Text field, not a URL or Files field** — the code stores a JSON-stringified array in a single rich_text cell. Don't be tempted to upgrade the schema; the read path expects a JSON string.

### Get the DB ID

Once created, share the database with your Notion integration (the same one configured at `NOTION_TOKEN`). Then copy the database ID:

- Open the DB as a full page in Notion
- URL looks like `https://notion.so/yourworkspace/abc123def456...?v=...`
- The DB ID is the 32-char hex segment between the slash and the `?v=` (drop dashes if present)

---

## 2. Add the env var (REQUIRED for Phase 1)

Add **one line** to `.env`:

```
MCC_POSTS_DB_ID=abc123def456...
```

That's it. The code at [server/services/mcc/read-model.js:13](../../../server/services/mcc/read-model.js#L13) and [drafter.js:11](../../../server/services/mcc/drafter.js#L11) reads from this env var.

> **Do not** edit `read-model.js` directly. The current SETUP.md says to hardcode the ID at line 8 — that's wrong and out of date. Env var is the only path.

Restart the dev server (`npm run dev`) after editing `.env`.

### Verify

```bash
curl http://localhost:3000/api/mcc/status
# Expect: {"draft":0,"scheduled":0,"awaiting-approval":0,"publishing":0,"published":0,"failed":0}

curl http://localhost:3000/api/mcc/posts
# Expect: [] (or list of posts you've created)
```

If you get a Notion 404 in the server logs, the integration probably can't see the DB — re-share it with the integration in Notion's `…` → `Add connections`.

---

## 3. Update notion-hub.md (REQUIRED — agent discovery)

`AGENT_PRIMER.md` is auto-regenerated from `.claude/docs/notion-hub.md`. If you don't add the new DB there, agents won't know it exists when they triage future MCC work.

Append a row to the table in `.claude/docs/notion-hub.md`:

```markdown
| MCC Posts | YOUR_DB_ID_HERE | Title, Body, Platforms, Status, Scheduled For, Media URLs, Owner, Brand, Published At, Platform Post IDs, Failure Reason | Marketing Content Center — social post pipeline |
```

Match the column shape of existing rows. After editing, run `npm run agent-primer` (or `npm run build`) to regenerate AGENT_PRIMER.

---

## 4. Phase 2 — Token storage DBs (OPTIONAL, NOT YET WIRED)

> **No code currently reads or writes these.** The schemas below come from SETUP.md but [publisher.js:30 `getToken()`](../../../server/services/mcc/publisher.js#L30) and [publisher.js:50 `storeToken()`](../../../server/services/mcc/publisher.js#L50) are TODO stubs. Creating these DBs today is a no-op until Phase 2 ships the token-storage code path. Skip unless you're doing the Phase 2 work.

### 4a. Instagram Tokens DB

| Property | Type | Notes |
|---|---|---|
| Platform | Select | One option: `instagram` |
| Access Token | Text | **Encrypted** (AES-GCM with `SOCIAL_TOKEN_KEY`) — never store plaintext |
| Refresh Token | Text | Encrypted same way |
| Expires At | Date | UTC timestamp |
| Owner | Person | Whose account |

### 4b. LinkedIn Tokens DB

Identical structure, with Platform option `linkedin`.

When Phase 2 is built, add to `.env`:

```
INSTAGRAM_TOKENS_DB_ID=...
LINKEDIN_TOKENS_DB_ID=...
SOCIAL_TOKEN_KEY=<32-byte hex>   # generate: openssl rand -hex 32
```

---

## 5. Phase 2 — OAuth credentials (OPTIONAL, NOT YET WIRED)

> Same caveat: even with these set, the OAuth callback at [server/routes/mcc.js:277](../../../server/routes/mcc.js#L277) calls `provider.exchangeCodeForToken()` which is a stub at [instagram.js:51](../../../server/services/social/instagram.js#L51) — returns a placeholder, doesn't hit Meta. So setting these makes the "Invalid app ID" error go away (the Connect dialog will load Meta's consent screen) but Connect still won't actually persist a token.

### 5a. Meta (Instagram Graph API)

1. https://developers.facebook.com → Create App → Business → Add Instagram product
2. Add an Instagram Business Account (must be linked to a Facebook Page)
3. App Settings → Basic — copy `App ID` and `App Secret`
4. Add OAuth redirect URI:
   - Dev: `http://localhost:3000/api/mcc/oauth/instagram/callback`
   - Prod: `https://yds-command-centre.vercel.app/api/mcc/oauth/instagram/callback`

Add to `.env`:
```
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
```

### 5b. LinkedIn

1. https://developer.linkedin.com → Create App
2. Request `r_liteprofile`, `r_emailaddress`, `w_member_social` scopes
3. Auth tab — copy `Client ID` and `Client Secret`
4. Add OAuth redirect URI (same paths as Meta with `/linkedin/` instead)

Add to `.env`:
```
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
```

---

## 6. Production (Vercel) deployment

When deploying:

| Var | Source | Required for |
|---|---|---|
| `MCC_POSTS_DB_ID` | step 2 | Phase 1 — required |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | step 5a | Phase 2 — skip in P1 |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | step 5b | Phase 2 — skip in P1 |
| `SOCIAL_TOKEN_KEY` | `openssl rand -hex 32` | Phase 2 — skip in P1 |
| `INSTAGRAM_TOKENS_DB_ID`, `LINKEDIN_TOKENS_DB_ID` | step 4 | Phase 2 — skip in P1 |

OAuth redirect URIs in Meta + LinkedIn must include the Vercel production URL.

---

## 7. Phase 1 setup checklist

Minimum viable setup (skip everything Phase 2):

- [ ] Created MCC Posts DB with all 11 properties (case-sensitive)
- [ ] All 6 Status options exist verbatim (with hyphens)
- [ ] Both Platform options exist (lowercase `instagram`, `linkedin`)
- [ ] Shared the DB with the Notion integration (connections menu)
- [ ] Added `MCC_POSTS_DB_ID=...` to `.env`
- [ ] Restarted dev server
- [ ] `curl /api/mcc/status` returns six zero counts (or post counts if you've added rows)
- [ ] Appended row to `.claude/docs/notion-hub.md`
- [ ] Ran `npm run build` to regenerate AGENT_PRIMER.md
- [ ] Hard-refreshed `/mcc` in browser — kanban renders, "+ New Post" works, draft saves to Notion

If all eight pass, Phase 1 is fully wired. Click "+ New Post", create a draft, refresh — it should appear in the Draft column. The OAuth bar at top will show both platforms as "Not connected" — that's expected until Phase 2.
