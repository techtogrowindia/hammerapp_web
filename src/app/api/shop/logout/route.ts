import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// POST /api/shop/logout — clears the FCM token. JWT is stateless; the app drops it.
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  await prisma.shop.update({ where: { id: shop.id }, data: { fcmToken: null } });
  return shopOk(null, "Logged out");
}
