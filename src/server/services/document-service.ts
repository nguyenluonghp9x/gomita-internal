import { DocumentStatus } from "@prisma/client";

import { writeDocumentBlob } from "@/lib/documents/storage";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils/slug";

const MAX_UPLOAD_BYTES = Number(process.env.DOCUMENT_MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024);

export function getMaxUploadBytes(): number {
  return MAX_UPLOAD_BYTES;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (await prisma.document.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function listDocumentsForLibrary(params?: { q?: string; category?: string }) {
  const q = params?.q?.trim();
  const cat = params?.category?.trim();

  return prisma.document.findMany({
    where: {
      status: DocumentStatus.PUBLISHED,
      ...(cat ? { category: cat } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      versions: {
        take: 1,
        orderBy: { versionNo: "desc" },
        include: { createdBy: { select: { fullName: true } } },
      },
    },
  });
}

export async function listDocumentsForManagement() {
  return prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { versions: true } },
    },
  });
}

export async function getDocumentById(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      versions: {
        orderBy: { versionNo: "desc" },
        include: { createdBy: { select: { fullName: true, email: true } } },
      },
    },
  });
}

export type CreateDocumentUploadInput = {
  title: string;
  category?: string | null;
  tags: string[];
  status: DocumentStatus;
  isDownloadable: boolean;
  isSensitive: boolean;
  changeSummary?: string | null;
  fileName: string;
  fileMime: string;
  fileSize: number;
  body: Buffer;
  createdById: string;
};

export async function createDocumentWithFirstVersion(input: CreateDocumentUploadInput) {
  if (input.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const base = slugify(input.title);
  const slug = await ensureUniqueSlug(base);

  const doc = await prisma.document.create({
    data: {
      title: input.title.trim(),
      slug,
      category: input.category?.trim() || null,
      tags: input.tags,
      status: input.status,
      currentVersion: 1,
      isDownloadable: input.isDownloadable,
      isSensitive: input.isSensitive,
    },
  });

  const version = await prisma.documentVersion.create({
    data: {
      documentId: doc.id,
      versionNo: 1,
      fileUrl: "pending",
      fileName: input.fileName,
      fileMime: input.fileMime,
      fileSize: input.fileSize,
      changeSummary: input.changeSummary?.trim() || null,
      createdById: input.createdById,
    },
  });

  await writeDocumentBlob(version.id, input.body);
  await prisma.documentVersion.update({
    where: { id: version.id },
    data: { fileUrl: version.id },
  });

  return { documentId: doc.id, versionId: version.id };
}

export type AddDocumentVersionInput = {
  documentId: string;
  changeSummary?: string | null;
  fileName: string;
  fileMime: string;
  fileSize: number;
  body: Buffer;
  createdById: string;
};

export async function addDocumentVersion(input: AddDocumentVersionInput) {
  if (input.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const maxRow = await prisma.documentVersion.aggregate({
    where: { documentId: input.documentId },
    _max: { versionNo: true },
  });
  const nextNo = (maxRow._max.versionNo ?? 0) + 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId: input.documentId,
      versionNo: nextNo,
      fileUrl: "pending",
      fileName: input.fileName,
      fileMime: input.fileMime,
      fileSize: input.fileSize,
      changeSummary: input.changeSummary?.trim() || null,
      createdById: input.createdById,
    },
  });

  await writeDocumentBlob(version.id, input.body);
  await prisma.documentVersion.update({
    where: { id: version.id },
    data: { fileUrl: version.id },
  });

  await prisma.document.update({
    where: { id: input.documentId },
    data: { currentVersion: nextNo },
  });

  return { versionId: version.id, versionNo: nextNo };
}
