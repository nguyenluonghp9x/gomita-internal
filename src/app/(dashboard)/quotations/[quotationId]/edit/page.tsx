import Link from "next/link";
import { notFound } from "next/navigation";
import { QuotationStatus } from "@prisma/client";

import { QuotationEditForm } from "@/app/(dashboard)/quotations/quotation-forms";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatVnd } from "@/lib/utils/money";
import {
  getQuotationById,
  listActiveFormulaConfigs,
  listQuotationTemplates,
} from "@/server/services/quotation-service";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ quotationId: string }>;
}) {
  const user = await requirePermission("quotations.update");
  const { quotationId } = await params;

  const q = await getQuotationById(quotationId);
  if (!q || q.status !== QuotationStatus.DRAFT) notFound();

  const [templates, formulas, canViewCost, canApprove] = await Promise.all([
    listQuotationTemplates(),
    listActiveFormulaConfigs(),
    hasPermission(user.id, "quotations.view_cost"),
    hasPermission(user.id, "quotations.approve_discount"),
  ]);
  const canManageThisQuotation = canApprove || q.createdById === user.id;
  if (!canManageThisQuotation) notFound();

  const discountPct = Number(q.discountPercent) * 100;

  const initialLines = q.items.map((i) => ({
    name: i.name,
    quantity: String(Number(i.quantity)),
    unit: i.unit ?? "",
    unitPrice: String(Number(i.unitPrice)),
    estimatedCost: String(Number(i.estimatedCost)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/quotations/${quotationId}`} className="text-sm text-slate-600 hover:text-slate-900">
          View quotation
        </Link>
        <span className="text-slate-300">|</span>
        <Link href="/quotations" className="text-sm text-slate-600 hover:text-slate-900">
          All quotations
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit {q.code}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Draft · Totals now: {formatVnd(Number(q.totalAmount))} (after save / submit, totals are recalculated).
        </p>
      </div>
      <QuotationEditForm
        quotationId={quotationId}
        canViewCost={canViewCost}
        templates={templates.map((t) => ({ id: t.id, code: t.code, name: t.name }))}
        formulas={formulas.map((f) => ({ id: f.id, name: f.name, versionNo: f.versionNo }))}
        initialHeader={{
          customerName: q.customerName,
          projectType: q.projectType,
          scope: q.scope ?? "",
          notes: q.notes ?? "",
          templateId: q.templateId ?? "",
          formulaConfigId: q.formulaConfigId ?? "",
          discountPercent: discountPct,
          discountReason: q.discountReason ?? "",
        }}
        initialLines={initialLines}
      />
    </div>
  );
}
