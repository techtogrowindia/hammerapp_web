import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { issueOtp } from "@/lib/otp";
import { loginSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/technician/login — Login via mobile + OTP (pre-auth)
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, AUTH_RATE_LIMIT);
  if (limited) return limited;

  if (!checkPreAuth(req)) return unauthorized("Invalid pre-auth token");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail(formatZodError(parsed.error));
  const { mobile } = parsed.data;

  try {
    const technician = await prisma.technician.findUnique({ where: { mobile } });
    if (!technician) return notFound("Mobile number not registered");

    if (technician.status === "TERMINATED") {
      return fail("Account terminated. Contact support.", 403);
    }

    await issueOtp(technician.id, mobile, "LOGIN");

    return ok({ mobile: technician.mobile }, "OTP sent to your mobile number");
  } catch (err) {
    console.error("[technician/login]", err);
    return serverError();
  }
}
