import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, created, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";
import { recomputeKycStatus } from "@/lib/kyc";

// GET /api/technician/technician_service_category — list chosen services
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const records = await prisma.technicianServiceCategory.findMany({
    where: { technicianId: tech.id },
    include: { serviceCategory: true, certificate: true },
    orderBy: { createdAt: "asc" },
  });
  return ok(records, "Service categories fetched");
}

// POST — add a service category (optionally with certificate file)
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const fields: Record<string, string> = {};
    let certificateFile: string | undefined;

    if (isMultipart(req)) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          const stored = await saveUpload(v, "service-certificate", tech.code);
          certificateFile = stored.path;
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

    const serviceCategoryId =
      fields.serviceCategoryId ?? fields.service_category_id;
    if (!serviceCategoryId) return fail("serviceCategoryId is required");

    const category = await prisma.serviceCategory.findUnique({
      where: { id: serviceCategoryId },
    });
    if (!category) return notFound("Service category not found");

    const certificateId = fields.certificateId ?? fields.certificate_id ?? null;

    const record = await prisma.technicianServiceCategory.upsert({
      where: {
        technicianId_serviceCategoryId: {
          technicianId: tech.id,
          serviceCategoryId,
        },
      },
      create: {
        technicianId: tech.id,
        serviceCategoryId,
        certificateId,
        certificateFile: certificateFile ?? null,
        status: "PENDING",
      },
      update: {
        certificateId,
        ...(certificateFile ? { certificateFile } : {}),
        status: "PENDING",
      },
      include: { serviceCategory: true, certificate: true },
    });

    await recomputeKycStatus(tech.id);
    return created(record, "Service category added");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/technician_service_category POST]", err);
    return serverError();
  }
}

// DELETE — remove a service category by ?id= or JSON body { id }
export async function DELETE(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id") ?? undefined;
    if (!id) {
      const body = (await req.json().catch(() => ({}))) as { id?: string };
      id = body.id;
    }
    if (!id) return fail("id is required");

    // Ensure the row belongs to this technician before deleting.
    const existing = await prisma.technicianServiceCategory.findFirst({
      where: { id, technicianId: tech.id },
    });
    if (!existing) return notFound("Service category link not found");

    await prisma.technicianServiceCategory.delete({ where: { id } });
    await recomputeKycStatus(tech.id);
    return ok({ id }, "Service category removed");
  } catch (err) {
    console.error("[technician/technician_service_category DELETE]", err);
    return serverError();
  }
}
