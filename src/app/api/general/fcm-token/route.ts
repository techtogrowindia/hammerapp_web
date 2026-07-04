import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// POST /api/general/fcm-token — store the shop's FCM token (authenticated).
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: { fcm_token?: string; token?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return shopFail("Invalid JSON body");
  }
  const token = (body.fcm_token ?? body.token ?? "").trim();
  if (!token) return shopFail("fcm_token required");

  try {
    await prisma.shop.update({ where: { id: shop.id }, data: { fcmToken: token } });
    return shopOk(null, "FCM token saved");
  } catch (err) {
    console.error("[general/fcm-token]", err);
    return shopServerError();
  }
}
