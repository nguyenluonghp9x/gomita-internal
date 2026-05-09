# GOMITA Internal - System Architecture (Phase 1)

## 1) High-level architecture

- **Frontend**: Next.js App Router, server-first rendering, client components for interactive forms.
- **Backend**: Route handlers + service layer (`src/server/services`) để gom business logic.
- **Data**: PostgreSQL + Prisma, chuẩn hóa schema theo module nghiệp vụ.
- **Security**: Auth.js, RBAC từ DB, middleware guard, audit logging.
- **Extensibility**: module-oriented folder structure, công thức báo giá lưu JSON + version.

## 2) Security model

- Authentication: credentials provider (phase 1), có thể bật 2FA ở phase tiếp theo.
- Authorization: Role -> Permission mapping trong DB, backend check bắt buộc.
- Sensitive actions bắt buộc ghi `audit_logs`.
- Session TTL 8h, HTTPS-ready.

## 3) Module boundaries

- **Auth & Users**: user profile, session, role assignment.
- **Roles & Permissions**: role_permission, user_role, policy-driven access.
- **Training**: course -> module -> lesson + quiz + progress tracking.
- **Documents**: metadata + versioning + download controls.
- **Policies**: version + acknowledgement + re-ack when version changes.
- **Quotation**: template + configurable formula + approval workflow + version history.
- **Notifications**: in-app bell + user-specific inbox.
- **Audit Logs**: immutable event stream.

## 4) Route map (phase 1 scaffold)

- `/login`
- `/dashboard/dashboard`
- `/training`
- `/documents`
- `/policies`
- `/quotations`
- `/admin`
- `/api/auth/[...nextauth]`
- `/api/health`
