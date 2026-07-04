import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";
import { saveUpload, UploadError, isMultipart } from "@/lib/upload";

// Multipart upload keys (from hammer_shop kyc_service) → docType + slot.
// bank_statement is mapped to bank_passbook and gst_document to gst by the app.
const KEY_MAP: Record<string, { docType: string; slot: "front" | "back" }> = {
  aadhar_front: { docType: "AADHAAR", slot: "front" },
  aadhar_back: { docType: "AADHAAR", slot: "back" },
  pan_card: { docType: "PAN", slot: "front" },
  bank_passbook: { docType: "BANK_PASSBOOK", slot: "front" },
  photo: { docType: "PHOTO", slot: "front" },
  gst: { docType: "GST", slot: "front" },
  company_photo: { docType: "SHOP_PHOTO", slot: "front" },
  shop_photo: { docType: "SHOP_PHOTO", slot: "front" },
};

// GET /api/shop/document_kyc → list of stored documents
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const docs = await prisma.shopDocumentKyc.findMany({ where: { shopId: shop.id } });
  return shopOk(docs.map(serialize), "Document KYC");
}

// POST /api/shop/document_kyc — multipart upload of one or more documents.
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  if (!isMultipart(req)) return shopFail("Expected multipart/form-data");

  try {
    const form = await req.formData();

    // Optional geotag for the shop photo.
    const latitude = numOrNull(form.get("latitude"));
    const longitude = numOrNull(form.get("longitude"));
    const capturedAtRaw = form.get("captured_at");
    const capturedAt =
      typeof capturedAtRaw === "string" && capturedAtRaw ? new Date(capturedAtRaw) : null;

    const touched: string[] = [];

    for (const [key, value] of form.entries()) {
      const map = KEY_MAP[key];
      if (!map || !(value instanceof File) || value.size === 0) continue;

      const stored = await saveUpload(value, `shop-${map.docType.toLowerCase()}`, shop.code);
      const docNumber = (form.get(`${map.docType.toLowerCase()}_number`) as string) || undefined;

      const existing = await prisma.shopDocumentKyc.findFirst({
        where: { shopId: shop.id, docType: map.docType },
      });

      const geo =
        map.docType === "SHOP_PHOTO"
          ? { latitude, longitude, capturedAt }
          : {};

      if (existing) {
        await prisma.shopDocumentKyc.update({
          where: { id: existing.id },
          data: {
            [map.slot === "front" ? "frontFile" : "backFile"]: stored.path,
            ...(docNumber ? { docNumber } : {}),
            ...geo,
            status: "PENDING",
          },
        });
      } else {
        await prisma.shopDocumentKyc.create({
          data: {
            shopId: shop.id,
            docType: map.docType,
            docNumber: docNumber ?? null,
            frontFile: map.slot === "front" ? stored.path : null,
            backFile: map.slot === "back" ? stored.path : null,
            ...geo,
            status: "PENDING",
          },
        });
      }
      touched.push(map.docType);
    }

    if (touched.length === 0) return shopFail("No valid document files provided");

    await recomputeShopKycStatus(shop.id);
    const docs = await prisma.shopDocumentKyc.findMany({ where: { shopId: shop.id } });
    return shopOk(docs.map(serialize), "Documents uploaded");
  } catch (err) {
    if (err instanceof UploadError) return shopFail(err.message);
    console.error("[shop/document_kyc]", err);
    return shopServerError();
  }
}

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function serialize(d: {
  docType: string; docNumber: string | null; frontFile: string | null; backFile: string | null;
  latitude: number | null; longitude: number | null; capturedAt: Date | null;
  status: string; remark: string | null;
}) {
  const base = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";
  const url = (p: string | null) => (p ? `${base.replace(/\/$/, "")}/${p}` : null);
  return {
    doc_type: d.docType,
    document: d.docType,
    doc_number: d.docNumber,
    front: url(d.frontFile),
    back: url(d.backFile),
    latitude: d.latitude,
    longitude: d.longitude,
    captured_at: d.capturedAt ? d.capturedAt.toISOString() : null,
    status: d.status,
    remark: d.remark,
  };
}
