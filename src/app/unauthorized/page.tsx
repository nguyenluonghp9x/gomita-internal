import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-600">
          Bạn không có quyền truy cập tính năng này. Vui lòng liên hệ Admin nếu cần cấp quyền.
        </p>
        <Link
          href="/dashboard/dashboard"
          className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Quay lại dashboard
        </Link>
      </div>
    </div>
  );
}
