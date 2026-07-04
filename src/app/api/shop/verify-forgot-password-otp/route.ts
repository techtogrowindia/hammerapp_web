import type { NextRequest } from "next/server";
import { checkPreAuth } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopNotFound, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { peekShopOtp } from "@/lib/otp-shop";
import { shopVerifyForgotOtpSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, OTP_VERIFY_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/shop/verify-forgot-password-otp — verify reset OTP (pre-auth).
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, OTP_VERIFY_RATE_LIMIT);
  if (limited) return limited;
  if (!checkPreAuth(req)) return shopUnauthorized("Invalid pre-auth token");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return shopFail("Invalid JSON body");
  }
  const parsed = shopVerifyForgotOtpSchema.safeParse(body);
  if (!parsed.success) return shopFail(formatZodError(parsed.error));
  const { mobile, otp } = parsed.data;

  try {
    const shop = await prisma.shop.findUnique({ where: { mobile } });
    if (!shop) return shopNotFound("Mobile number not registered");

    // Peek without consuming — update-password consumes it.
    const valid = await peekShopOtp(shop.id, otp, "FORGOT_PASSWORD");
    if (!valid) return shopFail("Invalid or expired OTP", 400);

    return shopOk({ mobile, verified: true }, "OTP verified. You can reset your password.");
  } catch (err) {
    console.error("[shop/verify-forgot-password-otp]", err);
    return shopServerError();
  }
}
