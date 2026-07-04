import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { recomputeKycStatus } from "@/lib/kyc";
import type { CompanyType } from "@prisma/client";

const COMPANY_TYPES: CompanyType[] = [
  "INDIVIDUAL",
  "PROPRIETORSHIP",
  "PARTNERSHIP",
  "PRIVATE_LIMITED",
  "LLP",
];

// GET /api/technician/company-kyc
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const record = await prisma.companyKyc.findUnique({
    where: { technicianId: tech.id },
  });
  return ok(record, record ? "Company KYC fetched" : "Not started");
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
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) {
      if (v !== null && v !== undefined) fields[k] = String(v);
    }

    const rawType = (fields.companyType ?? fields.company_type ?? "").toUpperCase();
    const companyType = COMPANY_TYPES.includes(rawType as CompanyType)
      ? (rawType as CompanyType)
      : undefined;

    const bool = (v?: string) =>
      v === undefined ? undefined : ["1", "true", "yes"].includes(v.toLowerCase());
    const empRaw = fields.numberOfEmployees ?? fields.number_of_employees;

    const data = {
      ...(companyType ? { companyType } : {}),
      companyAvailable: bool(fields.companyAvailable ?? fields.company_available),
      gstAvailable: bool(fields.gstAvailable ?? fields.gst_available),
      companyName: fields.companyName ?? fields.company_name,
      legalName: fields.legalName ?? fields.legal_name,
      gstNumber: (fields.gstNumber ?? fields.gst_number ?? fields.gstin)?.toUpperCase(),
      panNumber: (fields.panNumber ?? fields.pan_number)?.toUpperCase(),
      registrationNumber: fields.registrationNumber ?? fields.registration_number,
      companyAddress: fields.companyAddress ?? fields.company_address,
      cityTownVillage: fields.cityTownVillage ?? fields.city_town_village,
      taluk: fields.taluk,
      district: fields.district,
      pincode: fields.pincode ?? fields.company_pincode,
      numberOfEmployees: empRaw ? Number(empRaw) : undefined,
      status: "PENDING" as const,
    };

    const record = await prisma.companyKyc.upsert({
      where: { technicianId: tech.id },
      create: { technicianId: tech.id, ...data },
      update: data,
    });

    await recomputeKycStatus(tech.id);
    return ok(record, "Company KYC saved");
  } catch (err) {
    console.error("[technician/company-kyc]", err);
    return serverError();
  }
}
