"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Calculator,
  FileText,
  LayoutDashboard,
  Newspaper,
  ShieldCheck,
  Users2,
} from "lucide-react";

import { useNotificationUnreadStream } from "@/hooks/use-notification-unread-stream";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/news", label: "Newsroom", icon: Newspaper },
  { href: "/training", label: "Training", icon: BookOpen },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/policies", label: "Policies", icon: ShieldCheck },
  { href: "/quotations", label: "Quotations", icon: Calculator },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/admin", label: "Admin", icon: Users2 },
];

export function DashboardShell({
  children,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  unreadCount?: number;
}) {
  const liveUnread = useNotificationUnreadStream(unreadCount);
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-[1300px] grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[258px_1fr]">
        <aside className="app-shell-sidebar h-fit p-4">
          <Link
            href="/"
            className="group mb-6 block overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-gradient-end)] p-4 text-left text-white shadow-md ring-1 ring-white/10 transition hover:brightness-[1.04]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12 font-semibold text-[var(--brand-gold)]">
              G
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/72">GOMITA</p>
            <h2 className="font-display mt-1 text-lg font-semibold tracking-tight">Internal Portal</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/78">Studio nội thất · Vận hành nội bộ</p>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-[var(--brand-gold)]/90 opacity-0 transition group-hover:opacity-100">
              Về trang giới thiệu
            </p>
          </Link>
          <nav className="space-y-0.5">
            {nav.map((item) => {
              const Icon = item.icon;
              const showBadge = item.href === "/notifications" && liveUnread > 0;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border-l-[3px] py-2.5 pl-3 pr-3 text-sm transition ${
                    active
                      ? "border-[var(--brand-gold)] bg-[var(--brand-navy)] font-medium text-white shadow-sm ring-1 ring-black/5"
                      : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--brand-navy-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  <span className="flex-1">{item.label}</span>
                  {showBadge ? (
                    <span className="rounded-full bg-[var(--brand-gold)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-navy)]">
                      {liveUnread > 99 ? "99+" : liveUnread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 space-y-4">
          <div className="app-header-bar flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Workspace
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                GOMITA — Vận hành nội bộ
              </p>
            </div>
            <Link
              href="/notifications"
              className="app-btn-secondary relative inline-flex items-center gap-2 px-3 py-2 text-sm shadow-none"
            >
              <Bell className="h-4 w-4 text-[var(--brand-navy)]" />
              Thông báo
              {liveUnread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-gold)] px-1 text-[11px] font-bold text-[var(--brand-navy)]">
                  {liveUnread > 99 ? "99+" : liveUnread}
                </span>
              ) : null}
            </Link>
          </div>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
