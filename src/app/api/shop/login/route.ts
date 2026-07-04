import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { checkPreAuth } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { issueShopOtp } from "@/lib/otp-shop";
import { signShopToken } from "@/lib/jwt";
import { shopLoginSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { shopUserFull } from "@/lib/shop-serialize";

// POST /api/shop/login — Login via mobile + password (pre-auth). Returns session token.
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

  const parsed = shopLoginSchema.safeParse(body);
  if (!parsed.success) return shopFail(formatZodError(parsed.error), 422);
  const { mobile, password } = parsed.data;

  try {
    const shop = await prisma.shop.findUnique({ where: { mobile } });
    if (!shop || !shop.password) {
      return shopUnauthorized("Invalid mobile number or password");
    }
    if (shop.status === "TERMINATED") {
      return shopFail("Account terminated. Contact support.", 403);
    }

    const okPass = await bcrypt.compare(password, shop.password);
    if (!okPass) return shopUnauthorized("Invalid mobile number or password");

    const token = signShopToken({ sub: shop.id, code: shop.code, mobile: shop.mobile });

    // If mobile not yet verified, issue a fresh OTP so the app can prompt.
    if (!shop.mobileVerified) {
      await issueShopOtp(shop.id, mobile, "REGISTER");
    }

    const user = await shopUserFull(shop);
    return shopOk(user, "Login successful", { token });
  } catch (err) {
    console.error("[shop/login]", err);
    return shopServerError();
  }
}
