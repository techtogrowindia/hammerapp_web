import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { issueShopOtp } from "@/lib/otp-shop";

// POST /api/general/send_otp — KYC final-verification OTP (authenticated).
// body: { purpose } → { verification_token }
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let purpose = "KYC_FINAL_VERIFICATION";
  try {
    const body = (await req.json()) as { purpose?: string };
    if (body?.purpose) purpose = body.purpose;
  } catch {
    /* body optional */
  }

  try {
    await issueShopOtp(shop.id, shop.mobile, purpose);
    // The app treats verification_token as an opaque handle for verify_otp.
    return shopOk(
      { verification_token: `${shop.code}:${purpose}`, mobile: shop.mobile },
      "OTP sent",
    );
  } catch (err) {
    console.error("[general/send_otp]", err);
    return shopServerError();
  }
}
