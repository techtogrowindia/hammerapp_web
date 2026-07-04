import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, created, fail, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";
import { recomputeKycStatus } from "@/lib/kyc";

// GET /api/technician/document-kyc — list uploaded documents
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const records = await prisma.documentKyc.findMany({
    where: { technicianId: tech.id },
    orderBy: { createdAt: "asc" },
  });
  return ok(records, "Documents fetched");
}

// POST — upload/replace a document of a given docType
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const fields: Record<string, string> = {};
    let frontFile: string | undefined;
    let backFile: string | undefined;

    if (isMultipart(req)) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          const stored = await saveUpload(v, "document", tech.code);
          if (k === "backFile" || k === "back_file") backFile = stored.path;
          else frontFile = stored.path; // frontFile / file / default
        } else {
          fields[k] = String(v);
        }
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      for (const [k, v] of Object.entries(body)) {
        if (v !== null && v !== undefined) fields[k] = String(v);
      }
    }

    const docType = (fields.docType ?? fields.doc_type)?.toUpperCase();
    if (!docType) return fail("docType is required");

    const docNumber = fields.docNumber ?? fields.doc_number;

    // One row per (technician, docType): update if it already exists.
    const existing = await prisma.documentKyc.findFirst({
      where: { technicianId: tech.id, docType },
    });

    const record = existing
      ? await prisma.documentKyc.update({
          where: { id: existing.id },
          data: {
            docNumber: docNumber ?? existing.docNumber,
            ...(frontFile ? { frontFile } : {}),
            ...(backFile ? { backFile } : {}),
            status: "PENDING",
          },
        })
      : await prisma.documentKyc.create({
          data: {
            technicianId: tech.id,
            docType,
            docNumber: docNumber ?? null,
            frontFile: frontFile ?? null,
            backFile: backFile ?? null,
            status: "PENDING",
          },
        });

    await recomputeKycStatus(tech.id);
    return existing
      ? ok(record, "Document updated")
      : created(record, "Document uploaded");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/document-kyc]", err);
    return serverError();
  }
}
