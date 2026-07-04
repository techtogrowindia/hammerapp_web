import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, unauthorized } from "@/lib/api";

// POST /api/technician/update-password — technician auth is OTP-only;
// no stored password exists. Accept the call and return success so the
// Flutter forgot-password flow completes gracefully.
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  // Nothing to persist — JWTs are stateless. The app will navigate to login.
  return ok(null, "Password reset successful");
}
