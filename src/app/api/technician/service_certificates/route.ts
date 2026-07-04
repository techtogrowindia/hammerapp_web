import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, created, fail, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";
import { recomputeKycStatus } from "@/lib/kyc";

// GET /api/technician/service_certificates — uploaded per-service certificates
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const records = await prisma.serviceCertificate.findMany({
    where: { technicianId: tech.id },
    include: { service: true, certificate: true },
    orderBy: { createdAt: "asc" },
  });
  return ok(records, "Service certificates fetched");
}

// POST — upload one service certificate (multipart). Fields:
//   service_id, certificate_id, certificate_number, no_expiry ("1"/"0"),
//   expiry_date, files[] (one or more).
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const fields: Record<string, string> = {};
    const files: string[] = [];

    if (isMultipart(req)) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          const stored = await saveUpload(v, "service-certificate", tech.code);
          files.push(stored.path);
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

    const serviceId = fields.serviceId ?? fields.service_id;
    if (!serviceId) return fail("service_id is required");

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return fail("Service not found");

    const certificateId = fields.certificateId ?? fields.certificate_id ?? null;
    const certificateNumber =
      fields.certificateNumber ?? fields.certificate_number ?? null;
    const noExpiryRaw = fields.noExpiry ?? fields.no_expiry ?? "1";
    const noExpiry = ["1", "true", "yes"].includes(noExpiryRaw.toLowerCase());
    const expiryRaw = fields.expiryDate ?? fields.expiry_date;
    const expiryDate = !noExpiry && expiryRaw ? new Date(expiryRaw) : null;

    const record = await prisma.serviceCertificate.create({
      data: {
        technicianId: tech.id,
        serviceId,
        certificateId,
        certificateNumber,
        noExpiry,
        expiryDate,
        files,
        status: "PENDING",
      },
      include: { service: true, certificate: true },
    });

    await recomputeKycStatus(tech.id);
    return created(record, "Service certificate uploaded");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/service_certificates POST]", err);
    return serverError();
  }
}

// DELETE — remove a service certificate by ?id= or JSON body { id }
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

    const existing = await prisma.serviceCertificate.findFirst({
      where: { id, technicianId: tech.id },
    });
    if (!existing) return fail("Service certificate not found");

    await prisma.serviceCertificate.delete({ where: { id } });
    await recomputeKycStatus(tech.id);
    return ok({ id }, "Service certificate removed");
  } catch (err) {
    console.error("[technician/service_certificates DELETE]", err);
    return serverError();
  }
}
