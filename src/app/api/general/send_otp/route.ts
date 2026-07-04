import type { NextRequest } from "next/server";
import { getAuthTechnician, getAuthShop } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, serverError } from "@/lib/api";
import { shopOk, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { issueOtp } from "@/lib/otp";
import { issueShopOtp } from "@/lib/otp-shop";

// POST /api/general/send_otp — KYC final-verification OTP (authenticated).
// Called by both technician and shop apps. Detects which by trying each token type.
// body: { purpose } → { verification_token }
export async function POST(req: NextRequest) {
  let purpose = "KYC_FINAL_VERIFICATION";
  let bodyPurpose: string | undefined;

  // Clone the request so we can read body twice (once for purpose, once already read)
  const cloned = req.clone();
  try {
    const body = (await cloned.json()) as { purpose?: string };
    if (body?.purpose) bodyPurpose = body.purpose;
  } catch {
    /* body optional */
  }
  if (bodyPurpose) purpose = bodyPurpose;

  // Try technician token first
  const tech = await getAuthTechnician(req);
  if (tech) {
    try {
      await issueOtp(tech.id, tech.mobile, purpose);
      return ok(
        { verification_token: `${tech.code}:${purpose}`, mobile: tech.mobile },
        "OTP sent",
      );
    } catch (err) {
      console.error("[general/send_otp technician]", err);
      return serverError();
    }
  }

  // Try shop token
  const shop = await getAuthShop(req);
  if (shop) {
    try {
      await issueShopOtp(shop.id, shop.mobile, purpose);
      return shopOk(
        { verification_token: `${shop.code}:${purpose}`, mobile: shop.mobile },
        "OTP sent",
      );
    } catch (err) {
      console.error("[general/send_otp shop]", err);
      return shopServerError();
    }
  }

  return unauthorized();
}
