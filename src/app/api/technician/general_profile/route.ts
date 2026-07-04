import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, unauthorized, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveUpload, isMultipart, UploadError } from "@/lib/upload";

// GET /api/technician/general_profile — fetch full general profile with nominees
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const profile = await prisma.technicianGeneralProfile.findUnique({
    where: { technicianId: tech.id },
    include: { nominees: { orderBy: { createdAt: "asc" } } },
  });

  return ok(profile ?? null, profile ? "Profile fetched" : "Not started");
}

// POST /api/technician/general_profile — app sends POST with X-HTTP-Method-Override: PATCH
// Also handles multipart when there are file attachments (welfare/police/insurance docs).
export async function POST(req: NextRequest) {
  return upsertGeneralProfile(req);
}

// PATCH /api/technician/general_profile — standard PATCH from admin / direct clients
export async function PATCH(req: NextRequest) {
  return upsertGeneralProfile(req);
}

async function upsertGeneralProfile(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  try {
    let body: Record<string, unknown> = {};
    const filePaths: { welfareCardFile?: string; policeVerifFile?: string; insuranceFile?: string } = {};

    if (isMultipart(req)) {
      // Multipart: boolean fields arrive as "1"/"0" strings, arrays as repeated keys
      const form = await req.formData();
      const raw: Record<string, string[]> = {};
      for (const [k, v] of form.entries()) {
        if (v instanceof File && v.size > 0) {
          if (k === "welfare_card_file" || k === "welfareCardFile") {
            filePaths.welfareCardFile = (await saveUpload(v, "general-profile", tech.code)).path;
          } else if (k === "police_verif_file" || k === "policeVerifFile") {
            filePaths.policeVerifFile = (await saveUpload(v, "general-profile", tech.code)).path;
          } else if (k === "insurance_file" || k === "insuranceFile") {
            filePaths.insuranceFile = (await saveUpload(v, "general-profile", tech.code)).path;
          }
        } else {
          if (!raw[k]) raw[k] = [];
          raw[k].push(String(v));
        }
      }
      // Flatten single-value keys, keep arrays for multi-value keys
      for (const [k, vs] of Object.entries(raw)) {
        body[k] = vs.length === 1 ? vs[0] : vs;
      }
    } else {
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return fail("Invalid request body");
      }
    }

    const str = (k: string): string | undefined => {
      const v = body[k];
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    const bool = (k: string): boolean | undefined => {
      if (!(k in body)) return undefined;
      return body[k] === true || body[k] === "true" || body[k] === 1 || body[k] === "1";
    };
    const date = (k: string): Date | undefined => {
      const s = str(k);
      return s ? new Date(s) : undefined;
    };
    const strArr = (k: string): string[] | undefined => {
      const v = body[k];
      if (Array.isArray(v)) return (v as unknown[]).filter((s): s is string => typeof s === "string");
      if (typeof v === "string" && v.trim()) return [v.trim()];
      return undefined;
    };

    const profileData = {
      isMarried: bool("is_married"),
      spouseName: str("spouse_name"),
      marriageDate: date("marriage_date"),
      emergencyContactNo: str("emergency_contact_no_sos"),
      sosVisibility: bool("sos_visibility"),
      genderIdentity: str("gender_identity"),
      festivalSelection: strArr("festival_selection"),
      earningScreenVisible: bool("earning_screen_visible"),
      tshirtSize: str("tshirt_size"),
      colourPreference: str("colour_preference"),
      employeeId: str("employee_id"),
      department: str("department"),
      designation: str("designation"),
      joiningDate: date("joining_date"),
      // Welfare card
      welfareCard: bool("welfare_card"),
      welfareCardScheme: str("welfare_card_scheme"),
      welfareCardExpiry: date("welfare_card_expiry"),
      ...(filePaths.welfareCardFile ? { welfareCardFile: filePaths.welfareCardFile } : {}),
      // Police verification
      policeVerification: bool("police_verification"),
      policeVerifCertNo: str("police_verif_cert_no"),
      policeVerifIssuedBy: str("police_verif_issued_by"),
      policeVerifIssueDate: date("police_verif_issue_date"),
      policeVerifStatus: str("police_verif_status"),
      ...(filePaths.policeVerifFile ? { policeVerifFile: filePaths.policeVerifFile } : {}),
      // Insurance
      insurance: bool("insurance"),
      insuranceProvider: str("insurance_provider"),
      insurancePolicyNo: str("insurance_policy_no"),
      insurancePolicyStart: date("insurance_policy_start"),
      insurancePolicyExpiry: date("insurance_policy_expiry"),
      ...(filePaths.insuranceFile ? { insuranceFile: filePaths.insuranceFile } : {}),
    };

    // Only include defined values so existing data isn't nulled on partial updates
    const updateData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(profileData)) {
      if (v !== undefined) updateData[k] = v;
    }

    const profile = await prisma.technicianGeneralProfile.upsert({
      where: { technicianId: tech.id },
      create: { technicianId: tech.id, ...updateData },
      update: updateData,
    });

    // Replace nominees if provided
    const nominees = body["nominees"];
    if (Array.isArray(nominees)) {
      await prisma.technicianNominee.deleteMany({ where: { generalProfileId: profile.id } });
      if (nominees.length > 0) {
        await prisma.technicianNominee.createMany({
          data: nominees.map((n: Record<string, unknown>) => ({
            generalProfileId: profile.id,
            name: typeof n["name"] === "string" ? n["name"].trim() : "Nominee",
            aadharCardNo: typeof n["aadhar_card_no"] === "string" ? n["aadhar_card_no"].trim() || null : null,
            phoneNumber: typeof n["phone_number"] === "string" ? n["phone_number"].trim() || null : null,
            percentage: typeof n["percentage"] === "number" ? n["percentage"] : null,
          })),
        });
      }
    }

    const updated = await prisma.technicianGeneralProfile.findUnique({
      where: { id: profile.id },
      include: { nominees: { orderBy: { createdAt: "asc" } } },
    });

    return ok(updated, "Profile updated");
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    console.error("[technician/general_profile]", err);
    return fail("Something went wrong", 500);
  }
}
