import { requirePermission } from "@/lib/auth/session";
import { getPermissionsList } from "@/server/services/admin-service";

export default async function AdminPermissionsPage() {
  await requirePermission("roles.view");
  const permissions = await getPermissionsList();

  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, item) => {
    if (!acc[item.module]) acc[item.module] = [];
    acc[item.module].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Permission Catalog</h1>

      {Object.entries(grouped).map(([module, rows]) => (
        <div key={module} className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{module}</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {(rows ?? []).map((permission) => (
              <div key={permission.id} className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {permission.key}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
