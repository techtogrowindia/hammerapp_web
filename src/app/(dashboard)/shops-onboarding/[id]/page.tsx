import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { ShopKycStepCard } from "./ShopKycStepCard";
import { ArrowLeft, Phone, Mail, Calendar, Pencil, IndianRupee } from "lucide-react";

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

const firmLabel = (f?: string | null) =>
  f ? f.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : null;

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shopId = Number(id);
  if (!Number.isInteger(shopId)) notFound();

  const s = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      personalKyc: { include: { bloodGroup: true } },
      companyKyc: true,
      bankKyc: true,
      documents: true,
      signature: true,
      partners: true,
      productCategories: { include: { productCategory: true, productSubcategory: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!s) notFound();

  const p = s.personalKyc;
  const c = s.companyKyc;
  const b = s.bankKyc;

  const productsStatus = s.productCategories.length ? s.productCategories[0].status : "NOT_STARTED";
  const documentsStatus = s.documents.length ? s.documents[0].status : "NOT_STARTED";
  const paidPayment = s.payments.find((pm) => pm.status === "PAID");

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link href="/shops-onboarding" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Back to onboarding
        </Link>
        <Link
          href={`/shops-onboarding/${id}/kyc`}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Enter / Edit KYC Data
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-2xl font-bold">
              {(s.name ?? p?.name ?? "S").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{s.name ?? p?.name ?? "Unnamed"}</h1>
              <p className="font-mono text-xs text-slate-500 mt-0.5">{s.code}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 flex-wrap">
                <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{s.mobile}</span>
                {s.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{s.email}</span>}
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(s.createdAt)}</span>
                {p?.firmType && <span className="capitalize text-slate-500">{firmLabel(p.firmType)}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Account</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Overall KYC</span>
              <StatusBadge status={s.kycStatus} />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
              <span className={paidPayment ? "text-green-600 font-medium" : "text-slate-400"}>
                {paidPayment ? "Registration fee paid" : "Fee not paid"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">KYC Legal Steps</h2>

        {/* 1. Profile */}
        <ShopKycStepCard
          shopId={s.id}
          step="profile"
          title="1 · Profile KYC"
          status={p?.status ?? "NOT_STARTED"}
          remark={p?.remark}
          fields={[
            { label: "Name", value: p?.name },
            { label: "Date of birth", value: fmtDate(p?.dob) },
            { label: "Blood group", value: p?.bloodGroup?.name },
            { label: "Aadhaar", value: p?.aadharNumber },
            { label: "PAN", value: p?.panNumber },
            { label: "Firm type", value: firmLabel(p?.firmType) },
            { label: "Business PAN", value: p?.businessPan },
            { label: "Address", value: [p?.address, p?.cityTownVillage, p?.taluk, p?.district, p?.pincode].filter(Boolean).join(", ") },
            { label: "Partners", value: s.partners.length ? s.partners.map((pt) => pt.name).join(", ") : null },
            { label: "Profile photo", value: fileLink(p?.profilePhoto) },
          ]}
        />

        {/* 2. Products */}
        <ShopKycStepCard
          shopId={s.id}
          step="products"
          title="2 · Products KYC"
          status={productsStatus}
          fields={
            s.productCategories.length
              ? s.productCategories.map((pc) => ({
                  label: pc.productCategory.name,
                  value: pc.productSubcategory?.name ?? "—",
                }))
              : []
          }
        />

        {/* 3. Company */}
        <ShopKycStepCard
          shopId={s.id}
          step="company"
          title="3 · Company KYC"
          status={c?.status ?? "NOT_STARTED"}
          remark={c?.remark}
          fields={[
            { label: "GST registered", value: c ? (c.hasGst ? "Yes" : "No") : null },
            { label: "GSTIN", value: c?.gstNumber ? `${c.gstNumber}${c.gstVerified ? " ✓" : ""}` : null },
            { label: "Legal name", value: c?.legalName },
            { label: "Company name", value: c?.companyName },
            { label: "Company address", value: [c?.companyAddress, c?.cityTownVillage, c?.taluk, c?.district, c?.companyPincode].filter(Boolean).join(", ") },
            { label: "No. of employees", value: c?.numberOfEmployees != null ? String(c.numberOfEmployees) : null },
          ]}
        />

        {/* 4. Bank */}
        <ShopKycStepCard
          shopId={s.id}
          step="bank"
          title="4 · Bank KYC"
          status={b?.status ?? "NOT_STARTED"}
          remark={b?.remark}
          fields={[
            { label: "Account holder", value: b?.accountHolder },
            { label: "Account number", value: b?.accountNumber },
            { label: "Account type", value: b?.accountType ? b.accountType.toLowerCase() : null },
            { label: "IFSC", value: b?.ifsc },
            { label: "Bank", value: b?.bankName },
            { label: "Branch", value: b?.branch },
            { label: "UPI ID", value: b?.upiId },
            { label: "Passbook", value: fileLink(b?.passbookFile) },
          ]}
        />

        {/* 5. Documents */}
        <ShopKycStepCard
          shopId={s.id}
          step="document"
          title="5 · Document KYC"
          status={documentsStatus}
          fields={
            s.documents.length
              ? s.documents.map((d) => ({
                  label: `${d.docType.replace(/_/g, " ")}${d.docNumber ? ` (${d.docNumber})` : ""}`,
                  value: (
                    <span className="flex flex-wrap gap-2 items-center">
                      {fileLink(d.frontFile) ?? "—"}
                      {d.backFile ? <>· {fileLink(d.backFile)}</> : null}
                      {d.latitude != null && d.longitude != null ? (
                        <span className="text-xs text-slate-400">📍 {d.latitude.toFixed(4)},{d.longitude.toFixed(4)}</span>
                      ) : null}
                    </span>
                  ),
                }))
              : []
          }
        />

        {s.signature && (
          <div className="bg-white rounded-xl border border-[var(--border)] px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Signature</span>
            {fileLink(s.signature.file)}
          </div>
        )}
      </div>
    </div>
  );
}
