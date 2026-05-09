import Image from "next/image";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/session";
import { DEMO_NEWS_POSTS } from "@/lib/demo/news";
import { SHOWCASE_HERO } from "@/lib/demo/showcase-images";
import { getAdminDashboardStats } from "@/server/services/admin-service";

export default async function DashboardPage() {
  await requirePermission("dashboard.view");
  const stats = await getAdminDashboardStats();
  const cards = [
    { label: "Total users", value: String(stats.totalUsers), tone: "text-[var(--brand-navy)]" },
    { label: "New users (7d)", value: String(stats.newUsers), tone: "text-[var(--brand-navy)]" },
    { label: "Training completion", value: `${stats.trainingCompletionRate}%`, tone: "text-[var(--brand-navy)]" },
    { label: "Pending quotations", value: String(stats.pendingQuotations), tone: "text-[var(--brand-navy)]" },
    { label: "New documents (7d)", value: String(stats.newDocuments), tone: "text-[var(--brand-navy)]" },
    {
      label: "Pending policy ack",
      value: String(stats.pendingPolicyAcknowledgements),
      tone: "text-[var(--brand-gold)]",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="app-card relative overflow-hidden p-0">
        <div className="relative min-h-[180px] sm:min-h-[200px]">
          <Image
            src={SHOWCASE_HERO.src}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1300px) 100vw, 1050px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-navy)]/92 via-[var(--brand-navy)]/75 to-[var(--brand-navy-gradient-end)]/55" />
          <div className="relative z-10 p-5 sm:p-6 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/70">Dashboard</p>
            <h1 className="font-display mt-1 text-2xl font-semibold sm:text-[1.65rem]">
              Tổng quan hệ thống GOMITA
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/85">
              Theo dõi nhanh nhân sự, đào tạo, tài liệu và báo giá — giao diện phản ánh không gian
              nội thất của thương hiệu.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="app-card p-4">
            <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
            <p className={`mt-2 text-3xl font-semibold tabular-nums ${card.tone}`}>{card.value}</p>
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
            <Link href="/news" className="text-sm font-medium text-[var(--brand-navy)] hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {DEMO_NEWS_POSTS.slice(0, 3).map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:border-[#c7d6e6]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-navy)]">
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
