import { NextResponse } from "next/server";
import { QuotationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac/permissions";
import { listQuotations } from "@/server/services/quotation-service";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
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
  const statusRaw = url.searchParams.get("status") ?? undefined;
  const status =
    statusRaw && statusRaw !== "ALL" && (Object.values(QuotationStatus) as string[]).includes(statusRaw)
      ? (statusRaw as QuotationStatus)
      : undefined;

  const rows = await listQuotations({
    q: url.searchParams.get("q") ?? undefined,
    ownerId: url.searchParams.get("ownerId") ?? undefined,
    fromDate: url.searchParams.get("fromDate") ?? undefined,
    toDate: url.searchParams.get("toDate") ?? undefined,
    ...(status ? { status } : {}),
  });

  const header = [
    "code",
    "customerName",
    "projectType",
    "status",
    "totalAmount",
    "discountPercent",
    "ownerName",
    "ownerEmail",
    "updatedAt",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.code,
        r.customerName,
        r.projectType,
        r.status,
        String(r.totalAmount),
        String(Number(r.discountPercent) * 100),
        r.createdBy.fullName,
        r.createdBy.email,
        new Date(r.updatedAt).toISOString(),
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    ),
  ];
  const csv = lines.join("\n");
  const ts = new Date().toISOString().replaceAll(":", "-");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotations-${ts}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
