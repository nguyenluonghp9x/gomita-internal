import fs from "node:fs/promises";
import path from "node:path";

const SUBDIR = "files";

export function getDocumentsStorageRoot(): string {
  return path.join(process.cwd(), "storage", "documents", SUBDIR);
}

export function getVersionFilePath(versionId: string): string {
  const safe = versionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(getDocumentsStorageRoot(), safe);
}

export async function ensureStorageRoot(): Promise<void> {
  await fs.mkdir(getDocumentsStorageRoot(), { recursive: true });
}

export async function writeVersionFile(versionId: string, data: Buffer): Promise<void> {
  await ensureStorageRoot();
  const p = getVersionFilePath(versionId);
  await fs.writeFile(p, data);
}

export async function readVersionFile(versionId: string): Promise<Buffer | null> {
  const p = getVersionFilePath(versionId);
  try {
    return await fs.readFile(p);
  } catch {
    return null;
  }
}
