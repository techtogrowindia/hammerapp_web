import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { checkPreAuth } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopNotFound, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { verifyShopOtp } from "@/lib/otp-shop";
import { shopUpdatePasswordSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/shop/update-password — reset password with mobile + otp (pre-auth).
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, AUTH_RATE_LIMIT);
  if (limited) return limited;
  if (!checkPreAuth(req)) return shopUnauthorized("Invalid pre-auth token");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return shopFail("Invalid JSON body");
  }
  const parsed = shopUpdatePasswordSchema.safeParse(body);
  if (!parsed.success) return shopFail(formatZodError(parsed.error));
  const { mobile, otp, password } = parsed.data;

  try {
    const shop = await prisma.shop.findUnique({ where: { mobile } });
    if (!shop) return shopNotFound("Mobile number not registered");

    const valid = await verifyShopOtp(shop.id, otp, "FORGOT_PASSWORD");
    if (!valid) return shopFail("Invalid or expired OTP", 400);

    const hash = await bcrypt.hash(password, 10);
    await prisma.shop.update({ where: { id: shop.id }, data: { password: hash } });
    return shopOk({ mobile }, "Password updated successfully");
  } catch (err) {
    console.error("[shop/update-password]", err);
    return shopServerError();
  }
}
