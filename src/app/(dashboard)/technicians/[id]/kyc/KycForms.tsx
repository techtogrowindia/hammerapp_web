"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, ChevronDown, CheckCircle2, ExternalLink } from "lucide-react";
import { saveKycStep, type StepResult } from "./actions";

const UPLOAD_BASE = "/uploads";

function fileUrl(path?: string | null): string | null {
  if (!path) return null;
  return `${UPLOAD_BASE}/${path.replace(/^\/+/, "")}`;
}
function isImage(p: string): boolean {
  return /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(p);
}

/** Shows an inline thumbnail if the path is an image, or a "View" link for PDFs. */
function FilePreview({ path }: { path?: string | null }) {
  const url = fileUrl(path);
  if (!url || !path) return null;
  if (isImage(path)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="Existing file" className="mt-2 max-h-36 rounded-lg border border-slate-200 object-contain bg-slate-50" />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
      <ExternalLink className="h-3 w-3" /> View existing file
    </a>
  );
}

interface Option { id: string; name: string }

interface ExistingData {
  profile: {
    fullName: string;
    dob: string;
    gender: string;
    bloodGroupId: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    locationId: string;
    profilePhoto: string;
  };
  education: {
    qualification: string;
    institution: string;
    yearOfPassing: string;
    certificateFile: string;
  };
  bank: {
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branch: string;
    upiId: string;
    passbookFile: string;
  };
  company: {
    companyType: string;
    companyName: string;
    gstNumber: string;
    panNumber: string;
    registrationNumber: string;
  };
  services: { name: string; certificate: string | null; hasFile: boolean; fileUrl: string | null }[];
  documents: {
    docType: string;
    docNumber: string | null;
    hasFront: boolean;
    hasBack: boolean;
    frontFile: string | null;
    backFile: string | null;
  }[];
}

interface Props {
  technicianId: string;
  bloodGroups: Option[];
  services: Option[];
  locations: Option[];
  certificates: Option[];
  existing: ExistingData;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition-colors"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {pending ? "Saving..." : "Save Step"}
    </button>
  );
}

function StepSection({
  title,
  step,
  technicianId,
  children,
  defaultOpen,
}: {
  title: string;
  step: string;
  technicianId: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [result, action] = useActionState<StepResult | undefined, FormData>(
    saveKycStep,
    undefined,
  );

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50"
      >
        <span className="font-semibold text-slate-800">{title}</span>
        <div className="flex items-center gap-2">
          {result?.ok && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <form action={action} className="p-5 pt-2 space-y-4 border-t border-[var(--border)]">
          <input type="hidden" name="technicianId" value={technicianId} />
          <input type="hidden" name="step" value={step} />
          {children}
          {result && (
            <p className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {result.message}
            </p>
          )}
          <SaveButton />
        </form>
      )}
    </div>
  );
}

function FileInput({
  name,
  label,
  existingPath,
  accept = "image/*,application/pdf",
  hint,
}: {
  name: string;
  label: string;
  existingPath?: string | null;
  accept?: string;
  hint?: string;
}) {
  const url = fileUrl(existingPath);
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {url && existingPath && (
        <div className="mb-2">
          <FilePreview path={existingPath} />
          <p className="text-xs text-green-600 mt-1">
            ✓ {hint ?? "A file is already on record"}. Choose a new file to replace it.
          </p>
        </div>
      )}
      <input name={name} type="file" accept={accept} className={inputCls} />
    </div>
  );
}

export function KycForms({ technicianId, bloodGroups, services, locations, certificates, existing }: Props) {
  const pf = existing.profile;
  const ed = existing.education;
  const bk = existing.bank;
  const co = existing.company;

  return (
    <div className="space-y-3 max-w-3xl">
      {/* 1. Profile */}
      <StepSection title="1 · Profile KYC" step="profile" technicianId={technicianId} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Full Name</label><input name="fullName" defaultValue={pf.fullName} className={inputCls} /></div>
          <div><label className={labelCls}>Date of Birth</label><input name="dob" type="date" defaultValue={pf.dob} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Gender</label>
            <select name="gender" className={inputCls} defaultValue={pf.gender}>
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Blood Group</label>
            <select name="bloodGroupId" className={inputCls} defaultValue={pf.bloodGroupId}>
              <option value="">Select</option>
              {bloodGroups.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Address Line 1</label><input name="addressLine1" defaultValue={pf.addressLine1} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Address Line 2</label><input name="addressLine2" defaultValue={pf.addressLine2} className={inputCls} /></div>
          <div><label className={labelCls}>City</label><input name="city" defaultValue={pf.city} className={inputCls} /></div>
          <div><label className={labelCls}>State</label><input name="state" defaultValue={pf.state} className={inputCls} /></div>
          <div><label className={labelCls}>Pincode</label><input name="pincode" inputMode="numeric" defaultValue={pf.pincode} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Location</label>
            <select name="locationId" className={inputCls} defaultValue={pf.locationId}>
              <option value="">Select</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <FileInput name="profilePhoto" label="Profile Photo" existingPath={pf.profilePhoto} accept="image/*" hint="A photo is already on record" />
          </div>
        </div>
      </StepSection>

      {/* 2. Education */}
      <StepSection title="2 · Education" step="education" technicianId={technicianId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Qualification</label><input name="qualification" defaultValue={ed.qualification} placeholder="ITI / Diploma / ..." className={inputCls} /></div>
          <div><label className={labelCls}>Institution</label><input name="institution" defaultValue={ed.institution} className={inputCls} /></div>
          <div><label className={labelCls}>Year of Passing</label><input name="yearOfPassing" inputMode="numeric" defaultValue={ed.yearOfPassing} placeholder="2018" className={inputCls} /></div>
          <div>
            <FileInput name="certificateFile" label="Certificate File" existingPath={ed.certificateFile} hint="A certificate is already on record" />
          </div>
        </div>
      </StepSection>

      {/* 3. Services */}
      <StepSection title="3 · Services KYC" step="services" technicianId={technicianId}>
        {existing.services.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-3">
            <p className="font-medium text-slate-600">Already added</p>
            {existing.services.map((s, i) => (
              <div key={i} className="space-y-1">
                <p className="text-slate-700">
                  • {s.name}{s.certificate ? ` — ${s.certificate}` : ""}
                </p>
                {s.fileUrl && (
                  <div className="pl-3">
                    <FilePreview path={s.fileUrl} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Service Category *</label>
            <select name="serviceCategoryId" required className={inputCls} defaultValue="">
              <option value="">Select</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Certificate</label>
            <select name="certificateId" className={inputCls} defaultValue="">
              <option value="">None</option>
              {certificates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <FileInput name="certificateFile" label="Certificate File" existingPath={null} />
          </div>
        </div>
        <p className="text-xs text-slate-400">Add one service at a time. Selecting a category already added will update it.</p>
      </StepSection>

      {/* 4. Bank */}
      <StepSection title="4 · Bank KYC" step="bank" technicianId={technicianId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Account Holder</label><input name="accountHolder" defaultValue={bk.accountHolder} className={inputCls} /></div>
          <div><label className={labelCls}>Account Number</label><input name="accountNumber" inputMode="numeric" defaultValue={bk.accountNumber} className={inputCls} /></div>
          <div><label className={labelCls}>IFSC</label><input name="ifsc" defaultValue={bk.ifsc} className={inputCls} /></div>
          <div><label className={labelCls}>Bank Name</label><input name="bankName" defaultValue={bk.bankName} className={inputCls} /></div>
          <div><label className={labelCls}>Branch</label><input name="branch" defaultValue={bk.branch} className={inputCls} /></div>
          <div><label className={labelCls}>UPI ID</label><input name="upiId" defaultValue={bk.upiId} className={inputCls} /></div>
          <div className="sm:col-span-2">
            <FileInput name="passbookFile" label="Passbook / Cheque" existingPath={bk.passbookFile} hint="A passbook file is already on record" />
          </div>
        </div>
      </StepSection>

      {/* 5. Company */}
      <StepSection title="5 · Company KYC" step="company" technicianId={technicianId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company Type</label>
            <select name="companyType" className={inputCls} defaultValue={co.companyType}>
              <option value="INDIVIDUAL">Individual</option>
              <option value="PROPRIETORSHIP">Proprietorship</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="PRIVATE_LIMITED">Private Limited</option>
              <option value="LLP">LLP</option>
            </select>
          </div>
          <div><label className={labelCls}>Company Name</label><input name="companyName" defaultValue={co.companyName} className={inputCls} /></div>
          <div><label className={labelCls}>GST Number</label><input name="gstNumber" defaultValue={co.gstNumber} className={inputCls} /></div>
          <div><label className={labelCls}>PAN</label><input name="panNumber" defaultValue={co.panNumber} className={inputCls} /></div>
          <div><label className={labelCls}>Registration Number</label><input name="registrationNumber" defaultValue={co.registrationNumber} className={inputCls} /></div>
        </div>
      </StepSection>

      {/* 6. Documents */}
      <StepSection title="6 · Document KYC" step="document" technicianId={technicianId}>
        {existing.documents.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-4">
            <p className="font-medium text-slate-600">Already added</p>
            {existing.documents.map((d, i) => (
              <div key={i}>
                <p className="text-slate-700 font-medium">
                  {d.docType}{d.docNumber ? ` — ${d.docNumber}` : ""}
                </p>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {d.frontFile && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Front</p>
                      <FilePreview path={d.frontFile} />
                    </div>
                  )}
                  {d.backFile && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Back</p>
                      <FilePreview path={d.backFile} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Document Type *</label>
            <select name="docType" required className={inputCls} defaultValue="">
              <option value="">Select</option>
              <option value="AADHAAR">Aadhaar</option>
              <option value="PAN">PAN</option>
              <option value="DRIVING_LICENSE">Driving License</option>
              <option value="VOTER_ID">Voter ID</option>
            </select>
          </div>
          <div><label className={labelCls}>Document Number</label><input name="docNumber" className={inputCls} /></div>
          <div><label className={labelCls}>Front Image</label><input name="frontFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
          <div><label className={labelCls}>Back Image</label><input name="backFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
        </div>
        <p className="text-xs text-slate-400">Add one document at a time. Selecting a type already added will update it.</p>
      </StepSection>
    </div>
  );
}
