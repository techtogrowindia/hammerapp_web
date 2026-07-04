import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { signTechnicianToken } from "@/lib/jwt";
import { checkRateLimit, OTP_VERIFY_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/technician/verify-forgot-password-otp (pre-auth)
// Verifies the OTP and returns a session JWT that the app uses as the
// "reset token" for the subsequent update-password call.
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, OTP_VERIFY_RATE_LIMIT);
  if (limited) return limited;

  if (!checkPreAuth(req)) return unauthorized("Invalid pre-auth token");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("Invalid JSON body");
  }

  const mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
  const otp = typeof body.otp === "string" ? body.otp.trim() : String(body.otp ?? "");
  if (!mobile || !otp) return fail("mobile and otp are required");

  try {
    const technician = await prisma.technician.findUnique({ where: { mobile } });
    if (!technician) return notFound("Mobile number not registered");

    const valid = await verifyOtp(technician.id, otp, "LOGIN");
    if (!valid) return fail("Invalid or expired OTP", 400);

    const token = signTechnicianToken({
      sub: technician.id,
      code: technician.code,
      mobile: technician.mobile,
    });

    return ok({ token }, "OTP verified. Use the token to reset your password.");
  } catch (err) {
    console.error("[technician/verify-forgot-password-otp]", err);
    return serverError();
  }
}
