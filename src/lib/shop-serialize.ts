import type { Shop } from "@prisma/client";
import { prisma } from "./prisma";

/** Base user object the shop app expects (LoginResponse.User / OtpVerifyData). */
export function shopUser(s: Shop) {
  return {
    id: s.id,
    unique_id: s.code,
    name: s.name ?? "",
    email: s.email ?? "",
    mobile: s.mobile,
    mobile_verified: s.mobileVerified,
    account_status: s.status.toLowerCase(),
    kyc_status: s.kycStatus,
    registration_paid: s.registrationPaid,
  };
}

/**
 * Builds the `kyc_steps` map the app reads on login/profile:
 * { personal_kyc: {status}, products_kyc: {status}, company_kyc: {status},
 *   bank_kyc: {status}, document_kyc: {status} }.
 */
export async function shopKycSteps(shopId: number) {
  const [personal, company, bank, documents, products, blood] = await Promise.all([
    prisma.shopPersonalKyc.findUnique({ where: { shopId } }),
    prisma.shopCompanyKyc.findUnique({ where: { shopId } }),
    prisma.shopBankKyc.findUnique({ where: { shopId } }),
    prisma.shopDocumentKyc.findMany({ where: { shopId } }),
    prisma.shopProductCategory.findMany({ where: { shopId } }),
    prisma.shopPersonalKyc.findUnique({
      where: { shopId },
      include: { bloodGroup: true },
    }),
  ]);

  const step = (status?: string | null) => ({ status: status ?? "NOT_STARTED" });

  return {
    kyc_steps: {
      personal_kyc: step(personal?.status),
      products_kyc: step(products.length ? products[0].status : null),
      company_kyc: step(company?.status),
      bank_kyc: step(bank?.status),
      document_kyc: step(documents.length ? documents[0].status : null),
    },
    blood_group: blood?.bloodGroup?.name ?? null,
  };
}

/** Full user payload including kyc_steps + blood_group, for login/profile. */
export async function shopUserFull(s: Shop) {
  const extra = await shopKycSteps(s.id);
  return { ...shopUser(s), ...extra };
}
