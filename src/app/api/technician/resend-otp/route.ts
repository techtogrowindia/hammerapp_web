import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { resendOtpSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, OTP_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/technician/resend-otp — Resend OTP (pre-auth)
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, OTP_RATE_LIMIT);
  if (limited) return limited;

  if (!checkPreAuth(req)) return unauthorized("Invalid pre-auth token");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const parsed = resendOtpSchema.safeParse(body);
  if (!parsed.success) return fail(formatZodError(parsed.error));
  const { mobile } = parsed.data;

  try {
    const technician = await prisma.technician.findUnique({ where: { mobile } });
    if (!technician) return notFound("Mobile number not registered");

    // Re-issue for whichever flow applies (register if not yet active).
    const purpose = technician.status === "INACTIVE" ? "REGISTER" : "LOGIN";
    await issueOtp(technician.id, mobile, purpose);

    return ok({ mobile: technician.mobile }, "OTP resent successfully");
  } catch (err) {
    console.error("[technician/resend-otp]", err);
    return serverError();
  }
}
