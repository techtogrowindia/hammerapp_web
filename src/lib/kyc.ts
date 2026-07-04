import { prisma } from "./prisma";
import type { KycStatus } from "@prisma/client";

/**
 * Rolls up the 5 legal KYC steps into the technician's overall kycStatus.
 * See claude.md §8 (KYC Legal Steps): Profile, Services, Bank, Company, Document.
 *
 * Rules:
 *  - Any step REJECTED            → REJECTED
 *  - Any step NEED_CLARIFICATION  → NEED_CLARIFICATION
 *  - All 5 present & VERIFIED      → VERIFIED
 *  - Any step present (submitted)  → PENDING
 *  - Nothing submitted             → NOT_STARTED
 */
export async function recomputeKycStatus(technicianId: string): Promise<KycStatus> {
  const [personal, bank, company, documents, services] = await Promise.all([
    prisma.personalKyc.findUnique({ where: { technicianId } }),
    prisma.bankKyc.findUnique({ where: { technicianId } }),
    prisma.companyKyc.findUnique({ where: { technicianId } }),
    prisma.documentKyc.findMany({ where: { technicianId } }),
    prisma.technicianServiceCategory.findMany({ where: { technicianId } }),
  ]);

  const stepStatuses: (KycStatus | null)[] = [
    personal?.status ?? null,
    services.length ? worstOf(services.map((s) => s.status)) : null,
    bank?.status ?? null,
    company?.status ?? null,
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

  await prisma.technician.update({
    where: { id: technicianId },
    data: { kycStatus: next },
  });
  return next;
}

// Precedence for combining multiple sub-records into one step status.
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
