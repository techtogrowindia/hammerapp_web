import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";

// POST /api/technician/logout — stateless JWT; just acknowledge
// The Flutter app clears the local token on its side regardless.
export async function POST(_req: NextRequest) {
  return ok(null, "Logged out successfully");
}
