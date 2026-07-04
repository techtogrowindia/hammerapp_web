import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopUnauthorized } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

const base = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";
const fileUrl = (p: string | null) => (p ? `${base.replace(/\/$/, "")}/${p}` : null);

// GET /api/shop/shop_kyc_full — aggregate of every KYC section (app pre-fills forms).
export async function GET(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  const [personal, partners, products, company, bank, documents] = await Promise.all([
    prisma.shopPersonalKyc.findUnique({ where: { shopId: shop.id }, include: { bloodGroup: true } }),
    prisma.shopPartner.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "asc" } }),
    prisma.shopProductCategory.findMany({
      where: { shopId: shop.id },
      include: { productCategory: true, productSubcategory: true },
    }),
    prisma.shopCompanyKyc.findUnique({ where: { shopId: shop.id } }),
    prisma.shopBankKyc.findUnique({ where: { shopId: shop.id } }),
    prisma.shopDocumentKyc.findMany({ where: { shopId: shop.id } }),
  ]);

  return shopOk(
    {
      shop_id: shop.id,
      unique_id: shop.code,
      kyc_status: shop.kycStatus,
      profile: personal
        ? {
            name: personal.name,
            date_of_birth: personal.dob ? personal.dob.toISOString().slice(0, 10) : null,
            blood_group: personal.bloodGroup?.name ?? null,
            aadhar_number: personal.aadharNumber,
            pan_number: personal.panNumber,
            firm_type: personal.firmType ? personal.firmType.toLowerCase() : null,
            business_pan: personal.businessPan,
            address: personal.address,
            city_town_village: personal.cityTownVillage,
            taluk: personal.taluk,
            district: personal.district,
            pincode: personal.pincode,
            profile_photo: fileUrl(personal.profilePhoto),
            status: personal.status,
          }
        : null,
      partner_kyc: {
        shop_id: shop.id,
        partners: partners.map((p) => ({ name: p.name, pan_number: p.panNumber })),
      },
      products_kyc: {
        shop_id: shop.id,
        max_items: 3,
        items: products.map((l) => ({
          product_category_id: l.productCategoryId,
          product_category_name: l.productCategory.name,
          product_subcategory_id: l.productSubcategoryId,
          product_subcategory_name: l.productSubcategory?.name ?? null,
          status: l.status,
        })),
      },
      company_kyc: company
        ? {
            gst_available: company.hasGst,
            gstin: company.gstNumber,
            gst_verified: company.gstVerified,
            legal_name: company.legalName,
            company_name: company.companyName,
            company_address: company.companyAddress,
            city_town_village: company.cityTownVillage,
            taluk: company.taluk,
            district: company.district,
            pincode: company.companyPincode,
            number_of_employees: company.numberOfEmployees,
            status: company.status,
          }
        : null,
      bank_kyc: bank
        ? {
            bank_name: bank.bankName,
            account_holder_name: bank.accountHolder,
            account_number: bank.accountNumber,
            account_type: bank.accountType ? bank.accountType.toLowerCase() : null,
            ifsc_code: bank.ifsc,
            branch_name: bank.branch,
            upi_id: bank.upiId,
            status: bank.status,
          }
        : null,
      document_kyc: documents.map((d) => ({
        doc_type: d.docType,
        doc_number: d.docNumber,
        front: fileUrl(d.frontFile),
        back: fileUrl(d.backFile),
        latitude: d.latitude,
        longitude: d.longitude,
        captured_at: d.capturedAt ? d.capturedAt.toISOString() : null,
        status: d.status,
      })),
    },
    "Full shop KYC",
  );
}
