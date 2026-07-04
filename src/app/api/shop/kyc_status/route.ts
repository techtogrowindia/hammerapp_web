import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized } from "@/lib/api-shop";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";
import { prisma } from "@/lib/prisma";

// GET /api/shop/kyc_status — current overall + per-step status.
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const status = await recomputeShopKycStatus(shop.id);
  return shopOk({ kyc_status: status }, "KYC status");
}

// PATCH /api/shop/kyc_status — app signals completion; recompute the roll-up.
// (The overall status is server-derived from step statuses, so we ignore any
//  client-supplied kyc_status and just recompute.)
export async function PATCH(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const status = await recomputeShopKycStatus(shop.id);
  // Touch updatedAt so the admin list reflects recent submission activity.
  await prisma.shop.update({ where: { id: shop.id }, data: { updatedAt: new Date() } });
  return shopOk({ kyc_status: status }, "KYC status updated");
}
