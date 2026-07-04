"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recomputeKycStatus } from "@/lib/kyc";
import { checkAadharPanLinkage } from "@/lib/verify";
import type { KycStatus } from "@prisma/client";

export type KycStep = "profile" | "services" | "bank" | "company" | "document";

export interface ReviewInput {
  technicianId: string;
  step: KycStep;
  status: Extract<KycStatus, "VERIFIED" | "REJECTED" | "NEED_CLARIFICATION">;
  remark?: string;
}

/**
 * Admin action: set the review status of a single KYC step for a technician,
 * then roll up the overall technician KYC status.
 */
export async function reviewKycStep(input: ReviewInput) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const { technicianId, step, status, remark } = input;

  if (status === "REJECTED" && !remark?.trim()) {
    return { ok: false, message: "A reason is required to reject." };
  }

  const data = { status, remark: remark?.trim() || null };

  try {
    switch (step) {
      case "profile":
        await prisma.personalKyc.updateMany({ where: { technicianId }, data });
        break;
      case "bank":
        await prisma.bankKyc.updateMany({ where: { technicianId }, data });
        break;
      case "company":
        await prisma.companyKyc.updateMany({ where: { technicianId }, data });
        break;
      case "services":
        // No remark column on the join table — status only.
        await prisma.technicianServiceCategory.updateMany({
          where: { technicianId },
          data: { status },
        });
        break;
      case "document":
        await prisma.documentKyc.updateMany({ where: { technicianId }, data });
        break;
    }

    const overall = await recomputeKycStatus(technicianId);
    revalidatePath(`/technicians/${technicianId}`);
    revalidatePath("/technicians");
    return { ok: true, message: "Updated", overall };
  } catch (err) {
    console.error("[reviewKycStep]", err);
    return { ok: false, message: "Something went wrong" };
  }
}

/** Run an Aadhaar–PAN linkage check for a technician and store the result. */
export async function checkTechnicianAadharPan(technicianId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  try {
    const t = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { companyKyc: true, documents: true },
    });
    if (!t) return { ok: false, message: "Technician not found" };

    const aadhaarDoc = t.documents.find((d) => d.docType.toUpperCase().includes("AADHA"));
    const aadhar = aadhaarDoc?.docNumber ?? "";
    const pan = t.companyKyc?.panNumber ?? "";
    if (!aadhar || !pan) {
      return { ok: false, message: "Aadhaar (document) and PAN (company) are both required." };
    }

    const { linked, mock } = await checkAadharPanLinkage(aadhar, pan);
    await prisma.technician.update({
      where: { id: technicianId },
      data: { aadharPanLinked: linked, aadharPanCheckedAt: new Date() },
    });
    revalidatePath(`/technicians/${technicianId}`);
    return { ok: true, linked, mock };
  } catch (err) {
    console.error("[checkTechnicianAadharPan]", err);
    return { ok: false, message: "Verification failed" };
  }
}

/** Set the technician account status (ACTIVE / INACTIVE / TERMINATED). */
export async function setAccountStatus(
  technicianId: string,
  status: "ACTIVE" | "INACTIVE" | "TERMINATED",
) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  try {
    await prisma.technician.update({ where: { id: technicianId }, data: { status } });
    revalidatePath(`/technicians/${technicianId}`);
    revalidatePath("/technicians");
    return { ok: true, message: "Account status updated" };
  } catch (err) {
    console.error("[setAccountStatus]", err);
    return { ok: false, message: "Something went wrong" };
  }
}
