import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/otp";
import { signTechnicianToken } from "@/lib/jwt";
import { verifyOtpSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, OTP_VERIFY_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/technician/verify-otp — Verify OTP → returns session JWT (pre-auth)
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, OTP_VERIFY_RATE_LIMIT);
  if (limited) return limited;

  if (!checkPreAuth(req)) return unauthorized("Invalid pre-auth token");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) return fail(formatZodError(parsed.error));
  const { mobile, otp } = parsed.data;

  try {
    const technician = await prisma.technician.findUnique({ where: { mobile } });
    if (!technician) return notFound("Mobile number not registered");

    // Check LOGIN first, then REGISTER — a technician may verify either flow.
    const valid =
      (await verifyOtp(technician.id, otp, "LOGIN")) ||
      (await verifyOtp(technician.id, otp, "REGISTER"));

    if (!valid) return fail("Invalid or expired OTP", 400);

    // First successful verification activates the account.
    const updated =
      technician.status === "INACTIVE"
        ? await prisma.technician.update({
            where: { id: technician.id },
            data: { status: "ACTIVE" },
          })
        : technician;

    const token = signTechnicianToken({
      sub: updated.id,
      code: updated.code,
      mobile: updated.mobile,
    });

    return ok(
      {
        token,
        technician: {
          id: updated.id,
          code: updated.code,
          name: updated.name,
          mobile: updated.mobile,
          email: updated.email,
          status: updated.status,
          kycStatus: updated.kycStatus,
        },
      },
      "OTP verified successfully",
    );
  } catch (err) {
    console.error("[technician/verify-otp]", err);
    return serverError();
  }
}
