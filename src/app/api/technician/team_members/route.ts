import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, unauthorized } from "@/lib/api";

// GET /api/technician/team_members — Phase 3 feature stub
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();
  return ok({ team_members: [] }, "Team members fetched");
}

// POST /api/technician/team_members — Phase 3 feature stub
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();
  // TODO Phase 3: persist team member
  return ok(null, "Team member added");
}
