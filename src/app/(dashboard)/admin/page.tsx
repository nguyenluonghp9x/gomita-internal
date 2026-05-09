import Link from "next/link";

import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";

export default async function AdminPage() {
  const user = await requirePermission("dashboard.view");

  const definitions = [
    {
      href: "/admin/users",
      title: "Users",
      desc: "Manage accounts, departments, and employee status.",
      perm: "users.view",
    },
    {
      href: "/admin/roles",
      title: "Roles",
      desc: "Manage role definitions and role-to-permission matrix.",
      perm: "roles.view",
    },
    {
      href: "/admin/permissions",
      title: "Permissions",
      desc: "View permission catalog by module.",
      perm: "permissions.view",
    },
    {
      href: "/admin/audit-logs",
      title: "Audit logs",
      desc: "Searchable event trail for compliance.",
      perm: "audit_logs.view",
    },
  ] as const;

  const items: { href: string; title: string; desc: string }[] = [];
  for (const d of definitions) {
    if (await hasPermission(user.id, d.perm)) {
      items.push({ href: d.href, title: d.title, desc: d.desc });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      {items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          You do not have access to any admin modules.{" "}
          <Link href="/dashboard" className="text-slate-900 underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300"
            >
              <h2 className="font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
