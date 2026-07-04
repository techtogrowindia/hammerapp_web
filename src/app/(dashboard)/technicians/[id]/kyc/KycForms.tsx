"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, ChevronDown, CheckCircle2 } from "lucide-react";
import { saveKycStep, type StepResult } from "./actions";

interface Option { id: string; name: string }

interface Props {
  technicianId: string;
  bloodGroups: Option[];
  services: Option[];
  locations: Option[];
  certificates: Option[];
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

export function KycForms({ technicianId, bloodGroups, services, locations, certificates }: Props) {
  return (
    <div className="space-y-3 max-w-3xl">
      {/* 1. Profile */}
      <StepSection title="1 · Profile KYC" step="profile" technicianId={technicianId} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Full Name</label><input name="fullName" className={inputCls} /></div>
          <div><label className={labelCls}>Date of Birth</label><input name="dob" type="date" className={inputCls} /></div>
          <div>
            <label className={labelCls}>Gender</label>
            <select name="gender" className={inputCls} defaultValue="">
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Blood Group</label>
            <select name="bloodGroupId" className={inputCls} defaultValue="">
              <option value="">Select</option>
              {bloodGroups.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Address Line 1</label><input name="addressLine1" className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Address Line 2</label><input name="addressLine2" className={inputCls} /></div>
          <div><label className={labelCls}>City</label><input name="city" className={inputCls} /></div>
          <div><label className={labelCls}>State</label><input name="state" className={inputCls} /></div>
          <div><label className={labelCls}>Pincode</label><input name="pincode" inputMode="numeric" className={inputCls} /></div>
          <div>
            <label className={labelCls}>Location</label>
            <select name="locationId" className={inputCls} defaultValue="">
              <option value="">Select</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Profile Photo</label><input name="profilePhoto" type="file" accept="image/*" className={inputCls} /></div>
        </div>
      </StepSection>

      {/* 2. Education */}
      <StepSection title="2 · Education" step="education" technicianId={technicianId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Qualification</label><input name="qualification" placeholder="ITI / Diploma / ..." className={inputCls} /></div>
          <div><label className={labelCls}>Institution</label><input name="institution" className={inputCls} /></div>
          <div><label className={labelCls}>Year of Passing</label><input name="yearOfPassing" inputMode="numeric" placeholder="2018" className={inputCls} /></div>
          <div><label className={labelCls}>Certificate File</label><input name="certificateFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
        </div>
      </StepSection>

      {/* 3. Services */}
      <StepSection title="3 · Services KYC" step="services" technicianId={technicianId}>
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
          <div className="sm:col-span-2"><label className={labelCls}>Certificate File</label><input name="certificateFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
        </div>
        <p className="text-xs text-slate-400">Add one service at a time. Repeat to add more.</p>
      </StepSection>

      {/* 4. Bank */}
      <StepSection title="4 · Bank KYC" step="bank" technicianId={technicianId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Account Holder</label><input name="accountHolder" className={inputCls} /></div>
          <div><label className={labelCls}>Account Number</label><input name="accountNumber" inputMode="numeric" className={inputCls} /></div>
          <div><label className={labelCls}>IFSC</label><input name="ifsc" className={inputCls} /></div>
          <div><label className={labelCls}>Bank Name</label><input name="bankName" className={inputCls} /></div>
          <div><label className={labelCls}>Branch</label><input name="branch" className={inputCls} /></div>
          <div><label className={labelCls}>UPI ID</label><input name="upiId" className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Passbook / Cheque</label><input name="passbookFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
        </div>
      </StepSection>

      {/* 5. Company */}
      <StepSection title="5 · Company KYC" step="company" technicianId={technicianId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Company Type</label>
            <select name="companyType" className={inputCls} defaultValue="INDIVIDUAL">
              <option value="INDIVIDUAL">Individual</option>
              <option value="PROPRIETORSHIP">Proprietorship</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="PRIVATE_LIMITED">Private Limited</option>
              <option value="LLP">LLP</option>
            </select>
          </div>
          <div><label className={labelCls}>Company Name</label><input name="companyName" className={inputCls} /></div>
          <div><label className={labelCls}>GST Number</label><input name="gstNumber" className={inputCls} /></div>
          <div><label className={labelCls}>PAN</label><input name="panNumber" className={inputCls} /></div>
          <div><label className={labelCls}>Registration Number</label><input name="registrationNumber" className={inputCls} /></div>
        </div>
      </StepSection>

      {/* 6. Documents */}
      <StepSection title="6 · Document KYC" step="document" technicianId={technicianId}>
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
        <p className="text-xs text-slate-400">Add one document at a time. Repeat to add more.</p>
      </StepSection>
    </div>
  );
}
