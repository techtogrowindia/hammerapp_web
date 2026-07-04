import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, unauthorized } from "@/lib/api";

// DELETE /api/technician/team_members/[id] — Phase 3 feature stub
export async function DELETE(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();
  return ok(null, "Team member removed");
}
