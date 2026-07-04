import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// DELETE /api/general/account — delete the authenticated shop account.
export async function DELETE(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  try {
    // Cascades remove KYC/partners/products/documents/otps/payments.
    await prisma.shop.delete({ where: { id: shop.id } });
    return shopOk(null, "Account deleted");
  } catch (err) {
    console.error("[general/account DELETE]", err);
    return shopServerError();
  }
}
