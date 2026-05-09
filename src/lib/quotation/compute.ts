import { QUOTATION_VAT_RATE } from "@/lib/constants/quotation";

export type QuotationLineInput = {
  name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  estimatedCost?: number | null;
};

export type SnapshotPayload = {
  customerName: string;
  projectType: string;
  scope?: string | null;
  notes?: string | null;
  discountPercent: number;
  discountReason?: string | null;
  items: {
    name: string;
    description?: string | null;
    quantity: number;
    unit?: string | null;
    unitPrice: number;
    lineTotal: number;
    estimatedCost: number;
    projectedProfit: number;
  }[];
  totals: {
    subtotal: number;
    vatAmount: number;
    totalAmount: number;
    estimatedCost: number;
    expectedProfit: number;
    marginPercent: number;
  };
};

export function buildLineRows(lines: QuotationLineInput[]): SnapshotPayload["items"] {
  const built: SnapshotPayload["items"] = [];
  for (const raw of lines) {
    const quantity = raw.quantity;
    const unitPrice = raw.unitPrice;
    const lineTotal = Math.round(quantity * unitPrice);
    const estimatedCost =
      raw.estimatedCost != null && !Number.isNaN(raw.estimatedCost)
        ? Math.round(raw.estimatedCost)
        : Math.round(lineTotal * 0.7);
    const projectedProfit = lineTotal - estimatedCost;
    built.push({
      name: raw.name.trim(),
      description: raw.description?.trim() || null,
      quantity,
      unit: raw.unit?.trim() || null,
      unitPrice,
      lineTotal,
      estimatedCost,
      projectedProfit,
    });
  }
  return built;
}

export function computeTotalsFromLines(
  builtLines: SnapshotPayload["items"],
  discountPercent: number,
) {
  const subtotal = builtLines.reduce((s, i) => s + i.lineTotal, 0);
  const estimatedCost = builtLines.reduce((s, i) => s + i.estimatedCost, 0);
  const disc = Math.min(Math.max(discountPercent, 0), 0.95);
  const taxable = Math.round(subtotal * (1 - disc));
  const vatAmount = Math.round(taxable * QUOTATION_VAT_RATE);
  const totalAmount = taxable + vatAmount;
  const expectedProfit = taxable - estimatedCost;
  const marginPercent = taxable > 0 ? expectedProfit / taxable : 0;

  return {
    subtotal,
    vatAmount,
    totalAmount,
    estimatedCost,
    expectedProfit,
    marginPercent,
  };
}

export function buildSnapshot(
  header: {
    customerName: string;
    projectType: string;
    scope?: string | null;
    notes?: string | null;
    discountPercent: number;
    discountReason?: string | null;
  },
  lines: QuotationLineInput[],
): SnapshotPayload {
  const items = buildLineRows(lines);
  const totals = computeTotalsFromLines(items, header.discountPercent);
  return {
    customerName: header.customerName.trim(),
    projectType: header.projectType.trim(),
    scope: header.scope?.trim() || null,
    notes: header.notes?.trim() || null,
    discountPercent: header.discountPercent,
    discountReason: header.discountReason?.trim() || null,
    items,
    totals,
  };
}
