import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopUnauthorized, shopNotFound } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

// GET /api/shop/document_kyc/download?document=<key> → redirect to the file URL.
// <key> is the docType (aadhaar, pan, bank_passbook, gst, shop_photo, photo).
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  const key = req.nextUrl.searchParams.get("document");
  if (!key) return shopNotFound("document key required");

  const docType = key.toUpperCase().replace(/AADHAR/, "AADHAAR");
  const doc = await prisma.shopDocumentKyc.findFirst({
    where: { shopId: shop.id, docType },
  });
  const path = doc?.frontFile ?? doc?.backFile;
  if (!path) return shopNotFound("Document not found");

  const base = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";
  return NextResponse.redirect(`${base.replace(/\/$/, "")}/${path}`);
}
