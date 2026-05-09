"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(dashboard)/notifications/actions";

type Row = {
  id: string;
  title: string;
  message: string;
  route: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
  type: string;
};

export function NotificationList({ items }: { items: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending || items.every((i) => i.readAt)}
          onClick={() =>
            startTransition(async () => {
              await markAllNotificationsReadAction();
              router.refresh();
            })
          }
          className="rounded-md border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl border bg-white shadow-sm">
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-600">No notifications.</li>
        ) : (
          items.map((n) => (
            <li
              key={n.id}
              className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${
                !n.readAt ? "bg-slate-50/80" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {n.route ? (
                    <Link href={n.route} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {n.type} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              {!n.readAt ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await markNotificationReadAction(n.id);
                      router.refresh();
                    })
                  }
                  className="shrink-0 text-sm text-slate-700 underline"
                >
                  Mark read
                </button>
              ) : (
                <span className="shrink-0 text-xs text-slate-400">Read</span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
