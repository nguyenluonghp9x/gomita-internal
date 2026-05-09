# GOMITA Internal Portal

Nền tảng nội bộ cho:
- Đào tạo nội bộ
- Tài liệu nội bộ
- Quy định/quy chế
- Hỗ trợ sale tạo báo giá theo công thức chuẩn

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth credentials + Prisma adapter + **JWT sessions** for Edge middleware compatibility)
- RBAC (roles + permissions động từ DB)
- Zod + React Hook Form
- Pino logging + Audit log table

## Kiến trúc module

- `src/app/(auth)` - đăng nhập
- `src/app/(dashboard)` - dashboard và module nghiệp vụ
- `src/lib/auth` - xác thực
- `src/lib/rbac` - kiểm tra quyền
- `src/lib/audit` - ghi audit logs
- `prisma/schema.prisma` - dữ liệu lõi toàn hệ thống
- `prisma/seed.ts` - seed role/permission/admin + demo data

## Setup local

1) Cài dependencies
```bash
npm install
```

2) Tạo file môi trường
```bash
cp .env.example .env
```

3) Chạy migrate + generate Prisma client
```bash
npm run prisma:migrate
npm run prisma:generate
```

4) Seed dữ liệu demo
```bash
npm run prisma:seed
```

> Note: production seed bị chặn mặc định. Chỉ bật khi chủ đích với `ALLOW_PROD_SEED=true`.

5) Chạy ứng dụng
```bash
npm run dev
```

## Tài khoản mặc định

- Email: `admin@gomita.local`
- Password: `Admin@123456`

## Training (đào tạo)

- `/training` — catalog, tiến độ của bạn, danh sách quản trị (nếu có quyền `training.create`)
- `/training/courses/new` — tạo khóa học (`training.create`)
- `/training/courses/[courseId]` — curriculum, publish/unpublish, thêm module/bài, bắt đầu học
- `/training/lessons/[lessonId]` — xem bài + đánh dấu hoàn thành (cần đã enroll khóa đã publish)
- `/training/quizzes/[quizId]/edit` — thêm câu hỏi (MC + essay), `training.create`
- `/training/quizzes/[quizId]/take` — làm bài, chấm tự động, giới hạn lần thi; khóa publish yêu cầu đã enroll
- **Giao khóa**: trên trang chi tiết khóa (quyền `training.create`) tạo assignment theo User / Role / Department / `positionCode` + hạn; gửi **notification** `TRAINING_ASSIGNED`; trang `/training` hiển thị **Assigned to you**

## Documents (tài liệu)

- Lưu trữ blob: mặc định **local** tại `storage/documents/files/` (đã gitignore). Production có thể bật **S3-compatible** bằng `DOCUMENT_STORAGE=s3` và biến S3 trong `.env.example` (bucket riêng, không public; app vẫn stream qua `/api/documents/versions/[versionId]/file`).
- Nếu đã pilot local và muốn đưa dữ liệu lên S3: `npm run documents:migrate-s3` (hỗ trợ `MIGRATE_DRY_RUN=true`).
- `/documents` — danh sách đã publish, tìm kiếm; form upload nếu có `documents.create`.
- `/documents/[documentId]` — xem, PDF embed, **upload thêm phiên bản (v2+)** nếu có `documents.update` hoặc `documents.create`, lịch sử kèm change summary.
- `/api/documents/versions/[versionId]/file` — **không** public: cần đăng nhập, `documents.view` để xem; `documents.download` + cờ `isDownloadable` để tải. Tài liệu **sensitive**: audit `VIEW_SENSITIVE_DOC` khi xem inline; audit `DOWNLOAD_DOC` khi tải.
- Giới hạn dung lượng: `DOCUMENT_MAX_UPLOAD_BYTES` (mặc định 25MB). Kiểu file: PDF, ảnh PNG/JPEG/WebP, TXT, DOCX.

## Notifications (thông báo)

- `/notifications` — danh sách, **Mark read** / **Mark all read** (quyền `notifications.view`).
- Thanh layout: badge + **Messages**: số tin **realtime nhẹ** qua SSE `GET /api/notifications/stream` (poll DB trong khoảng `NOTIFICATION_SSE_POLL_MS`; với serverless/ngắt kết nối sớm, dùng host container/VM hoặc chấp nhận reload).

## Quotations (báo giá)

- `/quotations`:
  - lọc theo status/owner/khoảng ngày
  - preset nhanh: 7 ngày, 30 ngày, quý hiện tại
  - phân trang server-side
  - pipeline KPI + health KPI
  - `/quotations/analytics` — xu hướng theo tuần (tạo mới vs WON/LOST từ audit), cohort theo `projectType`, bảng owner thắng nhiều nhất
  - analytics có export CSV: `/api/quotations/analytics/export-csv` theo đúng bộ lọc hiện tại
  - export CSV theo đúng bộ lọc hiện tại (quyền `quotations.export`)
- `/quotations/[quotationId]`:
  - phê duyệt giảm giá
  - workflow thương mại (`SENT`, `NEGOTIATING`, `WON`, `LOST`)
  - approval history + status timeline
  - export PDF (quyền `quotations.export`; watermark đường chéo có thể bật theo env xem phần `.env.example`)

## Lưu ý bảo mật production

- Bật HTTPS tại reverse proxy/load balancer
- Đặt `NEXTAUTH_SECRET` mạnh và xoay định kỳ
- Rate limit đăng nhập: mặc định in-memory theo email; production nên bật **Upstash Redis** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) để phân tán
- `SESSION_MAX_AGE_SECONDS` / `SESSION_UPDATE_AGE_SECONDS`: thời gian phiên và làm mới sliding (xem `.env.example`)
- Sau đăng nhập thành công ghi **audit** `LOGIN`
- Thắt chặt bucket policy/CORS và rotate key nếu dùng R2/S3 credential tĩnh

## Vận hành

- Runbook triển khai/backup/restore: `docs/OPERATIONS.md`
- Project handover and go-live checklist: `docs/PROJECT_HANDOVER.md`
- Namecheap pre-domain go-live path: `docs/GO_LIVE_NAMECHEAP.md`
- Docker production quickstart:
  - `cp .env.production.example .env.production` và điền secret thật
  - `npm run docker:prod:up`
  - `APP_BASE_URL=https://your-domain.com npm run go-live:check`
- Docker + Nginx reverse proxy (port 80):
  - `APP_DOMAIN=portal.your-domain.com npm run nginx:render`
  - `npm run docker:edge:up`
  - DNS A record trỏ về server; TLS có thể terminate ở Cloudflare/LB hoặc bạn gắn thêm cert tại reverse proxy ngoài.
- Env check: `npm run env:check` (strict mode: `ENV_CHECK_STRICT=true npm run env:check`)
- API smoke test sau deploy: `APP_BASE_URL=https://your-domain.com npm run smoke:api`
- Preflight trước release: `APP_BASE_URL=https://your-domain.com npm run release:preflight`
- CI workflow: `.github/workflows/ci.yml` (lint, build, smoke API local)
- Health endpoints:
  - `/api/live` (liveness)
  - `/api/ready` (readiness: env + db)
  - `/api/health` (service + db status)
