# MCC Setup Guide

## 1. Create Notion Databases

Create three databases in Notion:

### A. MCC Posts (main database)

| Property | Type | Options/Notes |
|----------|------|---------------|
| Title | title | Internal label |
| Body | rich_text | Post caption |
| Platforms | multi_select | instagram, linkedin |
| Status | select | draft, scheduled, awaiting-approval, publishing, published, failed |
| Scheduled For | date | Future publish date |
| Media URLs | rich_text | JSON array of URLs |
| Owner | people | Assignee |
| Brand | select | YDS, Colin, etc. |
| Published At | date | Set on successful publish |
| Platform Post IDs | rich_text | JSON: `{"instagram":"...", "linkedin":"..."}` |
| Failure Reason | rich_text | Error message on failure |

### B. Instagram Tokens (OAuth storage)

| Property | Type | Notes |
|----------|------|-------|
| Platform | select | instagram (only) |
| Access Token | rich_text | Encrypted token |
| Refresh Token | rich_text | Encrypted refresh token |
| Expires At | date | Token expiration |
| Owner | people | User |

### C. LinkedIn Tokens (OAuth storage)

| Property | Type | Notes |
|----------|------|-------|
| Platform | select | linkedin (only) |
| Access Token | rich_text | Encrypted token |
| Refresh Token | rich_text | Encrypted refresh token |
| Expires At | date | Token expiration |
| Owner | people | User |

---

## 2. Register DB IDs

After creating databases, paste the IDs into:

1. **MCC Posts DB ID** → `server/services/mcc/read-model.js` (line 8)
   ```javascript
   const MCC_POSTS_DB_ID = 'your-post-db-id';
   ```

2. **Token DB IDs** → `server/services/mcc/publisher.js` (when implementing token storage)

---

## 3. Environment Variables

Add to `.env`:

```bash
# MCC Database ID
MCC_POSTS_DB_ID=your-notion-db-id-here

# Instagram OAuth (get from Meta Developer Portal)
INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret

# LinkedIn OAuth (get from LinkedIn Developer Portal)
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Token encryption key (generate: openssl rand -hex 32)
SOCIAL_TOKEN_KEY=your-32-char-hex-key
```

### Getting OAuth Credentials

**Instagram (Meta):**
1. Go to https://developers.facebook.com
2. Create app → Add Instagram product
3. Get App ID and App Secret
4. Add redirect URI: `http://localhost:3000/api/mcc/oauth/instagram/callback`

**LinkedIn:**
1. Go to https://developer.linkedin.com
2. Create app
3. Get Client ID and Client Secret
4. Add redirect URI: `http://localhost:3000/api/mcc/oauth/linkedin/callback`

---

## 4. Update notion-hub.md

Add new databases to `.claude/docs/notion-hub.md`:

```markdown
| MCC Posts | YOUR_DB_ID | ... | Social post management |
| Instagram Tokens | YOUR_DB_ID | ... | IG OAuth tokens |
| LinkedIn Tokens | YOUR_DB_ID | ... | LinkedIn OAuth tokens |
```

---

## 5. Verify Setup

```bash
# Test API endpoints
curl http://localhost:3000/api/mcc/platforms
# Should return: [{"id":"instagram","name":"Instagram"},{"id":"linkedin","name":"LinkedIn"}]

curl http://localhost:3000/api/mcc/status
# Should return status counts (empty if no posts yet)
```

---

## 6. Production Notes

For production deployment (Vercel):
- Update OAuth redirect URIs to include production URL
- Set env vars in Vercel dashboard
- OAuth callback: `https://yds-command-centre.vercel.app/api/mcc/oauth/{platform}/callback`