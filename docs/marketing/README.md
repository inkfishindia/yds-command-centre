# Marketing — docs index

This folder is the marketing layer of Command Centre. Two things live here:

1. **Notion system map** ([NOTION-SETUP.md](./NOTION-SETUP.md)) — every marketing DB, ID, schema, formula, relation, and automation needed to wire the marketing layer. **Start here** if you're wiring something Notion-related.

2. **MCC (Marketing Content Center)** in [mcc/](./mcc/) — the social-posting backend (Instagram + LinkedIn). Already wired in Phase 1. Self-contained code path with its own DB and env var.

## Pick the right doc

| You want to… | Go to |
|---|---|
| Understand all marketing DBs (IG, content, campaigns, decisions, etc.) | [NOTION-SETUP.md](./NOTION-SETUP.md) |
| Wire automation between Notion and command-centre | [NOTION-SETUP.md § Automations](./NOTION-SETUP.md#6-required-automations-6) |
| Add a new env var for a marketing DB | [NOTION-SETUP.md § Env Vars](./NOTION-SETUP.md#7-env-vars-to-add) |
| Set up MCC Posts DB (social-posting backend) | [mcc/POSTS-DB.md](./mcc/POSTS-DB.md) |
| Understand MCC architecture / API | [mcc/ARCHITECTURE.md](./mcc/ARCHITECTURE.md), [mcc/API.md](./mcc/API.md) |
| Use the MCC UI | [mcc/USER_GUIDE.md](./mcc/USER_GUIDE.md) |

## MCC Phase status

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| Post CRUD | ✅ | | |
| Status pipeline | ✅ | | |
| Schedule post | ✅ | | |
| Manual publish (approval) | ✅ | | |
| OAuth flow | ✅ (stub) | | |
| Media validation | ✅ | | |
| Real cron scheduler | | ❌ | |
| Analytics | | ❌ | |
| Media upload | | | ❌ |
