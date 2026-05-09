import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { readDocumentBlob } from "@/lib/documents/storage";
import { hasPermission } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ versionId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const canView = await hasPermission(userId, "documents.view");
  if (!canView) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { versionId } = await ctx.params;
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") === "download" ? "download" : "inline";

  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { document: true },
  });
  if (!version) return new NextResponse("Not found", { status: 404 });

  if (version.document.status !== "PUBLISHED") {
    const canManage = await hasPermission(userId, "documents.create");
    if (!canManage) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  if (mode === "download") {
    const canDl = await hasPermission(userId, "documents.download");
    if (!version.document.isDownloadable || !canDl) {
      return new NextResponse("Download not allowed", { status: 403 });
    }
    await writeAuditLog({
      actorId: userId,
      action: "DOWNLOAD_DOC",
      module: "documents",
      resource: "document_version",
      resourceId: version.id,
      metadata: { documentId: version.documentId },
    });
  } else if (version.document.isSensitive) {
    await writeAuditLog({
      actorId: userId,
      action: "VIEW_SENSITIVE_DOC",
      module: "documents",
      resource: "document_version",
      resourceId: version.id,
      metadata: { documentId: version.documentId, mode: "inline" },
    });
  }

  const key = version.fileUrl;
  if (!key || key === "pending") {
    return new NextResponse("File missing", { status: 404 });
  }

  const buf = await readDocumentBlob(key);
  if (!buf) return new NextResponse("File missing", { status: 404 });

  const disposition = mode === "download" ? "attachment" : "inline";
  const headers = new Headers();
  headers.set("Content-Type", version.fileMime);
  headers.set(
    "Content-Disposition",
    `${disposition}; filename="${encodeURIComponent(version.fileName)}"`,
  );
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return new NextResponse(new Uint8Array(buf), { status: 200, headers });
}
