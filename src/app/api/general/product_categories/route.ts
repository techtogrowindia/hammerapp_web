import { shopOk } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// GET /api/general/product_categories — categories (int id) with subcategories.
export async function GET() {
  const cats = await prisma.productCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: { subcategories: { where: { active: true }, orderBy: { name: "asc" } } },
  });
  return shopOk(
    cats.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
    })),
    "Product categories",
  );
}
