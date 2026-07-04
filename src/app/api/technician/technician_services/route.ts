import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, created, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { recomputeKycStatus } from "@/lib/kyc";

// GET /api/technician/technician_services — chosen leaf services
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const records = await prisma.technicianService.findMany({
    where: { technicianId: tech.id },
    include: { service: { include: { serviceCategory: true, serviceSubcategory: true } } },
    orderBy: { createdAt: "asc" },
  });
  return ok(records, "Services fetched");
}

// POST — replace the technician's leaf-service list.
// App sends { technician_services: [serviceId, ...] }.
export async function POST(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const raw =
      (body.technician_services as unknown[] | undefined) ??
      (body.services as unknown[] | undefined) ??
      [];

    // Resolve both integer seqIds (from mobile app) and cuid strings.
    const seqIds: number[] = [];
    const cuidIds: string[] = [];
    for (const x of raw) {
      const n = Number(x);
      if (!isNaN(n) && n > 0) seqIds.push(n);
      else if (x) cuidIds.push(String(x));
    }

    const bySeq = seqIds.length
      ? await prisma.service.findMany({ where: { seqId: { in: seqIds } }, select: { id: true } })
      : [];
    const byCuid = cuidIds.length
      ? await prisma.service.findMany({ where: { id: { in: cuidIds } }, select: { id: true } })
      : [];

    const validIds = new Set([...bySeq, ...byCuid].map((s) => s.id));

    // Replace the set: delete rows no longer selected, upsert the rest.
    await prisma.technicianService.deleteMany({
      where: { technicianId: tech.id, serviceId: { notIn: [...validIds] } },
    });
    for (const serviceId of validIds) {
      await prisma.technicianService.upsert({
        where: {
          technicianId_serviceId: { technicianId: tech.id, serviceId },
        },
        create: { technicianId: tech.id, serviceId, status: "PENDING" },
        update: { status: "PENDING" },
      });
    }

    await recomputeKycStatus(tech.id);
    const records = await prisma.technicianService.findMany({
      where: { technicianId: tech.id },
      include: { service: true },
    });
    return created({ services: records }, "Services saved");
  } catch (err) {
    console.error("[technician/technician_services POST]", err);
    return serverError();
  }
}
