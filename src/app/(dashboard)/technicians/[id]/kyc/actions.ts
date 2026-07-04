"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recomputeKycStatus } from "@/lib/kyc";
import { saveUpload, UploadError } from "@/lib/upload";
import type { Gender, CompanyType } from "@prisma/client";

export interface StepResult {
  ok: boolean;
  message: string;
}

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

async function maybeUpload(
  fd: FormData,
  key: string,
  type: string,
  code: string,
): Promise<string | undefined> {
  const f = fd.get(key);
  if (f instanceof File && f.size > 0) {
    const stored = await saveUpload(f, type, code);
    return stored.path;
  }
  return undefined;
}

/**
 * Admin saves KYC data for one step on behalf of a technician.
 * `step` comes from a hidden field in each form.
 */
export async function saveKycStep(
  _prev: StepResult | undefined,
  formData: FormData,
): Promise<StepResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  const technicianId = str(formData, "technicianId");
  const step = str(formData, "step");
  if (!technicianId || !step) return { ok: false, message: "Missing technician or step" };

  const tech = await prisma.technician.findUnique({ where: { id: technicianId } });
  if (!tech) return { ok: false, message: "Technician not found" };

  try {
    switch (step) {
      case "profile": {
        const photo = await maybeUpload(formData, "profilePhoto", "profile", tech.code);
        const genderRaw = str(formData, "gender")?.toUpperCase();
        const data = {
          fullName: str(formData, "fullName"),
          dob: str(formData, "dob") ? new Date(str(formData, "dob")!) : undefined,
          gender: (["MALE", "FEMALE", "OTHER"].includes(genderRaw ?? "")
            ? genderRaw
            : undefined) as Gender | undefined,
          bloodGroupId: str(formData, "bloodGroupId"),
          addressLine1: str(formData, "addressLine1"),
          addressLine2: str(formData, "addressLine2"),
          city: str(formData, "city"),
          state: str(formData, "state"),
          pincode: str(formData, "pincode"),
          locationId: str(formData, "locationId"),
          ...(photo ? { profilePhoto: photo } : {}),
          status: "PENDING" as const,
        };
        await prisma.personalKyc.upsert({
          where: { technicianId },
          create: { technicianId, ...data },
          update: data,
        });
        break;
      }

      case "education": {
        const cert = await maybeUpload(formData, "certificateFile", "education", tech.code);
        const year = str(formData, "yearOfPassing");
        const data = {
          qualification: str(formData, "qualification"),
          institution: str(formData, "institution"),
          yearOfPassing: year ? Number(year) : undefined,
          ...(cert ? { certificateFile: cert } : {}),
          status: "PENDING" as const,
        };
        await prisma.educationQualification.upsert({
          where: { technicianId },
          create: { technicianId, ...data },
          update: data,
        });
        break;
      }

      case "services": {
        const serviceCategoryId = str(formData, "serviceCategoryId");
        if (!serviceCategoryId) return { ok: false, message: "Select a service category" };
        const cert = await maybeUpload(formData, "certificateFile", "service-certificate", tech.code);
        await prisma.technicianServiceCategory.upsert({
          where: {
            technicianId_serviceCategoryId: { technicianId, serviceCategoryId },
          },
          create: {
            technicianId,
            serviceCategoryId,
            certificateId: str(formData, "certificateId") ?? null,
            certificateFile: cert ?? null,
            status: "PENDING",
          },
          update: {
            certificateId: str(formData, "certificateId") ?? null,
            ...(cert ? { certificateFile: cert } : {}),
            status: "PENDING",
          },
        });
        break;
      }

      case "bank": {
        const passbook = await maybeUpload(formData, "passbookFile", "bank", tech.code);
        const data = {
          accountHolder: str(formData, "accountHolder"),
          accountNumber: str(formData, "accountNumber"),
          ifsc: str(formData, "ifsc")?.toUpperCase(),
          bankName: str(formData, "bankName"),
          branch: str(formData, "branch"),
          upiId: str(formData, "upiId"),
          ...(passbook ? { passbookFile: passbook } : {}),
          status: "PENDING" as const,
        };
        await prisma.bankKyc.upsert({
          where: { technicianId },
          create: { technicianId, ...data },
          update: data,
        });
        break;
      }

      case "company": {
        const typeRaw = str(formData, "companyType")?.toUpperCase();
        const data = {
          companyType: (["INDIVIDUAL", "PROPRIETORSHIP", "PARTNERSHIP", "PRIVATE_LIMITED", "LLP"].includes(
            typeRaw ?? "",
          )
            ? typeRaw
            : "INDIVIDUAL") as CompanyType,
          companyName: str(formData, "companyName"),
          gstNumber: str(formData, "gstNumber")?.toUpperCase(),
          panNumber: str(formData, "panNumber")?.toUpperCase(),
          registrationNumber: str(formData, "registrationNumber"),
          status: "PENDING" as const,
        };
        await prisma.companyKyc.upsert({
          where: { technicianId },
          create: { technicianId, ...data },
          update: data,
        });
        break;
      }

      case "document": {
        const docType = str(formData, "docType")?.toUpperCase();
        if (!docType) return { ok: false, message: "Document type is required" };
        const front = await maybeUpload(formData, "frontFile", "document", tech.code);
        const back = await maybeUpload(formData, "backFile", "document", tech.code);
        const docNumber = str(formData, "docNumber");
        const existing = await prisma.documentKyc.findFirst({
          where: { technicianId, docType },
        });
        if (existing) {
          await prisma.documentKyc.update({
            where: { id: existing.id },
            data: {
              docNumber: docNumber ?? existing.docNumber,
              ...(front ? { frontFile: front } : {}),
              ...(back ? { backFile: back } : {}),
              status: "PENDING",
            },
          });
        } else {
          await prisma.documentKyc.create({
            data: {
              technicianId,
              docType,
              docNumber: docNumber ?? null,
              frontFile: front ?? null,
              backFile: back ?? null,
              status: "PENDING",
            },
          });
        }
        break;
      }

      default:
        return { ok: false, message: `Unknown step: ${step}` };
    }

    await recomputeKycStatus(technicianId);
    revalidatePath(`/technicians/${technicianId}`);
    revalidatePath(`/technicians/${technicianId}/kyc`);
    return { ok: true, message: `${step[0].toUpperCase()}${step.slice(1)} saved.` };
  } catch (err) {
    if (err instanceof UploadError) return { ok: false, message: err.message };
    console.error("[saveKycStep]", err);
    return { ok: false, message: "Something went wrong." };
  }
}
