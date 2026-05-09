import { NextResponse } from "next/server";
import { degrees, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getServerSession } from "next-auth";

import { writeAuditLog } from "@/lib/audit/audit-log";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatVnd } from "@/lib/utils/money";
import { getQuotationById } from "@/server/services/quotation-service";

const PAGE = { width: 595, height: 842, marginX: 40, top: 800, bottom: 45 };

function drawLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size = 11,
  color = rgb(0.15, 0.15, 0.2),
) {
  page.drawText(text, { x, y, size, font, color });
}

type QuotationWatermarkMode = "none" | "all" | "with_cost";

function quotationPdfWatermarkMode(): QuotationWatermarkMode {
  const v = process.env.QUOTATION_PDF_WATERMARK?.trim().toLowerCase();
  if (v === "none" || v === "0" || v === "false") return "none";
  if (v === "all") return "all";
  return "with_cost";
}

function shouldApplyQuotationWatermark(mode: QuotationWatermarkMode, canViewCost: boolean): boolean {
  if (mode === "none") return false;
  if (mode === "all") return true;
  return canViewCost;
}

/** Light diagonal watermark for sensitive exports — every page after content built. */
function applyDiagonalWatermarkToAllPages(pdf: PDFDocument, font: PDFFont, line1: string, line2: string) {
  const pages = pdf.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const size = 38;
    const opacity = 0.12;
    const color = rgb(0.78, 0.78, 0.82);
    const rot = degrees(-34);
    const cx = width / 2;
    const cy = height / 2;
    const tw = font.widthOfTextAtSize(line1, size);
    page.drawText(line1, {
      x: cx - tw / 2,
      y: cy + 10,
      size,
      font,
      color,
      opacity,
      rotate: rot,
    });
    if (line2) {
      const s2 = 9;
      const tw2 = font.widthOfTextAtSize(line2, s2);
      page.drawText(line2, {
        x: cx - tw2 / 2,
        y: cy - 30,
        size: s2,
        font,
        color,
        opacity: opacity + 0.05,
        rotate: rot,
      });
    }
  }
}

function chunkText(text: string, maxChars = 95): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = `${cur} ${w}`.trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quotationId: string }> },
) {
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

  const { quotationId } = await params;
  const quotation = await getQuotationById(quotationId);
  if (!quotation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canViewCost = await hasPermission(session.user.id, "quotations.view_cost");

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([PAGE.width, PAGE.height]); // A4 portrait
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE.top;
  drawLine(page, "GOMITA - QUOTATION", PAGE.marginX, y, bold, 16);
  y -= 24;
  drawLine(page, `Code: ${quotation.code}`, PAGE.marginX, y, font);
  y -= 16;
  drawLine(page, `Customer: ${quotation.customerName}`, PAGE.marginX, y, font);
  y -= 16;
  drawLine(page, `Project: ${quotation.projectType}`, PAGE.marginX, y, font);
  y -= 16;
  drawLine(page, `Status: ${quotation.status}`, PAGE.marginX, y, font);
  y -= 24;

  drawLine(page, "Items", PAGE.marginX, y, bold, 12);
  y -= 18;
  drawLine(page, "Name", 40, y, bold, 10);
  drawLine(page, "Qty", 260, y, bold, 10);
  drawLine(page, "Unit", 300, y, bold, 10);
  drawLine(page, "Unit Price", 350, y, bold, 10);
  drawLine(page, "Line Total", 470, y, bold, 10);
  y -= 12;

  for (const item of quotation.items) {
    if (y < 90) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
      y = PAGE.top;
      drawLine(page, `${quotation.code} - continued`, PAGE.marginX, y, bold, 12);
      y -= 16;
      drawLine(page, "Name", 40, y, bold, 10);
      drawLine(page, "Qty", 260, y, bold, 10);
      drawLine(page, "Unit", 300, y, bold, 10);
      drawLine(page, "Unit Price", 350, y, bold, 10);
      drawLine(page, "Line Total", 470, y, bold, 10);
      y -= 12;
    }
    const nameLines = chunkText(item.name, 34);
    drawLine(page, nameLines[0] ?? "-", 40, y, font, 10);
    drawLine(page, String(Number(item.quantity)), 260, y, font, 10);
    drawLine(page, item.unit ?? "-", 300, y, font, 10);
    drawLine(page, formatVnd(Number(item.unitPrice)), 350, y, font, 10);
    drawLine(page, formatVnd(Number(item.lineTotal)), 470, y, font, 10);
    y -= 13;
    for (let i = 1; i < nameLines.length; i += 1) {
      if (y < 80) break;
      drawLine(page, nameLines[i]!, 40, y, font, 9);
      y -= 11;
    }
  }

  if (y < 150) {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.top;
  } else {
    y -= 20;
  }
  drawLine(page, "Totals", PAGE.marginX, y, bold, 12);
  y -= 18;
  drawLine(page, `Subtotal: ${formatVnd(Number(quotation.subtotal))}`, PAGE.marginX, y, font);
  y -= 15;
  drawLine(page, `Discount: ${(Number(quotation.discountPercent) * 100).toFixed(2)}%`, PAGE.marginX, y, font);
  y -= 15;
  drawLine(page, `VAT: ${formatVnd(Number(quotation.vatAmount))}`, PAGE.marginX, y, font);
  y -= 15;
  drawLine(page, `Total: ${formatVnd(Number(quotation.totalAmount))}`, PAGE.marginX, y, bold);
  y -= 15;
  if (canViewCost) {
    drawLine(page, `Estimated cost: ${formatVnd(Number(quotation.estimatedCost))}`, PAGE.marginX, y, font);
    y -= 15;
    drawLine(page, `Expected profit: ${formatVnd(Number(quotation.expectedProfit))}`, PAGE.marginX, y, font);
    y -= 15;
  }

  if (quotation.scope) {
    if (y < 130) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
      y = PAGE.top;
    } else {
      y -= 8;
    }
    drawLine(page, "Scope", PAGE.marginX, y, bold, 12);
    y -= 16;
    for (const line of chunkText(quotation.scope, 95).slice(0, 18)) {
      drawLine(page, line, PAGE.marginX, y, font, 10);
      y -= 12;
      if (y < PAGE.bottom + 10) break;
    }
  }

  drawLine(page, `Generated at ${new Date().toLocaleString()}`, PAGE.marginX, 28, font, 9, rgb(0.4, 0.4, 0.45));

  const wmMode = quotationPdfWatermarkMode();
  const watermarkTitle = process.env.QUOTATION_PDF_WATERMARK_TEXT?.trim() || "INTERNAL";
  const email = session.user.email?.trim();
  const displayName = session.user.name?.trim();
  const watermarkUser = email?.slice(0, 96) ?? displayName?.slice(0, 96) ?? "";
  if (shouldApplyQuotationWatermark(wmMode, canViewCost)) {
    applyDiagonalWatermarkToAllPages(pdf, font, watermarkTitle, watermarkUser);
  }

  await writeAuditLog({
    actorId: session.user.id,
    action: "OTHER",
    module: "quotations",
    resource: "quotation_export_pdf",
    resourceId: quotation.id,
    metadata: { code: quotation.code },
  });

  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${quotation.code}.pdf\"`,
      "Cache-Control": "private, no-store",
    },
  });
}
