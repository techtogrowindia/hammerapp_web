import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { KycStepCard } from "./KycStepCard";
import { ArrowLeft, Phone, Mail, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";

function fileLink(path?: string | null) {
  if (!path) return null;
  const url = `${UPLOAD_BASE.replace(/\/$/, "")}/${path}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
      View file
    </a>
  );
}

function fmtDate(d?: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
}

export default async function TechnicianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const t = await prisma.technician.findUnique({
    where: { id },
    include: {
      personalKyc: { include: { bloodGroup: true, location: true } },
      education: true,
      bankKyc: true,
      companyKyc: true,
      documents: true,
      signature: true,
      serviceCategories: { include: { serviceCategory: true, certificate: true } },
    },
  });

  if (!t) notFound();

  const p = t.personalKyc;
  const b = t.bankKyc;
  const c = t.companyKyc;

  // Services step status = worst-case across the join rows (simple: first or PENDING)
  const servicesStatus = t.serviceCategories.length
    ? t.serviceCategories[0].status
    : "NOT_STARTED";
  const documentsStatus = t.documents.length ? t.documents[0].status : "NOT_STARTED";

  return (
    <div className="space-y-5 max-w-5xl">
      <Link
        href="/technicians"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to onboarding
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-2xl font-bold">
              {(t.name ?? p?.fullName ?? "T").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {t.name ?? p?.fullName ?? "Unnamed"}
              </h1>
              <p className="font-mono text-xs text-slate-500 mt-0.5">{t.code}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{t.mobile}</span>
                {t.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{t.email}</span>}
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(t.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Account</span>
              <StatusBadge status={t.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Overall KYC</span>
              <StatusBadge status={t.kycStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* KYC Legal Steps — claude.md §8 */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          KYC Legal Steps
        </h2>

        {/* 1. Profile */}
        <KycStepCard
          technicianId={t.id}
          step="profile"
          title="1 · Profile KYC"
          status={p?.status ?? "NOT_STARTED"}
          remark={p?.remark}
          fields={[
            { label: "Full name", value: p?.fullName },
            { label: "Date of birth", value: fmtDate(p?.dob) },
            { label: "Gender", value: p?.gender },
            { label: "Blood group", value: p?.bloodGroup?.name },
            { label: "Address", value: [p?.addressLine1, p?.addressLine2, p?.city, p?.state, p?.pincode].filter(Boolean).join(", ") },
            { label: "Location", value: p?.location?.name },
            { label: "Profile photo", value: fileLink(p?.profilePhoto) },
          ]}
        />

        {/* 2. Services */}
        <KycStepCard
          technicianId={t.id}
          step="services"
          title="2 · Services KYC"
          status={servicesStatus}
          fields={
            t.serviceCategories.length
              ? t.serviceCategories.map((s) => ({
                  label: s.serviceCategory.name,
                  value: (
                    <span>
                      {s.certificate?.name ?? "No certificate"}
                      {s.certificateFile ? <> · {fileLink(s.certificateFile)}</> : null}
                    </span>
                  ),
                }))
              : []
          }
        />

        {/* 3. Bank */}
        <KycStepCard
          technicianId={t.id}
          step="bank"
          title="3 · Bank KYC"
          status={b?.status ?? "NOT_STARTED"}
          remark={b?.remark}
          fields={[
            { label: "Account holder", value: b?.accountHolder },
            { label: "Account number", value: b?.accountNumber },
            { label: "IFSC", value: b?.ifsc },
            { label: "Bank", value: b?.bankName },
            { label: "Branch", value: b?.branch },
            { label: "UPI ID", value: b?.upiId },
            { label: "Passbook", value: fileLink(b?.passbookFile) },
          ]}
        />

        {/* 4. Company */}
        <KycStepCard
          technicianId={t.id}
          step="company"
          title="4 · Company KYC"
          status={c?.status ?? "NOT_STARTED"}
          remark={c?.remark}
          fields={[
            { label: "Company type", value: c?.companyType },
            { label: "Company name", value: c?.companyName },
            { label: "GST number", value: c?.gstNumber ? `${c.gstNumber}${c.gstVerified ? " ✓" : ""}` : null },
            { label: "PAN", value: c?.panNumber },
            { label: "Registration no.", value: c?.registrationNumber },
          ]}
        />

        {/* 5. Documents */}
        <KycStepCard
          technicianId={t.id}
          step="document"
          title="5 · Document KYC"
          status={documentsStatus}
          fields={
            t.documents.length
              ? t.documents.map((d) => ({
                  label: `${d.docType}${d.docNumber ? ` (${d.docNumber})` : ""}`,
                  value: (
                    <span className="flex gap-2">
                      {fileLink(d.frontFile) ?? "—"}
                      {d.backFile ? <>· {fileLink(d.backFile)}</> : null}
                    </span>
                  ),
                }))
              : []
          }
        />

        {/* Signature (informational) */}
        {t.signature && (
          <div className="bg-white rounded-xl border border-[var(--border)] px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Signature</span>
            {fileLink(t.signature.file)}
          </div>
        )}
      </div>
    </div>
  );
}
