import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";
import { verifyGstin } from "@/lib/verify";

// GET /api/shop/company_kyc
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();
  const c = await prisma.shopCompanyKyc.findUnique({ where: { shopId: shop.id } });
  return shopOk(c ? serialize(c) : null, "Company KYC");
}

export async function POST(req: NextRequest) {
  return save(req);
}
export async function PATCH(req: NextRequest) {
  return save(req);
}

async function save(req: NextRequest) {
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
  const b = (k: string) => body[k] === true || body[k] === "true";

  const hasGst = b("has_gst") || b("gst_available");
  const gstin = s("gstin") ?? s("gst_number");

  try {
    // GST verification call: gst_available + gstin, verify and return legal_name.
    let legalName = s("legal_name");
    let gstVerified = false;
    if (hasGst && gstin) {
      const details = await verifyGstin(gstin);
      if (details.verified) {
        legalName = legalName ?? details.legal_name;
        gstVerified = true;
      }

      // If this looks like a pure verify call (no company detail fields), just
      // upsert the GST bits and return gst_details for the app to auto-fill.
      const isVerifyOnly = !s("company_name") && !s("company_address");
      if (isVerifyOnly) {
        await prisma.shopCompanyKyc.upsert({
          where: { shopId: shop.id },
          create: {
            shopId: shop.id, hasGst: true, gstNumber: gstin.toUpperCase(),
            gstVerified, legalName: legalName ?? null, status: "PENDING",
          },
          update: { hasGst: true, gstNumber: gstin.toUpperCase(), gstVerified, legalName: legalName ?? undefined },
        });
        return shopOk(
          {
            gst_available: true,
            gstin: gstin.toUpperCase(),
            legal_name: legalName ?? "",
            gst_details: { legal_name: legalName ?? "", gstin: gstin.toUpperCase(), status: details.status ?? null },
          },
          details.verified ? "GST verified" : "GST could not be verified",
        );
      }
    }

    const numEmp = s("number_of_employees");
    const data = {
      hasGst,
      gstNumber: gstin ? gstin.toUpperCase() : null,
      gstVerified,
      legalName: legalName ?? null,
      companyName: s("company_name") ?? null,
      companyAddress: s("company_address") ?? null,
      cityTownVillage: s("city_town_village") ?? s("company_city") ?? null,
      taluk: s("taluk") ?? null,
      district: s("district") ?? null,
      companyPincode: s("company_pincode") ?? s("pincode") ?? null,
      numberOfEmployees: numEmp ? Number(numEmp) : null,
      status: "PENDING" as const,
    };

    const saved = await prisma.shopCompanyKyc.upsert({
      where: { shopId: shop.id },
      create: { shopId: shop.id, ...data },
      update: data,
    });

    await recomputeShopKycStatus(shop.id);
    return shopOk(serialize(saved), "Company KYC saved");
  } catch (err) {
    console.error("[shop/company_kyc]", err);
    return shopServerError();
  }
}

function serialize(c: {
  hasGst: boolean; gstNumber: string | null; gstVerified: boolean; legalName: string | null;
  companyName: string | null; companyAddress: string | null; cityTownVillage: string | null;
  taluk: string | null; district: string | null; companyPincode: string | null;
  numberOfEmployees: number | null; status: string; remark: string | null;
}) {
  return {
    gst_available: c.hasGst,
    has_gst: c.hasGst,
    gstin: c.gstNumber,
    gst_number: c.gstNumber,
    gst_verified: c.gstVerified,
    legal_name: c.legalName,
    company_name: c.companyName,
    company_address: c.companyAddress,
    city_town_village: c.cityTownVillage,
    taluk: c.taluk,
    district: c.district,
    pincode: c.companyPincode,
    company_pincode: c.companyPincode,
    number_of_employees: c.numberOfEmployees,
    status: c.status,
    remark: c.remark,
  };
}
