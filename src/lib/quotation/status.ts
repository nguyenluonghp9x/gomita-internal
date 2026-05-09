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
      return "bg-slate-100 text-slate-700";
    case "PENDING_APPROVAL":
      return "bg-amber-100 text-amber-800";
    case "APPROVED":
      return "bg-emerald-100 text-emerald-800";
    case "SENT":
      return "bg-sky-100 text-sky-800";
    case "NEGOTIATING":
      return "bg-indigo-100 text-indigo-800";
    case "WON":
      return "bg-emerald-200 text-emerald-900";
    case "LOST":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
