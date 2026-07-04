import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { KycForms } from "./KycForms";

export const dynamic = "force-dynamic";

export default async function KycEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tech, bloodGroups, services, locations, certificates, leafServices] = await Promise.all([
    prisma.technician.findUnique({
      where: { id },
      include: {
        personalKyc: true,
        education: true,
        bankKyc: true,
        companyKyc: true,
        documents: true,
        serviceCategories: { include: { serviceCategory: true, certificate: true } },
        technicianServices: { include: { service: true } },
        serviceCertificates: { include: { service: true, certificate: true } },
        generalProfile: { include: { nominees: { orderBy: { createdAt: "asc" } } } },
      },
    }),
    prisma.bloodGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.certificate.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { serviceCategory: true },
    }),
  ]);

  if (!tech) notFound();

  const p = tech.personalKyc;
  const e = tech.education;
  const b = tech.bankKyc;
  const c = tech.companyKyc;
  const gp = tech.generalProfile;

  // yyyy-mm-dd for <input type="date">
  const dobValue = p?.dob ? p.dob.toISOString().slice(0, 10) : "";

  const existing = {
    profile: {
      fullName: p?.fullName ?? tech.name ?? "",
      dob: dobValue,
      gender: p?.gender ?? "",
      bloodGroupId: p?.bloodGroupId ?? "",
      aadharNumber: p?.aadharNumber ?? "",
      panNumber: p?.panNumber ?? "",
      addressLine1: p?.addressLine1 ?? "",
      addressLine2: p?.addressLine2 ?? "",
      city: p?.city ?? "",
      taluk: p?.taluk ?? "",
      district: p?.district ?? "",
      state: p?.state ?? "",
      pincode: p?.pincode ?? "",
      locationId: p?.locationId ?? "",
      profilePhoto: p?.profilePhoto ?? "",
      domestic: p?.domestic ?? false,
      commercial: p?.commercial ?? false,
      corporate: p?.corporate ?? false,
    },
    education: {
      qualification: e?.qualification ?? "",
      institution: e?.institution ?? "",
      yearOfPassing: e?.yearOfPassing != null ? String(e.yearOfPassing) : "",
      certificateFile: e?.certificateFile ?? "",
      certificateFiles: e?.certificateFiles ?? [],
    },
    bank: {
      accountHolder: b?.accountHolder ?? "",
      accountNumber: b?.accountNumber ?? "",
      ifsc: b?.ifsc ?? "",
      bankName: b?.bankName ?? "",
      branch: b?.branch ?? "",
      upiId: b?.upiId ?? "",
      passbookFile: b?.passbookFile ?? "",
    },
    company: {
      companyType: c?.companyType ?? "INDIVIDUAL",
      companyAvailable: c?.companyAvailable ?? false,
      gstAvailable: c?.gstAvailable ?? false,
      companyName: c?.companyName ?? "",
      legalName: c?.legalName ?? "",
      gstNumber: c?.gstNumber ?? "",
      panNumber: c?.panNumber ?? "",
      registrationNumber: c?.registrationNumber ?? "",
      companyAddress: c?.companyAddress ?? "",
      cityTownVillage: c?.cityTownVillage ?? "",
      companyTaluk: c?.taluk ?? "",
      companyDistrict: c?.district ?? "",
      pincode: c?.pincode ?? "",
      numberOfEmployees: c?.numberOfEmployees != null ? String(c.numberOfEmployees) : "",
    },
    services: tech.serviceCategories.map((s) => ({
      id: s.serviceCategoryId,
      name: s.serviceCategory.name,
      certificate: s.certificate?.name ?? null,
      yearsOfExperience: s.yearsOfExperience ?? null,
      hasFile: !!s.certificateFile,
      fileUrl: s.certificateFile ?? null,
    })),
    technicianServices: tech.technicianServices.map((ts) => ({
      serviceId: ts.serviceId,
      serviceName: ts.service.name,
    })),
    serviceCertificates: tech.serviceCertificates.map((sc) => ({
      id: sc.id,
      serviceName: sc.service?.name ?? "",
      certificateName: sc.certificate?.name ?? "",
      certificateNumber: sc.certificateNumber ?? "",
      noExpiry: sc.noExpiry,
      expiryDate: sc.expiryDate ? sc.expiryDate.toISOString().slice(0, 10) : "",
      files: sc.files,
    })),
    generalProfile: {
      isMarried: gp?.isMarried ?? false,
      spouseName: gp?.spouseName ?? "",
      marriageDate: gp?.marriageDate ? gp.marriageDate.toISOString().slice(0, 10) : "",
      emergencyContactNo: gp?.emergencyContactNo ?? "",
      sosVisibility: gp?.sosVisibility ?? false,
      genderIdentity: gp?.genderIdentity ?? "",
      festivalSelection: gp?.festivalSelection ?? [],
      earningScreenVisible: gp?.earningScreenVisible ?? false,
      tshirtSize: gp?.tshirtSize ?? "",
      colourPreference: gp?.colourPreference ?? "",
      welfareCard: gp?.welfareCard ?? false,
      welfareCardScheme: gp?.welfareCardScheme ?? "",
      welfareCardExpiry: gp?.welfareCardExpiry ? gp.welfareCardExpiry.toISOString().slice(0, 10) : "",
      welfareCardFile: gp?.welfareCardFile ?? "",
      policeVerification: gp?.policeVerification ?? false,
      policeVerifCertNo: gp?.policeVerifCertNo ?? "",
      policeVerifIssuedBy: gp?.policeVerifIssuedBy ?? "",
      policeVerifIssueDate: gp?.policeVerifIssueDate ? gp.policeVerifIssueDate.toISOString().slice(0, 10) : "",
      policeVerifFile: gp?.policeVerifFile ?? "",
      policeVerifStatus: gp?.policeVerifStatus ?? "",
      employeeId: gp?.employeeId ?? "",
      department: gp?.department ?? "",
      designation: gp?.designation ?? "",
      joiningDate: gp?.joiningDate ? gp.joiningDate.toISOString().slice(0, 10) : "",
      insurance: gp?.insurance ?? false,
      insuranceProvider: gp?.insuranceProvider ?? "",
      insurancePolicyNo: gp?.insurancePolicyNo ?? "",
      insurancePolicyStart: gp?.insurancePolicyStart ? gp.insurancePolicyStart.toISOString().slice(0, 10) : "",
      insurancePolicyExpiry: gp?.insurancePolicyExpiry ? gp.insurancePolicyExpiry.toISOString().slice(0, 10) : "",
      insuranceFile: gp?.insuranceFile ?? "",
      nominees: (gp?.nominees ?? []).map((n) => ({
        name: n.name,
        aadharCardNo: n.aadharCardNo ?? "",
        phoneNumber: n.phoneNumber ?? "",
        percentage: n.percentage != null ? String(n.percentage) : "",
      })),
    },
    documents: tech.documents.map((d) => ({
      docType: d.docType,
      docNumber: d.docNumber,
      hasFront: !!d.frontFile,
      hasBack: !!d.backFile,
      frontFile: d.frontFile ?? null,
      backFile: d.backFile ?? null,
    })),
  };

  return (
    <div className="space-y-5">
      <Link
        href={`/technicians/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to technician
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Enter KYC Data
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {tech.name ?? "Technician"} · <span className="font-mono text-xs">{tech.code}</span>
        </p>
      </div>

      <KycForms
        technicianId={id}
        bloodGroups={bloodGroups.map((bg) => ({ id: bg.id, name: bg.name }))}
        serviceCategories={services.map((s) => ({ id: s.id, name: s.name }))}
        leafServices={leafServices.map((ls) => ({ id: ls.id, name: ls.name, categoryName: ls.serviceCategory?.name ?? "" }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        certificates={certificates.map((ct) => ({ id: ct.id, name: ct.name }))}
        existing={existing}
      />
    </div>
  );
}
