import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { issueShopOtp } from "@/lib/otp-shop";
import { checkRateLimit, OTP_RATE_LIMIT } from "@/lib/rate-limit";

// POST /api/shop/resend-otp — Resend the mobile-verification OTP (authenticated).
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, OTP_RATE_LIMIT);
  if (limited) return limited;

  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  try {
    const purpose = shop.mobileVerified ? "LOGIN" : "REGISTER";
    await issueShopOtp(shop.id, shop.mobile, purpose);
    return shopOk({ mobile: shop.mobile }, "OTP resent successfully");
  } catch (err) {
    console.error("[shop/resend-otp]", err);
    return shopServerError();
  }
}
