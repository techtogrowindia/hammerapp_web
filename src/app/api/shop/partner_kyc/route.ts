import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// GET /api/shop/partner_kyc
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const partners = await prisma.shopPartner.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "asc" },
  });
  return shopOk(
    { shop_id: shop.id, partners: partners.map((p) => ({ id: p.id, name: p.name, pan_number: p.panNumber })) },
    "Partners",
  );
}

// POST /api/shop/partner_kyc — replaces the partner list with { partners: [{name, pan_number?}] }.
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: { partners?: Array<{ name?: string; pan_number?: string }> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return shopFail("Invalid JSON body");
  }

  const partners = (body.partners ?? [])
    .map((p) => ({ name: (p.name ?? "").trim(), panNumber: p.pan_number?.trim() || null }))
    .filter((p) => p.name.length > 0);

  try {
    await prisma.$transaction([
      prisma.shopPartner.deleteMany({ where: { shopId: shop.id } }),
      ...(partners.length
        ? [prisma.shopPartner.createMany({ data: partners.map((p) => ({ shopId: shop.id, ...p })) })]
        : []),
    ]);
    return shopOk({ shop_id: shop.id, count: partners.length }, "Partners saved");
  } catch (err) {
    console.error("[shop/partner_kyc]", err);
    return shopServerError();
  }
}
