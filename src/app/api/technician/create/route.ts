import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { ok, created, fail, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateTechnicianCode } from "@/lib/id";
import { issueOtp } from "@/lib/otp";
import { createTechnicianSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/technician/create — Register (pre-auth static token)
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

  const parsed = createTechnicianSchema.safeParse(body);
  if (!parsed.success) return fail(formatZodError(parsed.error));
  const { name, mobile, email } = parsed.data;

  try {
    const existing = await prisma.technician.findUnique({ where: { mobile } });

    // Already registered but not yet verified → re-issue OTP so the
    // Flutter flow can continue rather than dead-ending.
    if (existing) {
      if (existing.status === "ACTIVE") {
        return fail("Mobile number already registered. Please login.", 409);
      }
      await issueOtp(existing.id, mobile, "REGISTER");
      return ok(
        { id: existing.id, code: existing.code, mobile: existing.mobile },
        "OTP sent. Please verify to continue.",
      );
    }

    const technician = await prisma.$transaction(async (tx) => {
      const code = await generateTechnicianCode();
      return tx.technician.create({
        data: {
          code,
          name: name ?? null,
          mobile,
          email: email || null,
          status: "INACTIVE",
          kycStatus: "NOT_STARTED",
        },
      });
    });

    await issueOtp(technician.id, mobile, "REGISTER");

    return created(
      { id: technician.id, code: technician.code, mobile: technician.mobile },
      "Registration successful. OTP sent.",
    );
  } catch (err) {
    console.error("[technician/create]", err);
    return serverError();
  }
}
