import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/technician/profile — full profile + KYC snapshot
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const full = await prisma.technician.findUnique({
    where: { id: tech.id },
    include: {
      personalKyc: { include: { bloodGroup: true, location: true } },
      education: true,
      bankKyc: true,
      companyKyc: true,
      documents: true,
      signature: true,
      serviceCategories: { include: { serviceCategory: true, certificate: true } },
    },
  });

  return ok(full, "Profile fetched");
}

// PATCH /api/technician/profile — update basic profile fields
export async function PATCH(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const data: { name?: string; email?: string | null; fcmToken?: string } = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.email === "string") data.email = body.email.trim() || null;
    const fcm = body.fcmToken ?? body.fcm_token;
    if (typeof fcm === "string" && fcm) data.fcmToken = fcm;

    const updated = await prisma.technician.update({
      where: { id: tech.id },
      data,
    });

    return ok(
      {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        mobile: updated.mobile,
        email: updated.email,
        status: updated.status,
        kycStatus: updated.kycStatus,
      },
      "Profile updated",
    );
  } catch (err) {
    console.error("[technician/profile PATCH]", err);
    return serverError();
  }
}
