import {
  GetObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";

import { readVersionFile, writeVersionFile } from "@/lib/documents/storage-path";

export type DocumentStorageBackend = "local" | "s3";

function normalizeBackend(raw: string | undefined): DocumentStorageBackend {
  const v = raw?.trim().toLowerCase();
  if (v === "s3") return "s3";
  return "local";
}

export function getDocumentStorageBackend(): DocumentStorageBackend {
  return normalizeBackend(process.env.DOCUMENT_STORAGE);
}

let s3Client: S3Client | null | undefined;

function assertS3Bucket() {
  if (!process.env.S3_BUCKET?.trim()) {
    throw new Error(
      "S3_BUCKET must be set when DOCUMENT_STORAGE=s3 (private bucket recommended).",
    );
  }
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  assertS3Bucket();
  const region = process.env.S3_REGION?.trim() || "auto";
  const endpoint = process.env.S3_ENDPOINT?.trim();
  s3Client = new S3Client({
    region,
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
        }
      : {}),
  });
  return s3Client;
}

function buildObjectKey(storageKey: string): string {
  const raw = process.env.S3_KEY_PREFIX ?? "documents/";
  const prefix = raw.endsWith("/") ? raw : `${raw}/`;
  return `${prefix}${storageKey}`;
}

async function writeS3Object(storageKey: string, data: Buffer): Promise<void> {
  const client = getS3Client();
  const Bucket = process.env.S3_BUCKET!.trim();
  const Key = buildObjectKey(storageKey);
  const sse = process.env.S3_SSE?.trim();

  const cmdInput: PutObjectCommandInput = {
    Bucket,
    Key,
    Body: data,
  };
  if (sse === "AES256") {
    cmdInput.ServerSideEncryption = "AES256";
  } else if (sse === "aws:kms") {
    cmdInput.ServerSideEncryption = "aws:kms";
    const kms = process.env.S3_SSE_KMS_KEY_ID?.trim();
    if (kms) cmdInput.SSEKMSKeyId = kms;
  }

  await client.send(new PutObjectCommand(cmdInput));
}

async function readS3Object(storageKey: string): Promise<Buffer | null> {
  const client = getS3Client();
  const Bucket = process.env.S3_BUCKET!.trim();
  const Key = buildObjectKey(storageKey);
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket,
        Key,
      }),
    );
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (e: unknown) {
    const meta =
      typeof e === "object" && e && "$metadata" in e
        ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata
        : undefined;
    if (meta?.httpStatusCode === 404) {
      return null;
    }
    const name =
      typeof e === "object" && e && "name" in e ? String((e as { name: string }).name) : "";
    const code =
      typeof e === "object" && e && "Code" in e ? String((e as { Code?: string }).Code ?? "") : "";
    if (name === "NoSuchKey" || code === "NoSuchKey" || name === "NotFound") {
      return null;
    }
    throw e;
  }
}

/** Persists blob for a document version. `storageKey` matches `DocumentVersion.fileUrl` after upload. */
export async function writeDocumentBlob(storageKey: string, data: Buffer): Promise<void> {
  const backend = getDocumentStorageBackend();
  if (backend === "s3") {
    await writeS3Object(storageKey, data);
    return;
  }
  await writeVersionFile(storageKey, data);
}

export async function readDocumentBlob(storageKey: string): Promise<Buffer | null> {
  const backend = getDocumentStorageBackend();
  if (backend === "s3") {
    return readS3Object(storageKey);
  }
  return readVersionFile(storageKey);
}
