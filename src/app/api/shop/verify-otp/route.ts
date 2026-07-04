import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { verifyShopOtp } from "@/lib/otp-shop";
import { shopVerifyOtpSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, OTP_VERIFY_RATE_LIMIT } from "@/lib/rate-limit";
import { shopUser } from "@/lib/shop-serialize";

// POST /api/shop/verify-otp — Verify the mobile OTP (authenticated with the
// token from create/login). Marks the mobile verified.
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, OTP_VERIFY_RATE_LIMIT);
  if (limited) return limited;

  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return shopFail("Invalid JSON body");
  }

  const parsed = shopVerifyOtpSchema.safeParse(body);
  if (!parsed.success) return shopFail(formatZodError(parsed.error));
  const { otp } = parsed.data;

  try {
    const valid =
      (await verifyShopOtp(shop.id, otp, "REGISTER")) ||
      (await verifyShopOtp(shop.id, otp, "LOGIN")) ||
      (await verifyShopOtp(shop.id, otp, "MOBILE_VERIFY"));
    if (!valid) return shopFail("Invalid or expired OTP", 400);

    // First verification activates the account and flags the mobile verified.
    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        mobileVerified: true,
        status: shop.status === "INACTIVE" ? "ACTIVE" : shop.status,
      },
    });

    return shopOk(shopUser(updated), "OTP verified successfully");
  } catch (err) {
    console.error("[shop/verify-otp]", err);
    return shopServerError();
  }
}
