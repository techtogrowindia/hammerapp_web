import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";
import type { FirmType } from "@prisma/client";

function parseFirmType(raw?: string | null): FirmType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (v === "proprietorship") return "PROPRIETORSHIP";
  if (v === "partnership") return "PARTNERSHIP";
  if (v === "privatelimited") return "PRIVATE_LIMITED";
  return undefined;
}

async function resolveBloodGroupId(name?: string | null): Promise<string | undefined> {
  if (!name) return undefined;
  const bg = await prisma.bloodGroup.findUnique({ where: { name: name.trim() } });
  return bg?.id;
}

// GET /api/shop/personal_kyc
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const p = await prisma.shopPersonalKyc.findUnique({
    where: { shopId: shop.id },
    include: { bloodGroup: true },
  });
  return shopOk(p ? serialize(p) : null, "Personal KYC");
}

export async function POST(req: NextRequest) {
  return upsert(req);
}
export async function PATCH(req: NextRequest) {
  return upsert(req);
}

async function upsert(req: NextRequest) {
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
    const bloodGroupId = await resolveBloodGroupId(s("blood_group"));
    const dobRaw = s("date_of_birth");
    const data = {
      name: s("name"),
      dob: dobRaw ? new Date(dobRaw) : undefined,
      bloodGroupId,
      aadharNumber: s("aadhar_number"),
      panNumber: s("pan_number")?.toUpperCase(),
      firmType: parseFirmType(s("firm_type")),
      businessPan: s("business_pan")?.toUpperCase(),
      address: s("address"),
      cityTownVillage: s("city_town_village") ?? s("city"),
      taluk: s("taluk"),
      district: s("district"),
      pincode: s("pincode"),
      status: "PENDING" as const,
    };

    const saved = await prisma.shopPersonalKyc.upsert({
      where: { shopId: shop.id },
      create: { shopId: shop.id, ...data },
      update: data,
      include: { bloodGroup: true },
    });

    // A single partner name may arrive on step 1 (proprietor/first partner).
    const partnerName = s("partner_name");
    if (partnerName) {
      const exists = await prisma.shopPartner.findFirst({
        where: { shopId: shop.id, name: partnerName },
      });
      if (!exists) await prisma.shopPartner.create({ data: { shopId: shop.id, name: partnerName } });
    }

    await recomputeShopKycStatus(shop.id);
    return shopOk(serialize(saved), "Personal KYC saved");
  } catch (err) {
    console.error("[shop/personal_kyc]", err);
    return shopServerError();
  }
}

function serialize(p: {
  name: string | null; dob: Date | null; aadharNumber: string | null;
  panNumber: string | null; firmType: string | null; businessPan: string | null;
  address: string | null; cityTownVillage: string | null; taluk: string | null;
  district: string | null; pincode: string | null; profilePhoto: string | null;
  status: string; remark: string | null; bloodGroup?: { name: string } | null;
}) {
  return {
    name: p.name,
    date_of_birth: p.dob ? p.dob.toISOString().slice(0, 10) : null,
    blood_group: p.bloodGroup?.name ?? null,
    aadhar_number: p.aadharNumber,
    pan_number: p.panNumber,
    firm_type: p.firmType ? p.firmType.toLowerCase() : null,
    business_pan: p.businessPan,
    address: p.address,
    city_town_village: p.cityTownVillage,
    taluk: p.taluk,
    district: p.district,
    pincode: p.pincode,
    profile_photo: p.profilePhoto,
    status: p.status,
    remark: p.remark,
  };
}
