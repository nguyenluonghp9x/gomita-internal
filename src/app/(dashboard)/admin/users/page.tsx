import { requirePermission } from "@/lib/auth/session";
import { getUserFormMeta, getUsersList } from "@/server/services/admin-service";
import { CreateUserForm } from "@/app/(dashboard)/admin/users/create-user-form";

export default async function AdminUsersPage() {
  await requirePermission("users.view");
  const [users, meta] = await Promise.all([getUsersList(), getUserFormMeta()]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Users Management</h1>
      <CreateUserForm departments={meta.departments} roles={meta.roles} />

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phòng ban</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3 text-slate-600">{user.department?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {user.roles.map((ur) => ur.role.name).join(", ") || "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">{user.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
