import { requirePermission } from "@/lib/auth/session";
import { getRolesList } from "@/server/services/admin-service";

export default async function AdminRolesPage() {
  await requirePermission("roles.view");
  const roles = await getRolesList();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Roles & Permissions</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{role.name}</h2>
            <p className="mt-1 text-xs text-slate-500">Code: {role.code}</p>
            <p className="mt-2 text-sm text-slate-600">Users: {role.users.length}</p>
            <p className="text-sm text-slate-600">Permissions: {role.permissions.length}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {role.permissions.slice(0, 10).map((rp) => (
                <span
                  key={rp.id}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  {rp.permission.key}
                </span>
              ))}
              {role.permissions.length > 10 ? (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  +{role.permissions.length - 10} more
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
