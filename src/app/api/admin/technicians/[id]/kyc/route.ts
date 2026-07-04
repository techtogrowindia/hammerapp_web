import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recomputeKycStatus } from "@/lib/kyc";
import { ok, fail, unauthorized, notFound, serverError } from "@/lib/api";
import { saveUpload, UploadError, isMultipart } from "@/lib/upload";
import type { Gender, CompanyType } from "@prisma/client";

const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];
const COMPANY_TYPES: CompanyType[] = [
  "INDIVIDUAL",
  "PROPRIETORSHIP",
  "PARTNERSHIP",
  "PRIVATE_LIMITED",
  "LLP",
];

// PATCH /api/admin/technicians/{id}/kyc — admin submits/updates KYC data
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const { id } = await params;
  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return notFound("Technician not found");

  try {
    const fields: Record<string, string | undefined> = {};
    let profilePhoto: string | undefined;
    let step: string | undefined;

    if (isMultipart(req)) {
      const form = await req.formData();
      step = form.get("step") as string;
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          if (k === "profilePhoto" && step === "profile") {
            const stored = await saveUpload(v, "profile", tech.code);
            profilePhoto = stored.path;
          }
        } else if (typeof v === "string") {
          fields[k] = v;
        }
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      step = body.step as string;
      for (const [k, v] of Object.entries(body)) {
        if (k !== "step" && v !== null && v !== undefined) {
          fields[k] = String(v);
        }
      }
    }

    if (!step) return fail("step is required");

    switch (step) {
      case "profile": {
        const data = {
          fullName: fields.fullName || fields.full_name,
          dob: fields.dob ? new Date(fields.dob) : undefined,
          gender: GENDERS.includes(fields.gender?.toUpperCase() as Gender)
            ? (fields.gender!.toUpperCase() as Gender)
            : undefined,
          bloodGroupId: fields.bloodGroupId || fields.blood_group_id,
          addressLine1: fields.addressLine1 || fields.address_line1,
          addressLine2: fields.addressLine2 || fields.address_line2,
          city: fields.city,
          state: fields.state,
          pincode: fields.pincode,
          locationId: fields.locationId || fields.location_id,
          ...(profilePhoto ? { profilePhoto } : {}),
          status: "PENDING" as const,
        };
        await prisma.personalKyc.upsert({
          where: { technicianId: id },
          create: { technicianId: id, ...data },
          update: data,
        });
        break;
      }

      case "education": {
        const data = {
          qualification: fields.qualification,
          institution: fields.institution,
          yearOfPassing: fields.yearOfPassing ? Number(fields.yearOfPassing) : undefined,
          status: "PENDING" as const,
        };
        await prisma.educationQualification.upsert({
          where: { technicianId: id },
          create: { technicianId: id, ...data },
          update: data,
        });
        break;
      }

      case "bank": {
        const data = {
          accountHolder: fields.accountHolder || fields.account_holder,
          accountNumber: fields.accountNumber || fields.account_number,
          ifsc: (fields.ifsc || "").toUpperCase(),
          bankName: fields.bankName || fields.bank_name,
          branch: fields.branch,
          upiId: fields.upiId || fields.upi_id,
          status: "PENDING" as const,
        };
        await prisma.bankKyc.upsert({
          where: { technicianId: id },
          create: { technicianId: id, ...data },
          update: data,
        });
        break;
      }

      case "company": {
        const companyTypeRaw = (fields.companyType || "INDIVIDUAL").toUpperCase();
        const data = {
          companyType: (COMPANY_TYPES.includes(companyTypeRaw as CompanyType)
            ? companyTypeRaw
            : "INDIVIDUAL") as CompanyType,
          companyName: fields.companyName || fields.company_name,
          gstNumber: (fields.gstNumber || fields.gst_number)?.toUpperCase(),
          panNumber: (fields.panNumber || fields.pan_number)?.toUpperCase(),
          registrationNumber: fields.registrationNumber || fields.registration_number,
          status: "PENDING" as const,
        };
        await prisma.companyKyc.upsert({
          where: { technicianId: id },
          create: { technicianId: id, ...data },
          update: data,
        });
        break;
      }

      case "document": {
        const docType = (fields.docType || fields.doc_type)?.toUpperCase();
        if (!docType) return fail("docType is required");
        const docNumber = fields.docNumber || fields.doc_number;
        const existing = await prisma.documentKyc.findFirst({
          where: { technicianId: id, docType },
        });
        if (existing) {
          await prisma.documentKyc.update({
            where: { id: existing.id },
            data: { docNumber: docNumber || existing.docNumber, status: "PENDING" },
          });
        } else {
          await prisma.documentKyc.create({
            data: {
              technicianId: id,
              docType,
              docNumber: docNumber || null,
              status: "PENDING",
            },
          });
        }
        break;
      }

      default:
        return fail(`Unknown step: ${step}`);
    }

    await recomputeKycStatus(id);
    return ok({ step, updated: true }, `${step} KYC data saved`);
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[admin/technicians/kyc PATCH]", err);
    return serverError();
  }
}
