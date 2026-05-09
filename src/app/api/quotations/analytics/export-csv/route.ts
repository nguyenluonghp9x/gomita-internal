import { NextResponse } from "next/server";
import { QuotationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  getOutcomesByProjectType,
  getOwnerWinLeaderboard,
  getQuotationWeeklyTrend,
} from "@/server/services/quotation-analytics-service";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function parseStatus(statusRaw: string | null): QuotationStatus | undefined {
  if (!statusRaw || statusRaw === "ALL") return undefined;
  return (Object.values(QuotationStatus) as string[]).includes(statusRaw)
    ? (statusRaw as QuotationStatus)
    : undefined;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [canView, canExport] = await Promise.all([
    hasPermission(session.user.id, "quotations.view"),
    hasPermission(session.user.id, "quotations.export"),
  ]);
  if (!canView || !canExport) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = parseStatus(url.searchParams.get("status"));
  const weeks = Math.min(52, Math.max(4, Number(url.searchParams.get("weeks")) || 12));
  const filters = {
    q: url.searchParams.get("q") ?? undefined,
    ownerId: url.searchParams.get("ownerId") ?? undefined,
    fromDate: url.searchParams.get("fromDate") ?? undefined,
    toDate: url.searchParams.get("toDate") ?? undefined,
    ...(status ? { status } : {}),
  };

  const [trend, cohorts, leaders] = await Promise.all([
    getQuotationWeeklyTrend(filters, weeks),
    getOutcomesByProjectType(filters),
    getOwnerWinLeaderboard(filters, 20),
  ]);

  const lines: string[] = [];
  lines.push("# weekly_trend");
  lines.push("weekStartIso,created,wonEvents,lostEvents");
  for (const r of trend) {
    lines.push([r.weekStartIso, String(r.created), String(r.wonEvents), String(r.lostEvents)].join(","));
  }

  lines.push("");
  lines.push("# outcomes_by_project_type");
  lines.push("projectType,won,lost");
  for (const r of cohorts) {
    lines.push([r.projectType, String(r.won), String(r.lost)].map((v) => csvEscape(v)).join(","));
  }

  lines.push("");
  lines.push("# owner_win_leaderboard");
  lines.push("ownerName,ownerEmail,wonCount,wonTotal");
  for (const r of leaders) {
    lines.push(
      [r.fullName ?? "", r.email, String(r.wonCount), String(Math.round(r.wonTotal))]
        .map((v) => csvEscape(v))
        .join(","),
    );
  }

  const ts = new Date().toISOString().replaceAll(":", "-");
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotation-analytics-${ts}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
