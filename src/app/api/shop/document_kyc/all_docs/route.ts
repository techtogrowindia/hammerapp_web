import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// GET /api/shop/document_kyc/all_docs → a { document_key: url } map for the app.
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  const docs = await prisma.shopDocumentKyc.findMany({ where: { shopId: shop.id } });
  const base = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";
  const url = (p: string | null) => (p ? `${base.replace(/\/$/, "")}/${p}` : null);

  const map: Record<string, string | null> = {};
  for (const d of docs) {
    const t = d.docType.toLowerCase();
    if (d.frontFile) map[t === "aadhaar" ? "aadhar_front" : t] = url(d.frontFile);
    if (d.backFile) map[t === "aadhaar" ? "aadhar_back" : `${t}_back`] = url(d.backFile);
  }
  return shopOk({ shop_id: shop.id, documents: map }, "All documents");
}
