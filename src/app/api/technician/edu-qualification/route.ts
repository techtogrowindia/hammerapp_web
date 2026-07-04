import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";

// GET /api/technician/edu-qualification — Step 2 read
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const record = await prisma.educationQualification.findUnique({
    where: { technicianId: tech.id },
  });
  return ok(record, record ? "Education fetched" : "Not started");
}

export async function POST(req: NextRequest) {
  return upsert(req);
}
export async function PATCH(req: NextRequest) {
  return upsert(req);
}

async function upsert(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const fields: Record<string, string> = {};
    const newFiles: string[] = [];

    if (isMultipart(req)) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          // Accept certificateFile / certificate_file / certificate_files[]
          if (
            k === "certificateFile" ||
            k === "certificate_file" ||
            k === "certificate_files" ||
            k === "certificate_files[]" ||
            k.startsWith("certificate_files")
          ) {
            const stored = await saveUpload(v, "education", tech.code);
            newFiles.push(stored.path);
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

    const yearRaw =
      fields.yearOfPassing ?? fields.year_of_passing ?? fields.passed_out_year;

    // Merge newly-uploaded files onto whatever is already stored.
    const existing = await prisma.educationQualification.findUnique({
      where: { technicianId: tech.id },
    });
    const certificateFiles = [...(existing?.certificateFiles ?? []), ...newFiles];

    const data = {
      qualification:
        fields.qualification ?? fields.maximum_education_qualification,
      institution: fields.institution,
      yearOfPassing: yearRaw ? Number(yearRaw) : undefined,
      ...(newFiles.length
        ? { certificateFile: newFiles[0], certificateFiles }
        : {}),
      status: "PENDING" as const,
    };

    const record = await prisma.educationQualification.upsert({
      where: { technicianId: tech.id },
      create: { technicianId: tech.id, ...data },
      update: data,
    });

    return ok(record, "Education qualification saved");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/edu-qualification]", err);
    return serverError();
  }
}
