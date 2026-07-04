"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";
import { checkAadharPanLinkage } from "@/lib/verify";
import type { KycStatus } from "@prisma/client";

export type ShopKycStep = "profile" | "products" | "company" | "bank" | "document";

export interface ShopReviewInput {
  shopId: number;
  step: ShopKycStep;
  status: Extract<KycStatus, "VERIFIED" | "REJECTED" | "NEED_CLARIFICATION">;
  remark?: string;
}

/** Admin: review one shop KYC step, then roll up the overall status. */
export async function reviewShopKycStep(input: ShopReviewInput) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const { shopId, step, status, remark } = input;
  if (status === "REJECTED" && !remark?.trim()) {
    return { ok: false, message: "A reason is required to reject." };
  }
  const data = { status, remark: remark?.trim() || null };

  try {
    switch (step) {
      case "profile":
        await prisma.shopPersonalKyc.updateMany({ where: { shopId }, data });
        break;
      case "company":
        await prisma.shopCompanyKyc.updateMany({ where: { shopId }, data });
        break;
      case "bank":
        await prisma.shopBankKyc.updateMany({ where: { shopId }, data });
        break;
      case "products":
        // No remark column on the join table — status only.
        await prisma.shopProductCategory.updateMany({ where: { shopId }, data: { status } });
        break;
      case "document":
        await prisma.shopDocumentKyc.updateMany({ where: { shopId }, data });
        break;
    }

    const overall = await recomputeShopKycStatus(shopId);
    revalidatePath(`/shops-onboarding/${shopId}`);
    revalidatePath("/shops-onboarding");
    return { ok: true, message: "Updated", overall };
  } catch (err) {
    console.error("[reviewShopKycStep]", err);
    return { ok: false, message: "Something went wrong" };
  }
}

/** Run an Aadhaar–PAN linkage check for a shop and store the result. */
export async function checkShopAadharPan(shopId: number) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  try {
    const p = await prisma.shopPersonalKyc.findUnique({ where: { shopId } });
    const aadhar = p?.aadharNumber ?? "";
    const pan = p?.panNumber ?? "";
    if (!aadhar || !pan) {
      return { ok: false, message: "Aadhaar and PAN are both required in Profile KYC." };
    }

    const { linked, mock } = await checkAadharPanLinkage(aadhar, pan);
    await prisma.shop.update({
      where: { id: shopId },
      data: { aadharPanLinked: linked, aadharPanCheckedAt: new Date() },
    });
    revalidatePath(`/shops-onboarding/${shopId}`);
    return { ok: true, linked, mock };
  } catch (err) {
    console.error("[checkShopAadharPan]", err);
    return { ok: false, message: "Verification failed" };
  }
}

/** Set the shop account status (ACTIVE / INACTIVE / TERMINATED). */
export async function setShopAccountStatus(
  shopId: number,
  status: "ACTIVE" | "INACTIVE" | "TERMINATED",
) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };
  try {
    await prisma.shop.update({ where: { id: shopId }, data: { status } });
    revalidatePath(`/shops-onboarding/${shopId}`);
    revalidatePath("/shops-onboarding");
    return { ok: true, message: "Account status updated" };
  } catch (err) {
    console.error("[setShopAccountStatus]", err);
    return { ok: false, message: "Something went wrong" };
  }
}
