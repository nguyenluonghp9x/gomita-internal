import type { WeekBucket } from "@/server/services/quotation-analytics-service";

function shortWeekLabel(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function WeekTrendChart({ buckets }: { buckets: WeekBucket[] }) {
  const maxY = Math.max(
    1,
    ...buckets.flatMap((b) => [b.created, b.wonEvents, b.lostEvents, b.wonEvents + b.lostEvents]),
  );

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Weekly activity</h2>
          <p className="mt-0.5 max-w-xl text-xs text-slate-500">
            Slate: quotations created · Green: transitioned to Won (audit) · Rose: transitioned to Lost
            (audit). Chart respects search, owner, and date filters status is ignored so volume stays readable.
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto pb-2 pt-6">
        {buckets.map((b) => {
          const ch = `${Math.round((b.created / maxY) * 100)}%`;
          const wh = `${Math.round((b.wonEvents / maxY) * 100)}%`;
          const lh = `${Math.round((b.lostEvents / maxY) * 100)}%`;
          return (
            <div
              key={b.weekStartIso}
              className="flex min-w-[48px] flex-1 flex-col items-center gap-1 text-[10px] text-slate-500"
            >
              <div className="flex h-36 w-full items-end justify-center gap-0.5">
                <span
                  className="inline-block w-[28%] max-w-3 rounded-t bg-slate-400"
                  style={{ height: ch }}
                  title={`Created: ${b.created}`}
                />
                <span
                  className="inline-block w-[28%] max-w-3 rounded-t bg-emerald-500"
                  style={{ height: wh }}
                  title={`Won events: ${b.wonEvents}`}
                />
                <span
                  className="inline-block w-[28%] max-w-3 rounded-t bg-rose-500"
                  style={{ height: lh }}
                  title={`Lost events: ${b.lostEvents}`}
                />
              </div>
              <span className="mt-1 rotate-[-35deg] whitespace-nowrap text-[9px] text-slate-400 sm:rotate-0">
                {shortWeekLabel(b.weekStartIso)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
