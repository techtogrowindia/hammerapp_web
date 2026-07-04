"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recomputeShopKycStatus } from "@/lib/kyc-shop";
import { saveUpload, UploadError } from "@/lib/upload";
import type { FirmType, BankAccountType } from "@prisma/client";

export interface StepResult {
  ok: boolean;
  message: string;
}

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

async function maybeUpload(fd: FormData, key: string, type: string, code: string) {
  const f = fd.get(key);
  if (f instanceof File && f.size > 0) {
    const stored = await saveUpload(f, type, code);
    return stored.path;
  }
  return undefined;
}

function parseFirm(raw?: string): FirmType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (v === "proprietorship") return "PROPRIETORSHIP";
  if (v === "partnership") return "PARTNERSHIP";
  if (v === "privatelimited") return "PRIVATE_LIMITED";
  return undefined;
}

function parseAccountType(raw?: string): BankAccountType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v.startsWith("sav")) return "SAVINGS";
  if (v.startsWith("cur")) return "CURRENT";
  return undefined;
}

export async function saveShopKycStep(
  _prev: StepResult | undefined,
  formData: FormData,
): Promise<StepResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const shopId = Number(str(formData, "shopId"));
  const step = str(formData, "step");
  if (!Number.isInteger(shopId) || !step) return { ok: false, message: "Missing shop or step" };

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { ok: false, message: "Shop not found" };

  try {
    switch (step) {
      case "profile": {
        const photo = await maybeUpload(formData, "profilePhoto", "shop-profile", shop.code);
        const bloodGroupName = str(formData, "bloodGroup");
        const bloodGroupId = bloodGroupName
          ? (await prisma.bloodGroup.findFirst({ where: { name: bloodGroupName } }))?.id
          : undefined;
        const dob = str(formData, "dob");
        const data = {
          name: str(formData, "name"),
          dob: dob ? new Date(dob) : undefined,
          bloodGroupId,
          aadharNumber: str(formData, "aadharNumber"),
          panNumber: str(formData, "panNumber")?.toUpperCase(),
          firmType: parseFirm(str(formData, "firmType")),
          businessPan: str(formData, "businessPan")?.toUpperCase(),
          address: str(formData, "address"),
          cityTownVillage: str(formData, "cityTownVillage"),
          taluk: str(formData, "taluk"),
          district: str(formData, "district"),
          pincode: str(formData, "pincode"),
          ...(photo ? { profilePhoto: photo } : {}),
          status: "PENDING" as const,
        };
        await prisma.shopPersonalKyc.upsert({
          where: { shopId },
          create: { shopId, ...data },
          update: data,
        });
        break;
      }

      case "partners": {
        // One partner name per line.
        const raw = str(formData, "partners") ?? "";
        const names = raw.split(/[\n,]/).map((n) => n.trim()).filter(Boolean);
        await prisma.$transaction([
          prisma.shopPartner.deleteMany({ where: { shopId } }),
          ...(names.length
            ? [prisma.shopPartner.createMany({ data: names.map((name) => ({ shopId, name })) })]
            : []),
        ]);
        break;
      }

      case "products": {
        const productCategoryId = Number(str(formData, "productCategoryId"));
        if (!Number.isInteger(productCategoryId)) return { ok: false, message: "Select a product category" };
        const subRaw = str(formData, "productSubcategoryId");
        const productSubcategoryId = subRaw ? Number(subRaw) : null;

        const count = await prisma.shopProductCategory.count({ where: { shopId } });
        const exists = await prisma.shopProductCategory.findFirst({ where: { shopId, productCategoryId } });
        if (!exists && count >= 3) {
          return { ok: false, message: "A shop can have at most 3 product categories" };
        }
        if (exists) {
          await prisma.shopProductCategory.update({
            where: { id: exists.id },
            data: { productSubcategoryId, status: "PENDING" },
          });
        } else {
          await prisma.shopProductCategory.create({
            data: { shopId, productCategoryId, productSubcategoryId, status: "PENDING" },
          });
        }
        break;
      }

      case "company": {
        const hasGst = str(formData, "hasGst") === "yes";
        const gstin = str(formData, "gstNumber")?.toUpperCase();
        const numEmp = str(formData, "numberOfEmployees");
        const data = {
          hasGst,
          gstNumber: gstin ?? null,
          legalName: str(formData, "legalName") ?? null,
          companyName: str(formData, "companyName") ?? null,
          companyAddress: str(formData, "companyAddress") ?? null,
          cityTownVillage: str(formData, "cityTownVillage") ?? null,
          taluk: str(formData, "taluk") ?? null,
          district: str(formData, "district") ?? null,
          companyPincode: str(formData, "companyPincode") ?? null,
          numberOfEmployees: numEmp ? Number(numEmp) : null,
          status: "PENDING" as const,
        };
        await prisma.shopCompanyKyc.upsert({
          where: { shopId },
          create: { shopId, ...data },
          update: data,
        });
        break;
      }

      case "bank": {
        const passbook = await maybeUpload(formData, "passbookFile", "shop-bank", shop.code);
        const data = {
          bankName: str(formData, "bankName"),
          accountHolder: str(formData, "accountHolder"),
          accountNumber: str(formData, "accountNumber"),
          accountType: parseAccountType(str(formData, "accountType")),
          ifsc: str(formData, "ifsc")?.toUpperCase(),
          branch: str(formData, "branch"),
          upiId: str(formData, "upiId"),
          ...(passbook ? { passbookFile: passbook } : {}),
          status: "PENDING" as const,
        };
        await prisma.shopBankKyc.upsert({
          where: { shopId },
          create: { shopId, ...data },
          update: data,
        });
        break;
      }

      case "document": {
        const docType = str(formData, "docType")?.toUpperCase();
        if (!docType) return { ok: false, message: "Document type is required" };
        const front = await maybeUpload(formData, "frontFile", `shop-${docType.toLowerCase()}`, shop.code);
        const back = await maybeUpload(formData, "backFile", `shop-${docType.toLowerCase()}`, shop.code);
        const docNumber = str(formData, "docNumber");
        const lat = str(formData, "latitude");
        const long = str(formData, "longitude");
        const geo =
          docType === "SHOP_PHOTO"
            ? {
                latitude: lat ? Number(lat) : null,
                longitude: long ? Number(long) : null,
                capturedAt: new Date(),
              }
            : {};

        const existing = await prisma.shopDocumentKyc.findFirst({ where: { shopId, docType } });
        if (existing) {
          await prisma.shopDocumentKyc.update({
            where: { id: existing.id },
            data: {
              docNumber: docNumber ?? existing.docNumber,
              ...(front ? { frontFile: front } : {}),
              ...(back ? { backFile: back } : {}),
              ...geo,
              status: "PENDING",
            },
          });
        } else {
          await prisma.shopDocumentKyc.create({
            data: {
              shopId, docType, docNumber: docNumber ?? null,
              frontFile: front ?? null, backFile: back ?? null, ...geo, status: "PENDING",
            },
          });
        }
        break;
      }

      default:
        return { ok: false, message: `Unknown step: ${step}` };
    }

    await recomputeShopKycStatus(shopId);
    revalidatePath(`/shops-onboarding/${shopId}`);
    revalidatePath(`/shops-onboarding/${shopId}/kyc`);
    return { ok: true, message: `${step[0].toUpperCase()}${step.slice(1)} saved.` };
  } catch (err) {
    if (err instanceof UploadError) return { ok: false, message: err.message };
    console.error("[saveShopKycStep]", err);
    return { ok: false, message: "Something went wrong." };
  }
}
