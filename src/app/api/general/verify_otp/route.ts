import type { NextRequest } from "next/server";
import { getAuthTechnician, getAuthShop } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, serverError } from "@/lib/api";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { verifyOtp } from "@/lib/otp";
import { verifyShopOtp } from "@/lib/otp-shop";

// POST /api/general/verify_otp — verify KYC final-verification OTP (authenticated).
// Called by both technician and shop apps.
// body: { verification_token, otp }
export async function POST(req: NextRequest) {
  let body: { verification_token?: string; otp?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return fail("Invalid JSON body");
  }
  if (!body.otp) return fail("otp required");

  // purpose encoded in verification_token as "<code>:<purpose>".
  const purpose = body.verification_token?.split(":")[1] ?? "KYC_FINAL_VERIFICATION";

  // Try technician token
  const tech = await getAuthTechnician(req);
  if (tech) {
    try {
      const valid = await verifyOtp(tech.id, body.otp, purpose);
      if (!valid) return fail("Invalid or expired OTP", 400);
      return ok({ verified: true }, "OTP verified");
    } catch (err) {
      console.error("[general/verify_otp technician]", err);
      return serverError();
    }
  }

  // Try shop token
  const shop = await getAuthShop(req);
  if (shop) {
    try {
      const valid = await verifyShopOtp(shop.id, body.otp, purpose);
      if (!valid) return shopFail("Invalid or expired OTP", 400);
      return shopOk({ verified: true }, "OTP verified");
    } catch (err) {
      console.error("[general/verify_otp shop]", err);
      return shopServerError();
    }
  }

  return unauthorized();
}
