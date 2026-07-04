import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { KycStepCard } from "./KycStepCard";
import { DocumentViewer, type DocFile } from "@/components/DocumentViewer";
import { AadharPanCheck } from "@/components/AadharPanCheck";
import { checkTechnicianAadharPan } from "./actions";
import { ArrowLeft, Phone, Mail, Calendar, Pencil, CheckCircle2, Circle } from "lucide-react";

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

function docLabel(docType: string, side: "front" | "back"): string {
  const t = docType.toUpperCase();
  if (t.includes("AADHA")) return side === "front" ? "Aadhar Front" : "Aadhar Back";
  if (t === "PAN" || t.includes("PAN")) return "PAN Card";
  if (t.includes("LICENSE") || t.includes("LICENCE") || t.includes("DRIVING"))
    return side === "front" ? "License Front" : "License Back";
  if (t === "GST") return "GST";
  if (t.includes("COMPANY") || t.includes("SHOP")) return "Company Photo";
  const pretty = docType.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  return side === "front" ? pretty : `${pretty} (Back)`;
}

const STEP_LABELS = [
  { key: "profile", label: "Profile KYC" },
  { key: "services", label: "Services KYC" },
  { key: "bank", label: "Bank KYC" },
  { key: "company", label: "Company KYC" },
  { key: "document", label: "Document KYC" },
] as const;

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
      technicianServices: {
        include: { service: { include: { serviceCategory: true, serviceSubcategory: true } } },
      },
      serviceCertificates: { include: { service: true, certificate: true } },
      generalProfile: { include: { nominees: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (!t) notFound();

  const p = t.personalKyc;
  const b = t.bankKyc;
  const c = t.companyKyc;
  const e = t.education;
  const gp = t.generalProfile;

  const servicesStatus = t.serviceCategories.length ? t.serviceCategories[0].status : "NOT_STARTED";
  const documentsStatus = t.documents.length ? t.documents[0].status : "NOT_STARTED";

  const stepStatus: Record<string, string> = {
    profile: p?.status ?? "NOT_STARTED",
    services: servicesStatus,
    bank: b?.status ?? "NOT_STARTED",
    company: c?.status ?? "NOT_STARTED",
    document: documentsStatus,
  };

  // ── Assemble uploaded-documents list ──
  const docs: DocFile[] = [];
  const push = (label: string, path?: string | null) => {
    const url = fileUrl(path);
    if (url && path) docs.push({ key: `${label}-${docs.length}`, label, url, isImage: isImagePath(path) });
  };

  push("Profile Photo", p?.profilePhoto);
  for (const d of t.documents) {
    push(docLabel(d.docType, "front"), d.frontFile);
    if (d.backFile) push(docLabel(d.docType, "back"), d.backFile);
  }
  push("Bank Passbook", b?.passbookFile);
  push("Signature", t.signature?.file);
  // Education certificates (multiple supported)
  const eduFiles = e?.certificateFiles?.length ? e.certificateFiles : e?.certificateFile ? [e.certificateFile] : [];
  eduFiles.forEach((f, i) => push(eduFiles.length > 1 ? `Education Certificate ${i + 1}` : "Education Certificate", f));
  // Legacy per-category certificate file
  const catCerts = t.serviceCategories.filter((s) => s.certificateFile);
  catCerts.forEach((s, i) => {
    const name = s.certificate?.name ?? s.serviceCategory.name;
    push(catCerts.length > 1 ? `${name} (Cert ${i + 1})` : `${name} (Cert)`, s.certificateFile);
  });
  // Service certificates (new per-service model — each may hold multiple files)
  t.serviceCertificates.forEach((sc) => {
    const name = sc.service?.name ?? sc.certificate?.name ?? "Service Certificate";
    sc.files.forEach((f, i) =>
      push(sc.files.length > 1 ? `${name} (${i + 1})` : name, f),
    );
  });

  const gstVerified = c?.gstVerified ?? false;
  const aadhaarDoc = t.documents.find((d) => d.docType.toUpperCase().includes("AADHA"));
  const aadhaarNumber = aadhaarDoc?.docNumber;
  const workingFields = [
    p?.domestic ? "Domestic" : null,
    p?.commercial ? "Commercial" : null,
    p?.corporate ? "Corporate" : null,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/technicians" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Technicians
        </Link>
        <Link href={`/technicians/${id}/kyc`}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2 transition-colors">
          <Pencil className="h-4 w-4" /> Enter / Edit KYC Data
        </Link>
      </div>

      {/* Header: profile card + legal status */}
      <div className="bg-white rounded-xl border border-[var(--border)] p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="flex flex-col items-center justify-center text-center border-r-0 lg:border-r border-[var(--border)] lg:pr-6">
          {fileUrl(p?.profilePhoto) && isImagePath(p?.profilePhoto ?? "") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(p?.profilePhoto)!} alt="" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-3xl font-bold">
              {(t.name ?? p?.fullName ?? "T").charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800 mt-3">{t.name ?? p?.fullName ?? "Unnamed"}</h1>
          <p className="font-mono text-xs text-slate-500 mt-0.5">ID {t.code}</p>
          <p className="inline-flex items-center gap-1.5 text-sm text-slate-600 mt-2">
            <Phone className="h-3.5 w-3.5" /> {t.mobile}
          </p>
          {t.email && <p className="inline-flex items-center gap-1.5 text-sm text-slate-600 mt-1"><Mail className="h-3.5 w-3.5" />{t.email}</p>}
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-400 mt-1"><Calendar className="h-3 w-3" />Registered {fmtDate(t.createdAt)}</p>
        </div>

        {/* Legal status */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Legal Status (5 Steps)</h2>
          <ul className="space-y-2">
            {STEP_LABELS.map((s) => {
              const st = stepStatus[s.key];
              const done = st === "VERIFIED";
              return (
                <li key={s.key} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    {done ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                    {s.label}
                  </span>
                  <StatusBadge status={st} />
                </li>
              );
            })}
          </ul>

          <div className="border-t border-[var(--border)] mt-4 pt-4 space-y-2.5 text-sm">
            <AadharPanCheck
              linked={t.aadharPanLinked}
              checkedAt={fmtDate(t.aadharPanCheckedAt)}
              action={checkTechnicianAadharPan.bind(null, t.id)}
            />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">GST Verified</span>
              <span className={gstVerified ? "text-green-600 font-medium" : "text-slate-400"}>{gstVerified ? "Yes" : "No / Not checked"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Account status</span>
              <StatusBadge status={t.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Overall KYC</span>
              <StatusBadge status={t.kycStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Services chips */}
      {t.serviceCategories.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--border)] px-6 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Services</h2>
          <div className="flex flex-wrap gap-2">
            {t.serviceCategories.map((s) => (
              <span key={s.id} className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {s.serviceCategory.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Documents + Right panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Uploaded Documents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Uploaded Documents</h2>
              <p className="text-xs text-slate-500 mt-0.5">{docs.length} uploaded</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={documentsStatus} />
              <a href="#doc-review" className="text-xs text-[var(--accent)] hover:underline font-medium">Change status ↓</a>
            </div>
          </div>
          <DocumentViewer documents={docs} />
        </div>

        {/* Right sidebar — multiple cards */}
        <div className="space-y-4">
          {/* Personal */}
          <SideCard title="Personal">
            <dl className="space-y-2.5 text-sm">
              <Field label="Name" value={p?.fullName ?? t.name} />
              <Field label="Mobile" value={t.mobile} />
              <Field label="Email" value={t.email} />
              <Field label="Gender" value={p?.gender} />
              <Field label="Date of birth" value={fmtDate(p?.dob)} />
              <Field label="Blood group" value={p?.bloodGroup?.name} />
              <Field label="Aadhaar No." value={p?.aadharNumber ?? aadhaarNumber} />
              <Field label="PAN" value={p?.panNumber ?? c?.panNumber} />
              <Field label="Working field" value={workingFields} />
              <Field label="Address" value={[p?.addressLine1, p?.addressLine2].filter(Boolean).join(", ")} />
              <Field label="City / Town" value={p?.city} />
              <Field label="Taluk" value={p?.taluk} />
              <Field label="District" value={p?.district} />
              <Field label="State" value={p?.state} />
              <Field label="Pincode" value={p?.pincode} />
              <Field label="Location" value={p?.location?.name} />
            </dl>
          </SideCard>

          {/* Bank */}
          {b && (
            <SideCard title="Bank Details">
              <dl className="space-y-2.5 text-sm">
                <Field label="Bank" value={b.bankName} />
                <Field label="Account holder" value={b.accountHolder} />
                <Field label="Account no." value={b.accountNumber} />
                <Field label="IFSC" value={b.ifsc} />
                <Field label="Branch" value={b.branch} />
                <Field label="UPI ID" value={b.upiId} />
              </dl>
            </SideCard>
          )}

          {/* Company */}
          {c && (
            <SideCard title="Company / Firm">
              <dl className="space-y-2.5 text-sm">
                <Field label="Has firm" value={c.companyAvailable ? "Yes" : "No"} />
                <Field label="Type" value={c.companyType} />
                <Field label="Company" value={c.companyName} />
                <Field label="Legal name" value={c.legalName} />
                <Field label="GST" value={c.gstAvailable ? (c.gstNumber ?? "Yes") : "No"} />
                <Field label="No. of employees" value={c.numberOfEmployees != null ? String(c.numberOfEmployees) : null} />
                <Field label="Address" value={[c.companyAddress, c.cityTownVillage, c.taluk, c.district].filter(Boolean).join(", ")} />
                <Field label="Registration no." value={c.registrationNumber} />
              </dl>
            </SideCard>
          )}

          {/* Education */}
          {e && (
            <SideCard title="Education Qualification" badge={eduFiles.length ? `Certificates: ${eduFiles.length}` : undefined}>
              <dl className="space-y-2.5 text-sm">
                <Field label="Max qualification" value={e.qualification} />
                <Field label="Institution" value={e.institution} />
                <Field label="Year of passing" value={e.yearOfPassing != null ? String(e.yearOfPassing) : null} />
              </dl>
              {eduFiles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {eduFiles.map((f, i) => (
                    <a key={i} href={fileUrl(f)!} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded border border-[var(--border)] text-[var(--accent)] hover:bg-amber-50">
                      Certificate {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </SideCard>
          )}

          {/* Selected Categories & Services */}
          {(t.serviceCategories.length > 0 || t.technicianServices.length > 0) && (
            <SideCard
              title="Selected Categories & Services"
              badge={`Cat: ${t.serviceCategories.length} · Svc: ${t.technicianServices.length}`}
            >
              {t.serviceCategories.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Categories</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.serviceCategories.map((s) => (
                      <span key={s.id} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {s.serviceCategory.name}
                        {s.yearsOfExperience != null ? ` · ${s.yearsOfExperience}y` : ""}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {t.technicianServices.length > 0 && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Services</p>
                  <ul className="space-y-1.5">
                    {t.technicianServices.map((ts) => (
                      <li key={ts.id} className="text-sm text-slate-700">
                        {ts.service.name}
                        <span className="text-xs text-slate-400"> · {ts.service.serviceCategory.name}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </SideCard>
          )}

          {/* Service Certificates (new per-service model) */}
          {t.serviceCertificates.length > 0 && (
            <SideCard title="Service Certificates" badge={`Uploads: ${t.serviceCertificates.length}`}>
              <ul className="space-y-3">
                {t.serviceCertificates.map((sc) => (
                  <li key={sc.id} className="text-sm border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
                    <p className="font-medium text-slate-800">{sc.service?.name ?? "Service"}</p>
                    {sc.certificate && (
                      <p className="text-xs text-slate-500 mt-0.5">Certificate: {sc.certificate.name}</p>
                    )}
                    {sc.certificateNumber && (
                      <p className="text-xs text-slate-500">Number: {sc.certificateNumber}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Expiry: {sc.noExpiry ? "No expiry" : fmtDate(sc.expiryDate) ?? "—"}
                    </p>
                    {sc.files.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {sc.files.map((f, i) => (
                          <a key={i} href={fileUrl(f)!} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-0.5 rounded border border-[var(--border)] text-[var(--accent)] hover:bg-amber-50">
                            File {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </SideCard>
          )}

          {/* Legacy per-category certificates */}
          {catCerts.length > 0 && (
            <SideCard title="Category Certificates" badge={`Uploads: ${catCerts.length}`}>
              <ul className="space-y-3">
                {catCerts.map((s) => (
                  <li key={s.id} className="text-sm border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
                    <p className="font-medium text-slate-800">{s.serviceCategory.name}</p>
                    {s.certificate && (
                      <p className="text-xs text-slate-500 mt-0.5">Certificate: {s.certificate.name}</p>
                    )}
                    {s.certificateFile && fileUrl(s.certificateFile) && (
                      <a href={fileUrl(s.certificateFile)!} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline mt-0.5 inline-block">
                        View file
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </SideCard>
          )}

          {/* General Profile */}
          {gp && (
            <SideCard title="General Profile">
              <dl className="space-y-2.5 text-sm">
                <Field label="Marital status" value={gp.isMarried ? "Married" : "Single"} />
                {gp.isMarried && <Field label="Spouse" value={gp.spouseName} />}
                {gp.isMarried && <Field label="Marriage date" value={fmtDate(gp.marriageDate)} />}
                <Field label="Emergency contact" value={gp.emergencyContactNo} />
                <Field label="SOS visible" value={gp.sosVisibility ? "Yes" : "No"} />
                <Field label="Gender identity" value={gp.genderIdentity} />
                <Field label="T-shirt size" value={gp.tshirtSize} />
                <Field label="Colour preference" value={gp.colourPreference} />
                <Field label="Earning screen visible" value={gp.earningScreenVisible ? "Yes" : "No"} />
                {gp.festivalSelection.length > 0 && (
                  <Field label="Festivals" value={gp.festivalSelection.join(", ")} />
                )}
              </dl>
              {/* Welfare card */}
              {gp.welfareCard && (
                <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Welfare Card</p>
                  <dl className="space-y-1.5 text-sm">
                    <Field label="Scheme" value={gp.welfareCardScheme} />
                    <Field label="Expiry" value={fmtDate(gp.welfareCardExpiry)} />
                    {gp.welfareCardFile && <Field label="Document" value={<a href={fileUrl(gp.welfareCardFile)!} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">View</a>} />}
                  </dl>
                </div>
              )}
              {/* Police verification */}
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Police Verification</p>
                <dl className="space-y-1.5 text-sm">
                  <Field label="Status" value={gp.policeVerification ? "Done" : "Pending"} />
                  {gp.policeVerification && (
                    <>
                      <Field label="Certificate No." value={gp.policeVerifCertNo} />
                      <Field label="Issued by" value={gp.policeVerifIssuedBy} />
                      <Field label="Issue date" value={fmtDate(gp.policeVerifIssueDate)} />
                      <Field label="Provision status" value={gp.policeVerifStatus} />
                      {gp.policeVerifFile && <Field label="Document" value={<a href={fileUrl(gp.policeVerifFile)!} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">View</a>} />}
                    </>
                  )}
                </dl>
              </div>
              {/* Insurance */}
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Insurance</p>
                <dl className="space-y-1.5 text-sm">
                  <Field label="Status" value={gp.insurance ? "Active" : "No"} />
                  {gp.insurance && (
                    <>
                      <Field label="Provider" value={gp.insuranceProvider} />
                      <Field label="Policy No." value={gp.insurancePolicyNo} />
                      <Field label="Start" value={fmtDate(gp.insurancePolicyStart)} />
                      <Field label="Expiry" value={fmtDate(gp.insurancePolicyExpiry)} />
                      {gp.insuranceFile && <Field label="Document" value={<a href={fileUrl(gp.insuranceFile)!} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">View</a>} />}
                    </>
                  )}
                </dl>
              </div>
              {/* Employment */}
              {(gp.employeeId || gp.department || gp.designation) && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">Employment</p>
                  <dl className="space-y-1.5 text-sm">
                    <Field label="Employee ID" value={gp.employeeId} />
                    <Field label="Department" value={gp.department} />
                    <Field label="Designation" value={gp.designation} />
                    <Field label="Joining date" value={fmtDate(gp.joiningDate)} />
                  </dl>
                </div>
              )}
              {/* Nominees */}
              {gp.nominees.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Nominees</p>
                  <ul className="space-y-2">
                    {gp.nominees.map((n, i) => (
                      <li key={n.id} className="text-xs text-slate-600 border-t border-[var(--border)] pt-2 first:border-0 first:pt-0">
                        <span className="font-medium text-slate-800">{i + 1}. {n.name}</span>
                        {n.percentage != null && <span className="text-slate-400"> · {n.percentage}%</span>}
                        {n.phoneNumber && <span className="block">{n.phoneNumber}</span>}
                        {n.aadharCardNo && <span className="block text-slate-400">Aadhaar: {n.aadharCardNo}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </SideCard>
          )}
        </div>
      </div>

      {/* KYC review actions */}
      <div className="space-y-4" id="doc-review">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Review & Update KYC</h2>

        <KycStepCard technicianId={t.id} step="profile" title="1 · Profile KYC" status={p?.status ?? "NOT_STARTED"} remark={p?.remark}
          fields={[
            { label: "Full name", value: p?.fullName },
            { label: "Date of birth", value: fmtDate(p?.dob) },
            { label: "Gender", value: p?.gender },
            { label: "Blood group", value: p?.bloodGroup?.name },
            { label: "Aadhaar", value: p?.aadharNumber ?? aadhaarNumber },
            { label: "PAN", value: p?.panNumber },
            { label: "Working field", value: workingFields },
            { label: "Address", value: [p?.addressLine1, p?.addressLine2, p?.city, p?.taluk, p?.district, p?.state, p?.pincode].filter(Boolean).join(", ") },
            { label: "Location", value: p?.location?.name },
          ]} />

        <KycStepCard technicianId={t.id} step="services" title="2 · Services KYC" status={servicesStatus}
          fields={t.serviceCategories.map((s) => ({
            label: s.serviceCategory.name,
            value: s.certificate?.name ?? "No certificate",
          }))} />

        <KycStepCard technicianId={t.id} step="bank" title="3 · Bank KYC" status={b?.status ?? "NOT_STARTED"} remark={b?.remark}
          fields={[
            { label: "Account holder", value: b?.accountHolder },
            { label: "Account number", value: b?.accountNumber },
            { label: "IFSC", value: b?.ifsc },
            { label: "Bank", value: b?.bankName },
            { label: "Branch", value: b?.branch },
            { label: "UPI ID", value: b?.upiId },
          ]} />

        <KycStepCard technicianId={t.id} step="company" title="4 · Company KYC" status={c?.status ?? "NOT_STARTED"} remark={c?.remark}
          fields={[
            { label: "Company type", value: c?.companyType },
            { label: "Company name", value: c?.companyName },
            { label: "GST number", value: c?.gstNumber ? `${c.gstNumber}${c.gstVerified ? " ✓" : ""}` : null },
            { label: "PAN", value: c?.panNumber },
            { label: "Registration no.", value: c?.registrationNumber },
          ]} />

        <KycStepCard technicianId={t.id} step="document" title="5 · Document KYC" status={documentsStatus}
          fields={t.documents.map((d) => ({
            label: `${d.docType}${d.docNumber ? ` (${d.docNumber})` : ""}`,
            value: `${d.frontFile ? "Front ✓" : "—"}${d.backFile ? " · Back ✓" : ""}`,
          }))} />
      </div>
    </div>
  );
}

function SideCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-slate-50">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {badge && <span className="text-xs text-slate-400">{badge}</span>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-slate-700 mt-0.5 text-sm">{value || <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}
