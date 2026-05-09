#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fail(message) {
  console.error(`MIGRATE FAIL: ${message}`);
  process.exit(1);
}

function getBucket() {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) fail("S3_BUCKET is required.");
  return bucket;
}

function buildObjectKey(storageKey) {
  const raw = process.env.S3_KEY_PREFIX ?? "documents/";
  const prefix = raw.endsWith("/") ? raw : `${raw}/`;
  return `${prefix}${storageKey}`;
}

function buildS3Client() {
  const region = process.env.S3_REGION?.trim() || "auto";
  const endpoint = process.env.S3_ENDPOINT?.trim();
  return new S3Client({
    region,
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
        }
      : {}),
  });
}

function getLocalPath(versionId) {
  const safe = versionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(process.cwd(), "storage", "documents", "files", safe);
}

async function run() {
  const dryRun = process.env.MIGRATE_DRY_RUN === "true";
  const onlyMissing = process.env.MIGRATE_ONLY_MISSING !== "false";
  const bucket = getBucket();
  const s3 = buildS3Client();

  const versions = await prisma.documentVersion.findMany({
    select: { id: true, fileUrl: true, fileName: true },
    orderBy: { createdAt: "asc" },
  });

  let checked = 0;
  let migrated = 0;
  let skipped = 0;
  let missing = 0;
  let errored = 0;

  for (const v of versions) {
    checked += 1;
    const key = v.fileUrl?.trim();
    if (!key || key === "pending") {
      skipped += 1;
      continue;
    }

    const localPath = getLocalPath(key);
    const buf = await fs.readFile(localPath).catch(() => null);
    if (!buf) {
      missing += 1;
      continue;
    }

    const objectKey = buildObjectKey(key);
    if (dryRun) {
      console.log(`[DRY] would upload ${v.id} -> s3://${bucket}/${objectKey}`);
      migrated += 1;
      continue;
    }

    try {
      if (!onlyMissing) {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: buf,
          }),
        );
      } else {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: buf,
            // Create-only semantics (S3 compatible providers may ignore this header).
            IfNoneMatch: "*",
          }),
        );
      }
      migrated += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (onlyMissing && /PreconditionFailed|412/.test(msg)) {
        skipped += 1;
      } else {
        errored += 1;
        console.error(`Upload failed for ${v.id} (${v.fileName}): ${msg}`);
      }
    }
  }

  console.log("");
  console.log("Document migration summary");
  console.log(`- checked:  ${checked}`);
  console.log(`- migrated: ${migrated}`);
  console.log(`- skipped:  ${skipped}`);
  console.log(`- missing local files: ${missing}`);
  console.log(`- errors:   ${errored}`);

  if (errored > 0) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
