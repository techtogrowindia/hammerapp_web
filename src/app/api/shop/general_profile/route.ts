import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized } from "@/lib/api-shop";
import { shopUserFull } from "@/lib/shop-serialize";

// GET /api/shop/general_profile — same payload as profile (app alias).
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  return shopOk(await shopUserFull(shop), "General profile");
}
