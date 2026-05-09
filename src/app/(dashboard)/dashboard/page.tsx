import { requirePermission } from "@/lib/auth/session";
import { getAdminDashboardStats } from "@/server/services/admin-service";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  const stats = await getAdminDashboardStats();
  const cards = [
    { label: "Total Users", value: String(stats.totalUsers) },
    { label: "New Users (7d)", value: String(stats.newUsers) },
    { label: "Training Completion", value: `${stats.trainingCompletionRate}%` },
    { label: "Pending Quotations", value: String(stats.pendingQuotations) },
    { label: "New Documents (7d)", value: String(stats.newDocuments) },
    { label: "Pending Policy Ack", value: String(stats.pendingPolicyAcknowledgements) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Audit Activities</h2>
        <div className="mt-3 space-y-2">
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activities.</p>
          ) : (
            stats.recentAudit.map((row) => (
              <div key={row.id} className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-800">
                  {row.action} - {row.module}/{row.resource}
                </p>
                <p className="text-xs text-slate-500">
                  {row.actor?.fullName ?? "System"} | {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
