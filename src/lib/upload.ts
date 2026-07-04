import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";
const UPLOAD_BASE_URL =
  process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export interface StoredFile {
  /** Relative path stored in the DB, e.g. document/T2607040001/1720099999_aadhaar.jpg */
  path: string;
  /** Public URL for the mobile app / admin to load the file. */
  url: string;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

/**
 * Persists an uploaded file under
 *   {UPLOAD_DIR}/{type}/{technicianCode}/{timestamp}_{original_name}
 * per claude.md §10 (File naming).
 */
export async function saveUpload(
  file: File,
  type: string,
  technicianCode: string,
): Promise<StoredFile> {
  if (file.size > MAX_BYTES) {
    throw new UploadError("File exceeds 10 MB limit");
  }
  if (file.type && !ALLOWED.has(file.type)) {
    throw new UploadError(`Unsupported file type: ${file.type}`);
  }

  const timestamp = Date.now();
  const filename = `${timestamp}_${sanitize(file.name || "upload")}`;
  const relDir = path.posix.join(type, technicianCode);
  const relPath = path.posix.join(relDir, filename);

  const absDir = path.join(UPLOAD_DIR, type, technicianCode);
  await mkdir(absDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absDir, filename), bytes);

  return {
    path: relPath,
    url: `${UPLOAD_BASE_URL.replace(/\/$/, "")}/${relPath}`,
  };
}

export class UploadError extends Error {}

/** True when the request carries a multipart/form-data body. */
export function isMultipart(req: Request): boolean {
  return (req.headers.get("content-type") ?? "").includes("multipart/form-data");
}
