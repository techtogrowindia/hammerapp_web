import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentViewer, type DocFile } from "@/components/DocumentViewer";
import { AadharPanCheck } from "@/components/AadharPanCheck";
import { ShopKycStepCard } from "./ShopKycStepCard";
import { checkShopAadharPan } from "./actions";
import { ArrowLeft, Phone, Mail, Calendar, Pencil, IndianRupee, CheckCircle2, Circle } from "lucide-react";

export const dynamic = "force-dynamic";

const UPLOAD_BASE = "/uploads";

function fileUrl(path?: string | null) {
  return path ? `${UPLOAD_BASE}/${path.replace(/^\/+/, "")}` : null;
}
function isImagePath(p: string) {
  return /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(p);
}
function fmtDate(d?: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
}
const firmLabel = (f?: string | null) =>
  f ? f.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : null;

function docLabel(docType: string, side: "front" | "back"): string {
  const t = docType.toUpperCase();
  if (t.includes("AADHA")) return side === "front" ? "Aadhar Front" : "Aadhar Back";
  if (t.includes("PAN")) return "PAN Card";
  if (t.includes("BANK") || t.includes("PASSBOOK")) return "Bank Passbook";
  if (t === "GST") return "GST";
  if (t.includes("SHOP")) return "Shop Photo";
  if (t.includes("PHOTO")) return "Profile Photo";
  const pretty = docType.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  return side === "front" ? pretty : `${pretty} (Back)`;
}

const STEP_LABELS = [
  { key: "profile", label: "Profile KYC" },
  { key: "products", label: "Products KYC" },
  { key: "company", label: "Company KYC" },
  { key: "bank", label: "Bank KYC" },
  { key: "document", label: "Document KYC" },
] as const;

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

  const stepStatus: Record<string, string> = {
    profile: p?.status ?? "NOT_STARTED",
    products: productsStatus,
    company: c?.status ?? "NOT_STARTED",
    bank: b?.status ?? "NOT_STARTED",
    document: documentsStatus,
  };

  // ── Documents list for the viewer ──
  const docs: DocFile[] = [];
  const push = (label: string, path?: string | null) => {
    const url = fileUrl(path);
    if (url && path) docs.push({ key: `${label}-${docs.length}`, label, url, isImage: isImagePath(path) });
  };
  push("Profile Photo", p?.profilePhoto);
  for (const d of s.documents) {
    push(docLabel(d.docType, "front"), d.frontFile);
    if (d.backFile) push(docLabel(d.docType, "back"), d.backFile);
  }
  push("Bank Passbook", b?.passbookFile);
  push("Signature", s.signature?.file);

  const gstVerified = c?.gstVerified ?? false;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/shops-onboarding" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Shops
        </Link>
        <Link href={`/shops-onboarding/${id}/kyc`}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2 transition-colors">
          <Pencil className="h-4 w-4" /> Enter / Edit KYC Data
        </Link>
      </div>

      {/* Header: profile card + legal status */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center text-center lg:border-r border-[var(--border)] lg:pr-6">
          {fileUrl(p?.profilePhoto) && isImagePath(p?.profilePhoto ?? "") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(p?.profilePhoto)!} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-3xl font-bold">
              {(s.name ?? p?.name ?? "S").charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800 mt-3">{s.name ?? p?.name ?? "Unnamed"}</h1>
          <p className="font-mono text-xs text-slate-500 mt-0.5">ID {s.code}</p>
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-600 mt-2"><Phone className="h-3.5 w-3.5" />{s.mobile}</p>
          {s.email && <p className="inline-flex items-center gap-1.5 text-sm text-slate-600 mt-1"><Mail className="h-3.5 w-3.5" />{s.email}</p>}
          {p?.firmType && <p className="text-xs text-slate-500 mt-1">{firmLabel(p.firmType)}</p>}
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400 mt-1"><Calendar className="h-3 w-3" />Registered {fmtDate(s.createdAt)}</p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Legal Status (5 Steps)</h2>
          <ul className="space-y-2">
            {STEP_LABELS.map((st) => {
              const status = stepStatus[st.key];
              const done = status === "VERIFIED";
              return (
                <li key={st.key} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    {done ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                    {st.label}
                  </span>
                  <StatusBadge status={status} />
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--border)] mt-4 pt-4 space-y-2.5 text-sm">
            <AadharPanCheck
              linked={s.aadharPanLinked}
              checkedAt={fmtDate(s.aadharPanCheckedAt)}
              action={checkShopAadharPan.bind(null, s.id)}
            />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">GST Verified</span>
              <span className={gstVerified ? "text-green-600 font-medium" : "text-slate-400"}>{gstVerified ? "Yes" : "No / Not checked"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Registration fee</span>
              <span className={paidPayment ? "text-green-600 font-medium inline-flex items-center gap-0.5" : "text-slate-400 inline-flex items-center gap-0.5"}>
                <IndianRupee className="h-3 w-3" />{paidPayment ? "Paid" : "Not paid"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Account status</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Overall KYC</span>
              <StatusBadge status={s.kycStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Products chips */}
      {s.productCategories.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--border)] px-6 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Products</h2>
          <div className="flex flex-wrap gap-2">
            {s.productCategories.map((pc) => (
              <span key={pc.id} className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {pc.productCategory.name}{pc.productSubcategory ? ` · ${pc.productSubcategory.name}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Documents + Personal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--border)] p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Uploaded Documents</h2>
            <p className="text-xs text-slate-500 mt-0.5">{docs.length} uploaded</p>
          </div>
          <DocumentViewer documents={docs} />
        </div>

        <div className="bg-white rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Personal</h2>
          <dl className="space-y-3 text-sm">
            <Field label="Name" value={p?.name ?? s.name} />
            <Field label="Mobile" value={s.mobile} />
            <Field label="Email" value={s.email} />
            <Field label="Firm type" value={firmLabel(p?.firmType)} />
            <Field label="Aadhaar" value={p?.aadharNumber} />
            <Field label="PAN" value={p?.panNumber} />
            <Field label="Business PAN" value={p?.businessPan} />
            <Field label="Blood group" value={p?.bloodGroup?.name} />
            <Field label="Address" value={[p?.address, p?.cityTownVillage, p?.taluk, p?.district, p?.pincode].filter(Boolean).join(", ")} />
            <Field label="Partners" value={s.partners.length ? s.partners.map((pt) => pt.name).join(", ") : null} />
            <Field label="Bank" value={b?.bankName} />
            <Field label="Account no." value={b?.accountNumber} />
            <Field label="IFSC" value={b?.ifsc} />
            <Field label="GSTIN" value={c?.gstNumber} />
            <Field label="Legal name" value={c?.legalName} />
          </dl>
        </div>
      </div>

      {/* KYC review actions */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Review & Update KYC</h2>

        <ShopKycStepCard shopId={s.id} step="profile" title="1 · Profile KYC" status={p?.status ?? "NOT_STARTED"} remark={p?.remark}
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
          ]} />

        <ShopKycStepCard shopId={s.id} step="products" title="2 · Products KYC" status={productsStatus}
          fields={s.productCategories.map((pc) => ({
            label: pc.productCategory.name,
            value: pc.productSubcategory?.name ?? "—",
          }))} />

        <ShopKycStepCard shopId={s.id} step="company" title="3 · Company KYC" status={c?.status ?? "NOT_STARTED"} remark={c?.remark}
          fields={[
            { label: "GST registered", value: c ? (c.hasGst ? "Yes" : "No") : null },
            { label: "GSTIN", value: c?.gstNumber ? `${c.gstNumber}${c.gstVerified ? " ✓" : ""}` : null },
            { label: "Legal name", value: c?.legalName },
            { label: "Company name", value: c?.companyName },
            { label: "Company address", value: [c?.companyAddress, c?.cityTownVillage, c?.taluk, c?.district, c?.companyPincode].filter(Boolean).join(", ") },
            { label: "No. of employees", value: c?.numberOfEmployees != null ? String(c.numberOfEmployees) : null },
          ]} />

        <ShopKycStepCard shopId={s.id} step="bank" title="4 · Bank KYC" status={b?.status ?? "NOT_STARTED"} remark={b?.remark}
          fields={[
            { label: "Account holder", value: b?.accountHolder },
            { label: "Account number", value: b?.accountNumber },
            { label: "Account type", value: b?.accountType ? b.accountType.toLowerCase() : null },
            { label: "IFSC", value: b?.ifsc },
            { label: "Bank", value: b?.bankName },
            { label: "Branch", value: b?.branch },
            { label: "UPI ID", value: b?.upiId },
          ]} />

        <ShopKycStepCard shopId={s.id} step="document" title="5 · Document KYC" status={documentsStatus}
          fields={s.documents.map((d) => ({
            label: `${d.docType.replace(/_/g, " ")}${d.docNumber ? ` (${d.docNumber})` : ""}`,
            value: (
              <span className="flex flex-wrap gap-2 items-center">
                {d.frontFile ? "Front ✓" : "—"}
                {d.backFile ? " · Back ✓" : ""}
                {d.latitude != null && d.longitude != null ? (
                  <span className="text-xs text-slate-400">📍 {d.latitude.toFixed(4)},{d.longitude.toFixed(4)}</span>
                ) : null}
              </span>
            ),
          }))} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700 mt-0.5">{value || "—"}</dd>
    </div>
  );
}
