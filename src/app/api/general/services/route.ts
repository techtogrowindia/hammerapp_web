import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/general/services — 3-tier services tree for the technician KYC step.
// Flutter CategoryModel expects: { id: int, name, image, subcategories: [{id: int, name, image, services: [{id: int, service_name, image, tax_percentage, technician_activation_charges, certificates: [{id: int, name, image}]}] }] }
// We expose seqId as id throughout.
export async function GET(_req: NextRequest) {
  const categories = await prisma.serviceCategory.findMany({
    where: { active: true },
    orderBy: { seqId: "asc" },
    include: {
      subcategories: {
        where: { active: true },
        orderBy: { seqId: "asc" },
        include: {
          services: {
            where: { active: true },
            orderBy: { seqId: "asc" },
          },
        },
      },
      certificates: {
        where: { active: true },
        orderBy: { seqId: "asc" },
      },
    },
  });

  const data = categories.map((cat) => ({
    id: cat.seqId,
    name: cat.name,
    image: cat.icon ?? "",
    subcategories: cat.subcategories.map((sub) => ({
      id: sub.seqId,
      name: sub.name,
      image: "",
      services: sub.services.map((svc) => ({
        id: svc.seqId,
        service_name: svc.name,
        image: svc.image ?? "",
        tax_percentage: Math.round(svc.taxPercent),
        technician_activation_charges: svc.technicianActivationCharges,
        certificates: cat.certificates.map((cert) => ({
          id: cert.seqId,
          name: cert.name,
          image: cert.image ?? "",
        })),
      })),
    })),
  }));

  return ok(data, "Services fetched");
}
