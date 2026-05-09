import Link from "next/link";

import { requirePermission } from "@/lib/auth/session";
import { DEMO_NEWS_POSTS } from "@/lib/demo/news";
import { getAdminDashboardStats } from "@/server/services/admin-service";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  const stats = await getAdminDashboardStats();
  const cards = [
    { label: "Total users", value: String(stats.totalUsers), tone: "text-[#20344c]" },
    { label: "New users (7d)", value: String(stats.newUsers), tone: "text-[#20344c]" },
    { label: "Training completion", value: `${stats.trainingCompletionRate}%`, tone: "text-[#20344c]" },
    { label: "Pending quotations", value: String(stats.pendingQuotations), tone: "text-[#20344c]" },
    { label: "New documents (7d)", value: String(stats.newDocuments), tone: "text-[#20344c]" },
    {
      label: "Pending policy ack",
      value: String(stats.pendingPolicyAcknowledgements),
      tone: "text-[#a46f2a]",
    },
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
            <p className={`mt-2 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="app-card p-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Audit Activities</h2>
          <div className="mt-3 space-y-2">
            {stats.recentAudit.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activities.</p>
            ) : (
              stats.recentAudit.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm"
                >
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

        <div className="app-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Featured internal posts</h2>
            <Link href="/news" className="text-sm font-medium text-[#20344c] hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {DEMO_NEWS_POSTS.slice(0, 3).map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-[#c7d6e6]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#20344c]">
                  {post.category}
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">{post.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{post.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
