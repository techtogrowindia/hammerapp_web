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

// The app posts ALL documents in a single multipart request, one named key
// per file. Map each key → (docType, side).
const KEYED_DOCS: Record<string, { docType: string; side: "front" | "back" }> = {
  aadhar_front: { docType: "AADHAAR", side: "front" },
  aadhar_back: { docType: "AADHAAR", side: "back" },
  pan_card: { docType: "PAN", side: "front" },
  bank_passbook: { docType: "BANK_PASSBOOK", side: "front" },
  bank_statement: { docType: "BANK_PASSBOOK", side: "front" }, // alias used by Flutter app
  photo: { docType: "PROFILE_PHOTO", side: "front" },
  license_front: { docType: "DRIVING_LICENSE", side: "front" },
  license_back: { docType: "DRIVING_LICENSE", side: "back" },
  company_photo: { docType: "COMPANY_PHOTO", side: "front" },
  gst: { docType: "GST", side: "front" },
  gst_document: { docType: "GST", side: "front" }, // alias used by Flutter app
};

async function upsertDoc(
  technicianId: string,
  docType: string,
  side: "front" | "back",
  path: string,
) {
  const existing = await prisma.documentKyc.findFirst({ where: { technicianId, docType } });
  const fileData = side === "back" ? { backFile: path } : { frontFile: path };
  if (existing) {
    return prisma.documentKyc.update({
      where: { id: existing.id },
      data: { ...fileData, status: "PENDING" },
    });
  }
  return prisma.documentKyc.create({
    data: { technicianId, docType, ...fileData, status: "PENDING" },
  });
}

// POST — upload documents. Supports the app's keyed multipart (aadhar_front,
// pan_card, …) AND the legacy single-docType format.
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const fields: Record<string, string> = {};
    let frontFile: string | undefined;
    let backFile: string | undefined;
    const keyedResults = [];

    if (isMultipart(req)) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          const mapped = KEYED_DOCS[k];
          if (mapped) {
            // App keyed format — save straight into its docType row.
            const stored = await saveUpload(v, "document", tech.code);
            const rec = await upsertDoc(tech.id, mapped.docType, mapped.side, stored.path);
            keyedResults.push(rec);
            // Profile photo also mirrors into personalKyc for the avatar.
            if (mapped.docType === "PROFILE_PHOTO") {
              await prisma.personalKyc.updateMany({
                where: { technicianId: tech.id },
                data: { profilePhoto: stored.path },
              });
            }
          } else {
            const stored = await saveUpload(v, "document", tech.code);
            if (k === "backFile" || k === "back_file") backFile = stored.path;
            else frontFile = stored.path; // frontFile / file / default
          }
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

    // If we handled keyed uploads, return them.
    if (keyedResults.length) {
      await recomputeKycStatus(tech.id);
      return created(keyedResults, "Documents uploaded");
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
