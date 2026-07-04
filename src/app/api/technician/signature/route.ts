import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";

// POST /api/technician/signature — upload signature image
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  if (!isMultipart(req)) {
    return fail("Signature must be uploaded as multipart/form-data");
  }

  try {
    const form = await req.formData();
    const file = (form.get("signature") ?? form.get("file")) as File | null;
    if (!file || !(file instanceof File) || file.size === 0) {
      return fail("signature file is required");
    }

    const stored = await saveUpload(file, "signature", tech.code);

    const record = await prisma.signature.upsert({
      where: { technicianId: tech.id },
      create: { technicianId: tech.id, file: stored.path },
      update: { file: stored.path },
    });

    return ok({ id: record.id, file: record.file, url: stored.url }, "Signature saved");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/signature]", err);
    return serverError();
  }
}
