import { prisma } from "@/lib/prisma";
import { ServicesManager } from "./ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServicesManagementPage() {
  const [categories, subcategories, services] = await Promise.all([
    prisma.serviceCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { subcategories: true, services: true } } },
    }),
    prisma.serviceSubcategory.findMany({
      orderBy: [{ serviceCategory: { name: "asc" } }, { name: "asc" }],
      include: { serviceCategory: { select: { name: true } }, _count: { select: { services: true } } },
    }),
    prisma.service.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        serviceCategory: { select: { name: true } },
        serviceSubcategory: { select: { name: true } },
      },
    }),
  ]);

  return (
    <ServicesManager
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        active: c.active,
        subCount: c._count.subcategories,
        serviceCount: c._count.services,
      }))}
      subcategories={subcategories.map((s) => ({
        id: s.id,
        name: s.name,
        active: s.active,
        serviceCategoryId: s.serviceCategoryId,
        categoryName: s.serviceCategory.name,
        serviceCount: s._count.services,
      }))}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        active: s.active,
        taxPercent: s.taxPercent,
        sacCode: s.sacCode,
        image: s.image,
        serviceCategoryId: s.serviceCategoryId,
        serviceSubcategoryId: s.serviceSubcategoryId,
        categoryName: s.serviceCategory.name,
        subcategoryName: s.serviceSubcategory?.name ?? null,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
