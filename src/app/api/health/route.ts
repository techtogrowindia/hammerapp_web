import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api";

// GET /api/health — liveness + DB connectivity probe
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ db: "up", time: new Date().toISOString() }, "Healthy");
  } catch {
    return serverError("Database unreachable");
  }
}
