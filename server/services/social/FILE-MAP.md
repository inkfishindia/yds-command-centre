# Social Provider Layer - File Map

## Purpose
Implements social platform integrations (Instagram, LinkedIn) for the Marketing Content Center. Each provider is a pure module implementing the social-provider-interface contract.

## Architecture

```
server/services/social/
├── index.js                     # Public exports, provider registry
├── social-provider-interface.js # JSDoc-typed contract (documentation only)
├── instagram.js                 # Instagram Graph API implementation
├── linkedin.js                  # LinkedIn Marketing API implementation
├── media-constraints.json       # Per-platform validation rules
├── validate-media.js            # Pure validation function
└── FILE-MAP.md                  # This file
```

## Dependencies

- **External**: None (pure JS, no SDK dependencies)
- **Internal**: None (standalone module)
- **Env vars**: 
  - `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`
  - `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

## Interface Contract

Each provider exports:

| Function | Returns | Description |
|----------|---------|-------------|
| `getProviderInfo()` | `{id, name}` | Provider metadata |
| `login(redirectUri)` | `{authUrl, state}` | Generate OAuth URL |
| `exchangeCodeForToken(code, redirectUri)` | `{accessToken, refreshToken, expiresAt}` | Exchange OAuth code |
| `refreshToken(refreshToken)` | `{accessToken, expiresAt}` | Refresh expired token |
| `post(accessToken, payload)` | `{platformPostId, url}` | Publish post |
| `getAnalytics(accessToken, postId)` | `{likes, comments, shares, views}` | Get post analytics (stub in P1) |

## Phase Status

| Phase | Instagram | LinkedIn |
|-------|-----------|----------|
| P1 | OAuth flow + stub post | OAuth flow + stub post |
| P2 | Real API integration | Real API integration |
| P3 | Analytics + media upload | Analytics + media upload |

## Notion DBs (to be created)

- **Instagram Tokens** DB: Store encrypted OAuth tokens
- **LinkedIn Tokens** DB: Store encrypted OAuth tokens

## Notes

- Providers are pure modules - no classes, no inheritance
- Token storage uses encryption via `crypto` module with key from `SOCIAL_TOKEN_KEY` env
- Media validation uses `media-constraints.json` - concept borrowed from postiz, values are our own
- Phase 1 posting is simulated - real API calls require OAuth credentials in env