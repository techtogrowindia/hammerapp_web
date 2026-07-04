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

  const [tech, bloodGroups, services, locations, certificates] = await Promise.all([
    prisma.technician.findUnique({
      where: { id },
      include: {
        personalKyc: true,
        education: true,
        bankKyc: true,
        companyKyc: true,
        documents: true,
        serviceCategories: { include: { serviceCategory: true, certificate: true } },
      },
    }),
    prisma.bloodGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.certificate.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!tech) notFound();

  const p = tech.personalKyc;
  const e = tech.education;
  const b = tech.bankKyc;
  const c = tech.companyKyc;

  // yyyy-mm-dd for <input type="date">
  const dobValue = p?.dob ? p.dob.toISOString().slice(0, 10) : "";

  const existing = {
    profile: {
      fullName: p?.fullName ?? tech.name ?? "",
      dob: dobValue,
      gender: p?.gender ?? "",
      bloodGroupId: p?.bloodGroupId ?? "",
      addressLine1: p?.addressLine1 ?? "",
      addressLine2: p?.addressLine2 ?? "",
      city: p?.city ?? "",
      state: p?.state ?? "",
      pincode: p?.pincode ?? "",
      locationId: p?.locationId ?? "",
      profilePhoto: p?.profilePhoto ?? "",
    },
    education: {
      qualification: e?.qualification ?? "",
      institution: e?.institution ?? "",
      yearOfPassing: e?.yearOfPassing != null ? String(e.yearOfPassing) : "",
      certificateFile: e?.certificateFile ?? "",
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
      companyName: c?.companyName ?? "",
      gstNumber: c?.gstNumber ?? "",
      panNumber: c?.panNumber ?? "",
      registrationNumber: c?.registrationNumber ?? "",
    },
    services: tech.serviceCategories.map((s) => ({
      name: s.serviceCategory.name,
      certificate: s.certificate?.name ?? null,
      hasFile: !!s.certificateFile,
    })),
    documents: tech.documents.map((d) => ({
      docType: d.docType,
      docNumber: d.docNumber,
      hasFront: !!d.frontFile,
      hasBack: !!d.backFile,
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
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        certificates={certificates.map((ct) => ({ id: ct.id, name: ct.name }))}
        existing={existing}
      />
    </div>
  );
}
