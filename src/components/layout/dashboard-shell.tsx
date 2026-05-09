"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  Calculator,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Users2,
} from "lucide-react";

import { useNotificationUnreadStream } from "@/hooks/use-notification-unread-stream";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid max-w-7xl grid-cols-[240px_1fr] gap-6 px-4 py-6">
        <aside className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">GOMITA Internal</h2>
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const showBadge = item.href === "/notifications" && liveUnread > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {showBadge ? (
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {liveUnread > 99 ? "99+" : liveUnread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-end border-b border-slate-200 pb-3">
            <Link
              href="/notifications"
              className="relative inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Bell className="h-4 w-4" />
              Messages
              {liveUnread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
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
