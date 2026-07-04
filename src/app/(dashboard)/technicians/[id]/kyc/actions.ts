"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recomputeKycStatus } from "@/lib/kyc";
import { saveUpload, UploadError } from "@/lib/upload";
import type { Gender, CompanyType, BankAccountType } from "@prisma/client";

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

/** Save every file under `key` (supports multiple selected files). */
async function uploadAll(
  fd: FormData,
  key: string,
  type: string,
  code: string,
): Promise<string[]> {
  const paths: string[] = [];
  for (const f of fd.getAll(key)) {
    if (f instanceof File && f.size > 0) {
      const stored = await saveUpload(f, type, code);
      paths.push(stored.path);
    }
  }
  return paths;
}

/** Checkbox → boolean (checked sends "true"). */
function checked(fd: FormData, key: string): boolean {
  return fd.getAll(key).includes("true");
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
          aadharNumber: str(formData, "aadharNumber"),
          panNumber: str(formData, "panNumber")?.toUpperCase(),
          addressLine1: str(formData, "addressLine1"),
          addressLine2: str(formData, "addressLine2"),
          city: str(formData, "city"),
          taluk: str(formData, "taluk"),
          district: str(formData, "district"),
          state: str(formData, "state"),
          pincode: str(formData, "pincode"),
          locationId: str(formData, "locationId"),
          domestic: checked(formData, "domestic"),
          commercial: checked(formData, "commercial"),
          corporate: checked(formData, "corporate"),
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
        const newCerts = await uploadAll(formData, "certificateFile", "education", tech.code);
        const year = str(formData, "yearOfPassing");
        const existingEdu = await prisma.educationQualification.findUnique({
          where: { technicianId },
        });
        const certificateFiles = [...(existingEdu?.certificateFiles ?? []), ...newCerts];
        const data = {
          qualification: str(formData, "qualification"),
          institution: str(formData, "institution"),
          yearOfPassing: year ? Number(year) : undefined,
          ...(newCerts.length
            ? { certificateFile: newCerts[0], certificateFiles }
            : {}),
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
        const yoe = str(formData, "yearsOfExperience");
        await prisma.technicianServiceCategory.upsert({
          where: {
            technicianId_serviceCategoryId: { technicianId, serviceCategoryId },
          },
          create: {
            technicianId,
            serviceCategoryId,
            certificateId: str(formData, "certificateId") ?? null,
            certificateFile: cert ?? null,
            yearsOfExperience: yoe ? Number(yoe) : null,
            status: "PENDING",
          },
          update: {
            certificateId: str(formData, "certificateId") ?? null,
            ...(cert ? { certificateFile: cert } : {}),
            ...(yoe ? { yearsOfExperience: Number(yoe) } : {}),
            status: "PENDING",
          },
        });
        break;
      }

      case "bank": {
        const passbook = await maybeUpload(formData, "passbookFile", "bank", tech.code);
        const accountTypeRaw = str(formData, "accountType");
        const accountType: BankAccountType | undefined =
          accountTypeRaw?.toLowerCase().startsWith("saving") ? "SAVINGS" :
          accountTypeRaw?.toLowerCase().startsWith("current") ? "CURRENT" : undefined;
        const data = {
          accountHolder: str(formData, "accountHolder"),
          accountNumber: str(formData, "accountNumber"),
          accountType,
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
        const emp = str(formData, "numberOfEmployees");
        const data = {
          companyType: (["INDIVIDUAL", "PROPRIETORSHIP", "PARTNERSHIP", "PRIVATE_LIMITED", "LLP"].includes(
            typeRaw ?? "",
          )
            ? typeRaw
            : "INDIVIDUAL") as CompanyType,
          companyAvailable: checked(formData, "companyAvailable"),
          gstAvailable: checked(formData, "gstAvailable"),
          companyName: str(formData, "companyName"),
          legalName: str(formData, "legalName"),
          gstNumber: str(formData, "gstNumber")?.toUpperCase(),
          panNumber: str(formData, "panNumber")?.toUpperCase(),
          registrationNumber: str(formData, "registrationNumber"),
          companyAddress: str(formData, "companyAddress"),
          cityTownVillage: str(formData, "cityTownVillage"),
          taluk: str(formData, "companyTaluk"),
          district: str(formData, "companyDistrict"),
          pincode: str(formData, "companyPincode"),
          numberOfEmployees: emp ? Number(emp) : undefined,
          status: "PENDING" as const,
        };
        await prisma.companyKyc.upsert({
          where: { technicianId },
          create: { technicianId, ...data },
          update: data,
        });
        break;
      }

      case "general_profile": {
        const nomineeCount = Number(str(formData, "nomineeCount") ?? "0");
        const nominees: { name: string; aadharCardNo: string | null; phoneNumber: string | null; percentage: number | null }[] = [];
        for (let i = 0; i < nomineeCount; i++) {
          const name = str(formData, `nominee_name_${i}`);
          if (!name) continue;
          nominees.push({
            name,
            aadharCardNo: str(formData, `nominee_aadhar_${i}`) ?? null,
            phoneNumber: str(formData, `nominee_phone_${i}`) ?? null,
            percentage: str(formData, `nominee_pct_${i}`) ? Number(str(formData, `nominee_pct_${i}`)) : null,
          });
        }
        const marriageDateRaw = str(formData, "marriageDate");
        const joiningDateRaw = str(formData, "joiningDate");
        const welfareExpiryRaw = str(formData, "welfareCardExpiry");
        const policeIssueDateRaw = str(formData, "policeVerifIssueDate");
        const insuranceStartRaw = str(formData, "insurancePolicyStart");
        const insuranceExpiryRaw = str(formData, "insurancePolicyExpiry");
        const festivals = formData.getAll("festivalSelection").map(String).filter(Boolean);

        // File uploads for GP sub-sections
        const welfareFile = await maybeUpload(formData, "welfareCardFile", "general-profile", tech.code);
        const policeFile = await maybeUpload(formData, "policeVerifFile", "general-profile", tech.code);
        const insuranceFile = await maybeUpload(formData, "insuranceFile", "general-profile", tech.code);

        const profileData = {
          isMarried: checked(formData, "isMarried"),
          spouseName: str(formData, "spouseName"),
          marriageDate: marriageDateRaw ? new Date(marriageDateRaw) : null,
          emergencyContactNo: str(formData, "emergencyContactNo"),
          sosVisibility: checked(formData, "sosVisibility"),
          genderIdentity: str(formData, "genderIdentity"),
          festivalSelection: festivals,
          earningScreenVisible: checked(formData, "earningScreenVisible"),
          tshirtSize: str(formData, "tshirtSize"),
          colourPreference: str(formData, "colourPreference"),
          employeeId: str(formData, "employeeId"),
          department: str(formData, "department"),
          designation: str(formData, "designation"),
          joiningDate: joiningDateRaw ? new Date(joiningDateRaw) : null,
          // Welfare card
          welfareCard: checked(formData, "welfareCard"),
          welfareCardScheme: str(formData, "welfareCardScheme"),
          welfareCardExpiry: welfareExpiryRaw ? new Date(welfareExpiryRaw) : null,
          ...(welfareFile ? { welfareCardFile: welfareFile } : {}),
          // Police verification
          policeVerification: checked(formData, "policeVerification"),
          policeVerifCertNo: str(formData, "policeVerifCertNo"),
          policeVerifIssuedBy: str(formData, "policeVerifIssuedBy"),
          policeVerifIssueDate: policeIssueDateRaw ? new Date(policeIssueDateRaw) : null,
          policeVerifStatus: str(formData, "policeVerifStatus"),
          ...(policeFile ? { policeVerifFile: policeFile } : {}),
          // Insurance
          insurance: checked(formData, "insurance"),
          insuranceProvider: str(formData, "insuranceProvider"),
          insurancePolicyNo: str(formData, "insurancePolicyNo"),
          insurancePolicyStart: insuranceStartRaw ? new Date(insuranceStartRaw) : null,
          insurancePolicyExpiry: insuranceExpiryRaw ? new Date(insuranceExpiryRaw) : null,
          ...(insuranceFile ? { insuranceFile } : {}),
        };
        const gp = await prisma.technicianGeneralProfile.upsert({
          where: { technicianId },
          create: { technicianId, ...profileData },
          update: profileData,
        });
        // Replace nominees atomically
        await prisma.technicianNominee.deleteMany({ where: { generalProfileId: gp.id } });
        if (nominees.length > 0) {
          await prisma.technicianNominee.createMany({
            data: nominees.map((n) => ({ generalProfileId: gp.id, ...n })),
          });
        }
        break;
      }

      case "leaf_services": {
        const serviceIds = formData.getAll("leafServiceIds").map(String).filter(Boolean);
        // Replace all current leaf services for this technician
        await prisma.$transaction([
          prisma.technicianService.deleteMany({ where: { technicianId } }),
          ...(serviceIds.length
            ? [
                prisma.technicianService.createMany({
                  data: serviceIds.map((serviceId) => ({
                    technicianId,
                    serviceId,
                    status: "PENDING" as const,
                  })),
                  skipDuplicates: true,
                }),
              ]
            : []),
        ]);
        break;
      }

      case "service_certificate": {
        const serviceId = str(formData, "serviceId");
        if (!serviceId) return { ok: false, message: "Select a service" };
        const files = await uploadAll(formData, "certFiles", "service-certificate", tech.code);
        const noExpiry = checked(formData, "noExpiry");
        const expiry = str(formData, "expiryDate");
        await prisma.serviceCertificate.create({
          data: {
            technicianId,
            serviceId,
            certificateId: str(formData, "certificateId") ?? null,
            certificateNumber: str(formData, "certificateNumber") ?? null,
            noExpiry,
            expiryDate: !noExpiry && expiry ? new Date(expiry) : null,
            files,
            status: "PENDING",
          },
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
