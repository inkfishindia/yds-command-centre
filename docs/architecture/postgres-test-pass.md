# Postgres Test Pass

Use this when you want to validate the new database-backed foundation locally.

## 1. Configure env

Add these values to `.env`:

- `DATABASE_URL=postgres://user:password@localhost:5432/yds_command_centre`
- `DATABASE_SSL=false`

Optional:

- `READ_MODEL_SYNC_ENABLED=true`

## 2. Run migrations

```bash
npm run db:migrate
```

Expected result:

- If `DATABASE_URL` is set and reachable, migrations apply or report the schema is current.
- If `DATABASE_URL` is missing, the command skips safely.

## 3. Start the app

```bash
npm run dev
```

## 4. Validate in the UI

Open:

1. `System Status`
2. `Overview`
3. `Dashboard`
4. `Action Queue`

Check that:

- the Database card in System Status shows `configured`
- migrations show `current`
- read-model sync still works
- projection jobs appear after `Sync All`
- Dashboard and Action Queue banners still show freshness and sync metadata

## 5. Optional CLI verification

Run:

```bash
npm run db:migrate
npm run sync:readmodels
```

Then refresh `System Status` and confirm:

- projection jobs were recorded
- read models are present
- source health updated

## Notes

- The app still falls back to JSON storage if the database is not configured.
- Postgres is currently used for migrations, read-model persistence, source health, sync runs, and projection jobs.
- Canonical domain tables are the next migration phase, not part of this test pass yet.
