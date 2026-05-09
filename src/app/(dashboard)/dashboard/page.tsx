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
    <div className="space-y-5">
      <div className="app-card bg-gradient-to-r from-[#20344c] to-[#2b4562] p-5 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/70">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold">Tong quan he thong GOMITA</h1>
        <p className="mt-1 text-sm text-white/80">Theo doi nhanh nhan su, dao tao, tai lieu va bao gia.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="app-card p-4">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[#20344c]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="app-card p-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Audit Activities</h2>
        <div className="mt-3 space-y-2">
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activities.</p>
          ) : (
            stats.recentAudit.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm">
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
