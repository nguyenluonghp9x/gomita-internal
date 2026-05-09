# PROJECT HANDOVER - GOMITA Internal Portal

## 1) Current Delivery Status

The system is ready for controlled production rollout with the following delivered areas:

- Authentication with credentials + JWT sessions.
- RBAC with role/permission mapping from database.
- Dashboard with operational stats.
- Training module (course, lesson, quiz, assignment, progress).
- Documents module (upload, versioning, secure file endpoint, sensitive access audit).
- Policies module (draft/publish, acknowledgement, pending tracking).
- Notifications module (unread counters, mark read/all read; sidebar badge updates via SSE `/api/notifications/stream`).
- Quotations module:
  - create/edit draft with line items
  - discount approval workflow
  - commercial status lifecycle
  - timeline and approval history
  - PDF export and CSV export
  - owner/date/status filtering, server-side pagination, KPI cards, `/quotations/analytics` (weekly trend, cohort, leaderboard).
- Audit logs page for admins.
- Operational scripts:
  - `env:check`
  - `smoke:api`
  - `go-live:check`
  - `release:preflight`
- Docker production bundle:
  - `Dockerfile`
  - `docker-compose.prod.yml`
  - `.env.production.example`
- CI workflow for lint/build/smoke.

## 2) Ready-to-Run Commands

Local setup:

```bash
npm install
npm run prisma:migrate
npm run prisma:generate
npm run prisma:seed
npm run dev
```

Pre-release checks:

```bash
ENV_CHECK_STRICT=true npm run env:check
APP_BASE_URL=https://your-domain.com npm run smoke:api
APP_BASE_URL=https://your-domain.com npm run release:preflight
```

## 3) Go-Live Checklist

- Fill production env vars and secrets.
- Confirm DB migration plan and rollback plan.
- Run preflight against staging.
- Validate health endpoint `/api/health` is `status=ok` and `db=ok`.
- Smoke test critical paths:
  - login + dashboard
  - documents access rules
  - policy acknowledgement
  - quotation create -> submit -> approve/reject -> status transition
  - quotation PDF and CSV export
- Deploy and rerun smoke checks.

## 4) Security and Ops Notes

- Seed is production-protected by default:
  - must set `ALLOW_PROD_SEED=true` intentionally to run seed in production.
- Login rate-limit can use Upstash for distributed enforcement.
- Sensitive document read/download is audited.
- Health endpoint includes DB connectivity check.
- Runbook is available at `docs/OPERATIONS.md`.

## 5) Known Non-Blocking Follow-ups

- Document storage supports S3-compatible private buckets (`DOCUMENT_STORAGE=s3`); local-to-S3 migration script is available (`npm run documents:migrate-s3`). Tighten bucket IAM/policy before production.
- Extend quotation PDF watermark (`QUOTATION_PDF_WATERMARK*`) to other exports if regulatory scope grows.
- SSE `/api/notifications/stream` pushes unread deltas (polling); replace with push bus (Redis/etc.) only if footprint grows.
- Extend quote analytics `/quotations/analytics` beyond current CSV export if leadership needs saved views / scheduled reports.
- Proxy auth gate now uses `src/proxy.ts` (`proxy` export); keep matcher aligned with any new public API routes.

## 6) Ownership and Next Actions

Recommended immediate owner actions:

1. Provision production environment and secrets.
2. Execute `release:preflight` against staging/prod URL.
3. Perform controlled pilot rollout for selected internal users.
4. Monitor audit logs and health endpoint for first 72 hours.
5. Collect user feedback for phase-2 prioritization.
