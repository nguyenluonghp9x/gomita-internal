import Link from "next/link";

import { QuotationCreateForm } from "@/app/(dashboard)/quotations/quotation-forms";
import { requirePermission } from "@/lib/auth/session";
import { listActiveFormulaConfigs, listQuotationTemplates } from "@/server/services/quotation-service";

export default async function NewQuotationPage() {
  await requirePermission("quotations.create");
  const [templates, formulas] = await Promise.all([listQuotationTemplates(), listActiveFormulaConfigs()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/quotations" className="text-sm text-slate-600 hover:text-slate-900">
          Back to quotations
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New quotation</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a draft with line items. VAT is applied after the discount on the subtotal. You can submit for approval after
          saving.
        </p>
      </div>
      <QuotationCreateForm
        templates={templates.map((t) => ({ id: t.id, code: t.code, name: t.name }))}
        formulas={formulas.map((f) => ({ id: f.id, name: f.name, versionNo: f.versionNo }))}
      />
    </div>
  );
}
