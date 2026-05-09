import type { QuotationStatus } from "@prisma/client";

export function quotationStatusLabel(status: QuotationStatus | string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "APPROVED":
      return "Approved";
    case "SENT":
      return "Sent";
    case "NEGOTIATING":
      return "Negotiating";
    case "WON":
      return "Won";
    case "LOST":
      return "Lost";
    default:
      return String(status);
  }
}

export function quotationStatusBadgeClass(status: QuotationStatus | string): string {
  switch (status) {
    case "DRAFT":
      return "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]";
    case "PENDING_APPROVAL":
      return "border border-amber-200/80 bg-[var(--warning-bg)] text-[var(--warning-fg)]";
    case "APPROVED":
      return "border border-emerald-200/70 bg-[var(--success-bg)] text-[var(--success-fg)]";
    case "SENT":
      return "border border-sky-200/70 bg-[var(--info-bg)] text-[var(--info-fg)]";
    case "NEGOTIATING":
      return "border border-violet-200/70 bg-violet-50 text-violet-900";
    case "WON":
      return "border border-emerald-300/80 bg-emerald-100/90 text-emerald-950";
    case "LOST":
      return "border border-rose-200/80 bg-[var(--danger-bg)] text-[var(--danger-fg)]";
    default:
      return "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]";
  }
}
