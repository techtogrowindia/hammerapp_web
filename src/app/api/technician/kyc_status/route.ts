import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import type { KycStatus } from "@prisma/client";

const VALID_STATUSES: KycStatus[] = [
  "NOT_STARTED",
  "PENDING",
  "VERIFIED",
  "NEED_CLARIFICATION",
  "NOT_COMPLETED",
  "REJECTED",
];

// PATCH /api/technician/kyc_status — admin/internal: update overall KYC status.
// Uses the static pre-auth token (useSessionToken: false in the Flutter call).
export async function PATCH(req: NextRequest) {
  if (!checkPreAuth(req)) return unauthorized("Invalid pre-auth token");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("Invalid JSON body");
  }

  const technicianId = body.technician_id != null ? String(body.technician_id) : undefined;
  const kycStatusRaw = typeof body.kyc_status === "string" ? body.kyc_status.toUpperCase() : undefined;

  if (!technicianId) return fail("technician_id is required");
  if (!kycStatusRaw || !VALID_STATUSES.includes(kycStatusRaw as KycStatus)) {
    return fail(`kyc_status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  try {
    // Accept both our internal cuid and the technician code (e.g. T2607040001)
    const technician = await prisma.technician.findFirst({
      where: { OR: [{ id: technicianId }, { code: technicianId }] },
    });
    if (!technician) return notFound("Technician not found");

    const updated = await prisma.technician.update({
      where: { id: technician.id },
      data: { kycStatus: kycStatusRaw as KycStatus },
    });

    return ok(
      { id: updated.id, code: updated.code, kyc_status: updated.kycStatus },
      "KYC status updated",
    );
  } catch (err) {
    console.error("[technician/kyc_status]", err);
    return serverError();
  }
}

// GET /api/technician/kyc_status — retrieve current status
export async function GET(req: NextRequest) {
  if (!checkPreAuth(req)) return unauthorized("Invalid pre-auth token");

  const url = new URL(req.url);
  const technicianId = url.searchParams.get("technician_id") ?? undefined;
  if (!technicianId) return fail("technician_id query param is required");

  try {
    const technician = await prisma.technician.findFirst({
      where: { OR: [{ id: technicianId }, { code: technicianId }] },
    });
    if (!technician) return notFound("Technician not found");
    return ok({ id: technician.id, code: technician.code, kyc_status: technician.kycStatus }, "KYC status fetched");
  } catch (err) {
    console.error("[technician/kyc_status GET]", err);
    return serverError();
  }
}
