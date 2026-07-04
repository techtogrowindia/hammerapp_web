import type { NextRequest } from "next/server";
import { shopOk } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// GET /api/general/locations-list?pincode=625107 — resolve area info for a pincode.
export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get("pincode")?.trim();
  if (!pincode) return shopOk({ pincode: null, locations: [] }, "No pincode");

  const locations = await prisma.location.findMany({
    where: { pincode, active: true },
    orderBy: { name: "asc" },
  });

  return shopOk(
    {
      pincode,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        city: l.city,
        state: l.state,
        pincode: l.pincode,
      })),
    },
    "Locations",
  );
}
