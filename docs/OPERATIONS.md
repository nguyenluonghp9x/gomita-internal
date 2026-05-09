# GOMITA Operations Runbook

## 1) Release Checklist

- Validate environment variables from `.env.example` (including document storage: `DOCUMENT_STORAGE` local vs S3).
- If moving document blobs from local disk to S3 after pilot: run `npm run documents:migrate-s3` first with `MIGRATE_DRY_RUN=true`, then real run.
- If using Docker rollout: copy `.env.production.example` to `.env.production`, fill secrets, then run `npm run docker:prod:up`.
- If exposing by domain directly on server:
  - `APP_DOMAIN=portal.your-domain.com npm run nginx:render`
  - `npm run docker:edge:up` (Nginx :80 -> app:3000)
  - terminate TLS at Cloudflare/LB or external reverse proxy.
- Run preflight in one command:
  - `APP_BASE_URL=https://your-domain.com npm run release:preflight`
- Run DB migrations on staging and verify app boot:
  - `npm run prisma:migrate`
  - `npm run build`
  - `npm run start`
- Smoke test critical flows:
  - Login/logout
  - Document open/download permission gates
  - Policy acknowledge
  - Quotation create -> submit -> approve/reject -> status transition
- Verify health endpoint:
  - `GET /api/health` must return `status: ok` and `db: ok`.
  - `GET /api/live` must return `status: alive`.
  - `GET /api/ready` must return `status: ready`.
- Run API smoke checks:
  - `APP_BASE_URL=https://your-domain.com npm run smoke:api`
  - `APP_BASE_URL=https://your-domain.com npm run go-live:check`
  - For authenticated smoke checks, set `SMOKE_SESSION_COOKIE` with a valid session cookie.
  - Authenticated smoke now includes `/quotations/analytics`.
  - SSE `GET /api/notifications/stream` is long-lived: validate manually behind your reverse proxy buffering settings (`X-Accel-Buffering: no` header is set server-side).
- Deploy to production.
- Run post-deploy checks:
  - Open `/dashboard`
  - Check `/notifications`
  - Export one quotation PDF and one CSV.

## 2) Database Backup (PostgreSQL)

Create full backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --file "backup-$(date +%Y%m%d-%H%M).dump"
```

Create plain SQL backup:

```bash
pg_dump "$DATABASE_URL" --format=plain --file "backup-$(date +%Y%m%d-%H%M).sql"
```

Recommended:

- Keep daily backups and retain at least 14 days.
- Store backups off-server (object storage).
- Encrypt backup artifacts at rest.

## 3) Database Restore

Restore from custom dump:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" backup-YYYYMMDD-HHMM.dump
```

Restore from SQL:

```bash
psql "$DATABASE_URL" < backup-YYYYMMDD-HHMM.sql
```

After restore:

- Run `npm run prisma:generate`.
- Start app and verify `/api/health`.

## 4) Seeding Safety

- Seeding in production is blocked by default.
- To allow intentional production seed:
  - set `ALLOW_PROD_SEED=true`
  - run `npm run prisma:seed`
- Remove/disable `ALLOW_PROD_SEED` immediately after use.

## 5) Incident Quick Actions

- If DB connectivity fails:
  - inspect `/api/health` response
  - validate `DATABASE_URL`
  - verify DB network/security group
- If auth issues occur:
  - validate `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
  - verify system clock skew
- If file access issues occur:
  - if `DOCUMENT_STORAGE=local`: verify path permissions (`storage/documents/files/`)
  - if `DOCUMENT_STORAGE=s3`: verify `S3_BUCKET`, endpoint, credentials/IAM, and object key prefix (`S3_KEY_PREFIX`, default `documents/`)
  - check document permission keys in RBAC.

## 6) API Smoke Test

Command:

```bash
APP_BASE_URL=https://your-domain.com npm run smoke:api
```

Optional authenticated checks:

```bash
APP_BASE_URL=https://your-domain.com \
SMOKE_SESSION_COOKIE='next-auth.session-token=...' \
npm run smoke:api
```

What this checks:

- `/api/live` (liveness)
- `/api/ready` (readiness: env + db)
- `/api/health` (expects `status=ok`, `db=ok`)
- `/login`
- `/api/auth/providers` (credentials provider exists)
- `/dashboard` and `/quotations` when `SMOKE_SESSION_COOKIE` is provided.

## 7) Release Preflight

Run full preflight:

```bash
APP_BASE_URL=https://your-domain.com npm run release:preflight
```

Includes:

- env check
- lint
- production build
- smoke API checks

To skip smoke (for local only):

```bash
PREFLIGHT_WITH_SMOKE=false npm run release:preflight
```

Strict env check (fail when missing required vars):

```bash
ENV_CHECK_STRICT=true npm run env:check
```
