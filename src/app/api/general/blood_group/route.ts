import { shopOk } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// GET /api/general/blood_group
export async function GET() {
  const groups = await prisma.bloodGroup.findMany({ orderBy: { name: "asc" } });
  return shopOk(groups.map((g) => ({ id: g.id, name: g.name })), "Blood groups");
}
