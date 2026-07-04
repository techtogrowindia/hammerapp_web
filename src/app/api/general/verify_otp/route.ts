import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { verifyShopOtp } from "@/lib/otp-shop";

// POST /api/general/verify_otp — verify KYC final-verification OTP (authenticated).
// body: { verification_token, otp }
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: { verification_token?: string; otp?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return shopFail("Invalid JSON body");
  }
  if (!body.otp) return shopFail("otp required");

  // purpose encoded in verification_token as "<code>:<purpose>".
  const purpose = body.verification_token?.split(":")[1] ?? "KYC_FINAL_VERIFICATION";

  try {
    const valid = await verifyShopOtp(shop.id, body.otp, purpose);
    if (!valid) return shopFail("Invalid or expired OTP", 400);
    return shopOk({ verified: true }, "OTP verified");
  } catch (err) {
    console.error("[general/verify_otp]", err);
    return shopServerError();
  }
}
