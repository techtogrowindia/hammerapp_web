import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { saveUpload, UploadError, isMultipart } from "@/lib/upload";

// POST /api/shop/signature — upload signature image (multipart).
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  if (!isMultipart(req)) return shopFail("Expected multipart/form-data");

  try {
    const form = await req.formData();
    const file = form.get("signature") ?? form.get("file");
    if (!(file instanceof File) || file.size === 0) return shopFail("Signature file required");

    const stored = await saveUpload(file, "shop-signature", shop.code);
    await prisma.shopSignature.upsert({
      where: { shopId: shop.id },
      create: { shopId: shop.id, file: stored.path },
      update: { file: stored.path },
    });
    return shopOk({ file: stored.url }, "Signature uploaded");
  } catch (err) {
    if (err instanceof UploadError) return shopFail(err.message);
    console.error("[shop/signature]", err);
    return shopServerError();
  }
}
