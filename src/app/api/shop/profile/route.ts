import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { shopUserFull } from "@/lib/shop-serialize";

// GET /api/shop/profile — full profile incl. kyc_steps.
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  return shopOk(await shopUserFull(shop), "Profile");
}

// PATCH /api/shop/profile — update basic fields (name, email, fcm token).
export async function PATCH(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return shopFail("Invalid JSON body");
  }
  const s = (k: string) => {
    const v = body[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };

  try {
    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: s("name") ?? shop.name,
        email: s("email") ?? shop.email,
        fcmToken: s("fcm_token") ?? s("fcmToken") ?? shop.fcmToken,
      },
    });
    return shopOk(await shopUserFull(updated), "Profile updated");
  } catch (err) {
    console.error("[shop/profile PATCH]", err);
    return shopServerError();
  }
}
