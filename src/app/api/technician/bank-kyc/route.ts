import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";
import { recomputeKycStatus } from "@/lib/kyc";

// GET /api/technician/bank-kyc
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const record = await prisma.bankKyc.findUnique({
    where: { technicianId: tech.id },
  });
  return ok(record, record ? "Bank KYC fetched" : "Not started");
}

export async function POST(req: NextRequest) {
  return upsert(req);
}
export async function PATCH(req: NextRequest) {
  return upsert(req);
}

async function upsert(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const fields: Record<string, string> = {};
    let passbookFile: string | undefined;

    if (isMultipart(req)) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          if (k === "passbookFile" || k === "passbook_file") {
            const stored = await saveUpload(v, "bank", tech.code);
            passbookFile = stored.path;
          }
        } else {
          fields[k] = String(v);
        }
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      for (const [k, v] of Object.entries(body)) {
        if (v !== null && v !== undefined) fields[k] = String(v);
      }
    }

    const data = {
      accountHolder: fields.accountHolder ?? fields.account_holder,
      accountNumber: fields.accountNumber ?? fields.account_number,
      ifsc: fields.ifsc?.toUpperCase(),
      bankName: fields.bankName ?? fields.bank_name,
      branch: fields.branch,
      upiId: fields.upiId ?? fields.upi_id,
      ...(passbookFile ? { passbookFile } : {}),
      status: "PENDING" as const,
    };

    const record = await prisma.bankKyc.upsert({
      where: { technicianId: tech.id },
      create: { technicianId: tech.id, ...data },
      update: data,
    });

    await recomputeKycStatus(tech.id);
    return ok(record, "Bank KYC saved");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/bank-kyc]", err);
    return serverError();
  }
}
