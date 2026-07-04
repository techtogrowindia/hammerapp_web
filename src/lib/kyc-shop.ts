import { prisma } from "./prisma";
import type { KycStatus } from "@prisma/client";

/**
 * Rolls up the shop's 5 KYC steps into the overall kycStatus.
 * Steps: Profile, Products, Company, Bank, Document.
 * (Partners are part of the Profile/Company legal step, not a separate roll-up.)
 *
 * Same precedence rules as the technician roll-up (see kyc.ts).
 */
export async function recomputeShopKycStatus(shopId: number): Promise<KycStatus> {
  const [personal, company, bank, documents, products] = await Promise.all([
    prisma.shopPersonalKyc.findUnique({ where: { shopId } }),
    prisma.shopCompanyKyc.findUnique({ where: { shopId } }),
    prisma.shopBankKyc.findUnique({ where: { shopId } }),
    prisma.shopDocumentKyc.findMany({ where: { shopId } }),
    prisma.shopProductCategory.findMany({ where: { shopId } }),
  ]);

  const stepStatuses: (KycStatus | null)[] = [
    personal?.status ?? null,
    products.length ? worstOf(products.map((p) => p.status)) : null,
    company?.status ?? null,
    bank?.status ?? null,
    documents.length ? worstOf(documents.map((d) => d.status)) : null,
  ];

  const present = stepStatuses.filter((s): s is KycStatus => s !== null);

  let next: KycStatus;
  if (present.includes("REJECTED")) {
    next = "REJECTED";
  } else if (present.includes("NEED_CLARIFICATION")) {
    next = "NEED_CLARIFICATION";
  } else if (present.length === 5 && present.every((s) => s === "VERIFIED")) {
    next = "VERIFIED";
  } else if (present.length > 0) {
    next = "PENDING";
  } else {
    next = "NOT_STARTED";
  }

  await prisma.shop.update({ where: { id: shopId }, data: { kycStatus: next } });
  return next;
}

const PRECEDENCE: KycStatus[] = [
  "REJECTED",
  "NEED_CLARIFICATION",
  "NOT_COMPLETED",
  "PENDING",
  "NOT_STARTED",
  "VERIFIED",
];

function worstOf(statuses: KycStatus[]): KycStatus {
  for (const s of PRECEDENCE) {
    if (statuses.includes(s)) return s;
  }
  return "PENDING";
}
