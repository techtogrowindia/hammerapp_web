import type { NextRequest } from "next/server";
import { getAuthTechnician } from "@/lib/auth-mobile";
import { ok, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// GET /api/technician/technician_kyc_full — aggregate of every KYC section,
// used by the app to pre-fill the stepper when reopened.
export async function GET(req: NextRequest) {
  const tech = await getAuthTechnician(req);
  if (!tech) return unauthorized();

  const full = await prisma.technician.findUnique({
    where: { id: tech.id },
    include: {
      personalKyc: { include: { bloodGroup: true, location: true } },
      education: true,
      bankKyc: true,
      companyKyc: true,
      documents: true,
      signature: true,
      serviceCategories: { include: { serviceCategory: true, certificate: true } },
      technicianServices: {
        include: { service: { include: { serviceCategory: true, serviceSubcategory: true } } },
      },
      serviceCertificates: { include: { service: true, certificate: true } },
    },
  });

  if (!full) return ok(null, "Not started");

  return ok(
    {
      technician: {
        id: full.id,
        code: full.code,
        name: full.name,
        mobile: full.mobile,
        email: full.email,
        status: full.status,
        kyc_status: full.kycStatus,
      },
      profile_kyc: full.personalKyc,
      education: full.education,
      services_kyc: full.serviceCategories,
      technician_services: full.technicianServices,
      service_certificates: full.serviceCertificates,
      company_kyc: full.companyKyc,
      bank_kyc: full.bankKyc,
      document_kyc: full.documents,
      signature: full.signature,
    },
    "KYC snapshot fetched",
  );
}
