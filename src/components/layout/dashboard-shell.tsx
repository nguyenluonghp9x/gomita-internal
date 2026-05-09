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
      <div className="mx-auto grid max-w-[1300px] grid-cols-[250px_1fr] gap-6 px-4 py-6">
        <aside className="app-card p-4">
          <div className="mb-5 rounded-xl bg-gradient-to-br from-[#20344c] to-[#2b4b6c] p-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 font-bold text-[#d1b077]">
              G
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/70">GOMITA</p>
            <h2 className="mt-1 text-lg font-semibold">Internal Portal</h2>
            <p className="mt-1 text-xs text-white/75">Operations · Training · Compliance</p>
          </div>
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const showBadge = item.href === "/notifications" && liveUnread > 0;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-[#20344c] text-white shadow"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {showBadge ? (
                    <span className="rounded-full bg-[#d1b077] px-2 py-0.5 text-[10px] font-semibold text-[#122033]">
                      {liveUnread > 99 ? "99+" : liveUnread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 space-y-4">
          <div className="app-card flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Workspace</p>
              <p className="text-sm font-semibold text-slate-900">GOMITA Internal Operations</p>
            </div>
            <Link
              href="/notifications"
              className="relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" />
              Messages
              {liveUnread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d1b077] px-1 text-[11px] font-bold text-[#122033]">
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
