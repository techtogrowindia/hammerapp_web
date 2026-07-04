import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/technician/forgot-password — send OTP for password reset (pre-auth)
// Technician auth is OTP-based; this re-sends a login OTP.
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, AUTH_RATE_LIMIT);
  if (limited) return limited;

  if (!checkPreAuth(req)) return unauthorized("Invalid pre-auth token");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail("Invalid JSON body");
  }

  const mobile = typeof body.mobile === "string" ? body.mobile.trim() : "";
  if (!mobile) return fail("mobile is required");

  try {
    const technician = await prisma.technician.findUnique({ where: { mobile } });
    if (!technician) return notFound("Mobile number not registered");

    await issueOtp(technician.id, mobile, "LOGIN");

    return ok({ mobile }, "OTP sent to your mobile number");
  } catch (err) {
    console.error("[technician/forgot-password]", err);
    return serverError();
  }
}
