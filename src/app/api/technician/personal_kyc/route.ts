import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, fail, unauthorized, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";
import { recomputeKycStatus } from "@/lib/kyc";
import type { Gender } from "@prisma/client";

// GET /api/technician/personal_kyc — Step 1 read
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const record = await prisma.personalKyc.findUnique({
    where: { technicianId: tech.id },
    include: { bloodGroup: true, location: true },
  });
  return ok(record, record ? "Personal KYC fetched" : "Not started");
}

// POST/PATCH share the same upsert logic.
export async function POST(req: NextRequest) {
  return upsertPersonalKyc(req);
}
export async function PATCH(req: NextRequest) {
  return upsertPersonalKyc(req);
}

const GENDERS: Gender[] = ["MALE", "FEMALE", "OTHER"];

async function upsertPersonalKyc(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    const fields: Record<string, string> = {};
    let profilePhoto: string | undefined;

    if (isMultipart(req)) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          if (k === "profilePhoto" || k === "profile_photo") {
            const stored = await saveUpload(v, "profile", tech.code);
            profilePhoto = stored.path;
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

    const gender =
      fields.gender && GENDERS.includes(fields.gender.toUpperCase() as Gender)
        ? (fields.gender.toUpperCase() as Gender)
        : undefined;

    const dobRaw = fields.dob ?? fields.date_of_birth;
    const bool = (v?: string) =>
      v === undefined ? undefined : ["1", "true", "yes"].includes(v.toLowerCase());

    // Blood group may arrive as an id or as a name (app sends the name string).
    let bloodGroupId = fields.bloodGroupId ?? fields.blood_group_id;
    const bgName = fields.blood_group ?? fields.bloodGroup;
    if (!bloodGroupId && bgName) {
      const bg = await prisma.bloodGroup.findFirst({ where: { name: bgName } });
      if (bg) bloodGroupId = bg.id;
    }

    const data = {
      fullName: fields.fullName ?? fields.full_name ?? fields.name,
      dob: dobRaw ? new Date(dobRaw) : undefined,
      gender,
      bloodGroupId,
      aadharNumber: fields.aadharNumber ?? fields.aadhar_number,
      panNumber: fields.panNumber ?? fields.pan_number,
      addressLine1: fields.addressLine1 ?? fields.address_line1 ?? fields.address,
      addressLine2: fields.addressLine2 ?? fields.address_line2,
      city: fields.city ?? fields.city_town_village,
      taluk: fields.taluk,
      district: fields.district,
      state: fields.state,
      pincode: fields.pincode,
      locationId: fields.locationId ?? fields.location_id,
      domestic: bool(fields.domestic),
      commercial: bool(fields.commercial),
      corporate: bool(fields.corporate),
      ...(profilePhoto ? { profilePhoto } : {}),
      status: "PENDING" as const,
    };

    const record = await prisma.personalKyc.upsert({
      where: { technicianId: tech.id },
      create: { technicianId: tech.id, ...data },
      update: data,
      include: { bloodGroup: true, location: true },
    });

    await recomputeKycStatus(tech.id);
    return ok(record, "Personal KYC saved");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/personal_kyc]", err);
    return serverError();
  }
}
