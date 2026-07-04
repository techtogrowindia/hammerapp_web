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
interface LeafService { id: string; name: string; categoryName: string }

const FESTIVALS = ["Pongal", "Onam", "Diwali", "Christmas", "Eid", "Vishu", "Navratri", "Holi", "Durga Puja", "Tamil New Year"];
const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

interface ExistingData {
  profile: {
    fullName: string; dob: string; bloodGroupId: string;
    aadharNumber: string; panNumber: string;
    addressLine1: string; pincode: string; district: string; taluk: string; city: string;
    gender: string; addressLine2: string; state: string; locationId: string; profilePhoto: string;
    domestic: boolean; commercial: boolean; corporate: boolean;
  };
  education: {
    qualification: string; institution: string; yearOfPassing: string;
    certificateFile: string; certificateFiles: string[];
  };
  bank: {
    bankName: string; accountHolder: string; ifsc: string;
    accountNumber: string; branch: string; upiId: string; passbookFile: string;
  };
  company: {
    companyAvailable: boolean; gstAvailable: boolean;
    gstNumber: string; legalName: string; numberOfEmployees: string;
    companyName: string; companyAddress: string; pincode: string;
    companyDistrict: string; companyTaluk: string; cityTownVillage: string;
    companyType: string; panNumber: string; registrationNumber: string;
  };
  services: {
    id: string; name: string; certificate: string | null;
    yearsOfExperience: number | null; hasFile: boolean; fileUrl: string | null;
  }[];
  technicianServices: { serviceId: string; serviceName: string }[];
  serviceCertificates: {
    id: string; serviceName: string; certificateName: string;
    certificateNumber: string; noExpiry: boolean; expiryDate: string; files: string[];
  }[];
  generalProfile: {
    isMarried: boolean; spouseName: string; marriageDate: string;
    emergencyContactNo: string; sosVisibility: boolean;
    genderIdentity: string; festivalSelection: string[];
    earningScreenVisible: boolean;
    tshirtSize: string; colourPreference: string;
    welfareCard: boolean; welfareCardScheme: string; welfareCardExpiry: string; welfareCardFile: string;
    policeVerification: boolean; policeVerifCertNo: string; policeVerifIssuedBy: string;
    policeVerifIssueDate: string; policeVerifFile: string; policeVerifStatus: string;
    employeeId: string; department: string; designation: string; joiningDate: string;
    insurance: boolean; insuranceProvider: string; insurancePolicyNo: string;
    insurancePolicyStart: string; insurancePolicyExpiry: string; insuranceFile: string;
    nominees: { name: string; aadharCardNo: string; phoneNumber: string; percentage: string }[];
  };
  documents: {
    docType: string; docNumber: string | null;
    hasFront: boolean; hasBack: boolean;
    frontFile: string | null; backFile: string | null;
  }[];
}

interface Props {
  technicianId: string;
  bloodGroups: Option[];
  serviceCategories: Option[];
  leafServices: LeafService[];
  locations: Option[];
  certificates: Option[];
  existing: ExistingData;
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1";
const sectionLabelCls = "text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition-colors">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {pending ? "Saving..." : "Save Step"}
    </button>
  );
}

function StepSection({ title, step, technicianId, children, defaultOpen }: {
  title: string; step: string; technicianId: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [result, action] = useActionState<StepResult | undefined, FormData>(saveKycStep, undefined);

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50">
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

function FileInput({ name, label, existingPath, accept = "image/*,application/pdf", hint, multiple }: {
  name: string; label: string; existingPath?: string | null;
  accept?: string; hint?: string; multiple?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {existingPath && fileUrl(existingPath) && (
        <div className="mb-2">
          <FilePreview path={existingPath} />
          <p className="text-xs text-green-600 mt-1">✓ {hint ?? "File on record"}. Choose a new file to replace it.</p>
        </div>
      )}
      <input name={name} type="file" accept={accept} multiple={multiple} className={inputCls} />
    </div>
  );
}

function CheckboxField({ name, label, defaultChecked }: {
  name: string; label: string; defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-[var(--accent)] focus:ring-[var(--accent)]" />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

// ─── Step 7: General Profile (renders its own internal state for nominees) ───

function GeneralProfileStep({ technicianId, existing: gp }: {
  technicianId: string;
  existing: ExistingData["generalProfile"];
}) {
  const [nominees, setNominees] = useState(
    gp.nominees.length > 0
      ? gp.nominees
      : [{ name: "", aadharCardNo: "", phoneNumber: "", percentage: "" }],
  );
  const [isMarried, setIsMarried] = useState(gp.isMarried);
  const [hasFirm] = useState(false); // controlled by company step, not here
  const [showPolice, setShowPolice] = useState(gp.policeVerification);
  const [showInsurance, setShowInsurance] = useState(gp.insurance);
  const [showWelfare, setShowWelfare] = useState(gp.welfareCard);

  return (
    <StepSection title="8 · General Profile" step="general_profile" technicianId={technicianId}>
      {/* Marital Status */}
      <p className={sectionLabelCls}>Marital Status</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isMarried" value="true" defaultChecked={gp.isMarried}
              onChange={(e) => setIsMarried(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300" />
            <span className="text-sm text-slate-700">Married</span>
          </label>
        </div>
        {isMarried && (
          <div>
            <label className={labelCls}>Spouse Name</label>
            <input name="spouseName" defaultValue={gp.spouseName} className={inputCls} />
          </div>
        )}
        {isMarried && (
          <div>
            <label className={labelCls}>Marriage Date</label>
            <input name="marriageDate" type="date" defaultValue={gp.marriageDate} className={inputCls} />
          </div>
        )}
      </div>

      {/* Nominees */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={sectionLabelCls}>Nominees</p>
          <button type="button"
            onClick={() => setNominees((n) => [...n, { name: "", aadharCardNo: "", phoneNumber: "", percentage: "" }])}
            className="text-xs text-[var(--accent)] hover:underline">+ Add nominee</button>
        </div>
        {nominees.map((nom, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-3 mb-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Nominee {i + 1}</p>
              {nominees.length > 1 && (
                <button type="button" onClick={() => setNominees((n) => n.filter((_, j) => j !== i))}
                  className="text-xs text-red-400 hover:underline">Remove</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Name</label><input name={`nominee_name_${i}`} defaultValue={nom.name} className={inputCls} /></div>
              <div><label className={labelCls}>Aadhaar No.</label><input name={`nominee_aadhar_${i}`} defaultValue={nom.aadharCardNo} inputMode="numeric" maxLength={12} className={inputCls} /></div>
              <div><label className={labelCls}>Phone Number</label><input name={`nominee_phone_${i}`} defaultValue={nom.phoneNumber} inputMode="tel" className={inputCls} /></div>
              <div><label className={labelCls}>Share %</label><input name={`nominee_pct_${i}`} type="number" min={0} max={100} defaultValue={nom.percentage} className={inputCls} /></div>
            </div>
          </div>
        ))}
        <input type="hidden" name="nomineeCount" value={nominees.length} />
      </div>

      {/* Spouse & Emergency */}
      <p className={sectionLabelCls}>Emergency / SOS</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Emergency Contact No.</label>
          <input name="emergencyContactNo" inputMode="tel" defaultValue={gp.emergencyContactNo} className={inputCls} />
        </div>
        <div className="flex items-end pb-2">
          <CheckboxField name="sosVisibility" label="Enable SOS Visibility" defaultChecked={gp.sosVisibility} />
        </div>
      </div>

      {/* Gender & Preferences */}
      <p className={sectionLabelCls}>Preferences</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Gender Identity</label>
          <input name="genderIdentity" defaultValue={gp.genderIdentity} placeholder="e.g. Male, Female, Non-binary" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>T-shirt Size</label>
          <select name="tshirtSize" className={inputCls} defaultValue={gp.tshirtSize}>
            <option value="">Select</option>
            {TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Colour Preference</label>
          <input name="colourPreference" defaultValue={gp.colourPreference} placeholder="e.g. Blue" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <CheckboxField name="earningScreenVisible" label="Earning Screen Visibility" defaultChecked={gp.earningScreenVisible} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Festival Preferences</label>
        <div className="flex flex-wrap gap-3 mt-1">
          {FESTIVALS.map((f) => (
            <label key={f} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700">
              <input type="checkbox" name="festivalSelection" value={f}
                defaultChecked={gp.festivalSelection.includes(f)}
                className="h-4 w-4 rounded border-slate-300" />
              {f}
            </label>
          ))}
        </div>
      </div>

      {/* Government Welfare Card */}
      <p className={sectionLabelCls}>Government Welfare Card</p>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="welfareCard" value="true" defaultChecked={gp.welfareCard}
            onChange={(e) => setShowWelfare(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300" />
          <span className="text-sm text-slate-700">Have Welfare Card</span>
        </label>
        {showWelfare && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
            <div><label className={labelCls}>Card Type / Scheme Name</label><input name="welfareCardScheme" defaultValue={gp.welfareCardScheme} className={inputCls} /></div>
            <div><label className={labelCls}>Card Expiry Date</label><input name="welfareCardExpiry" type="date" defaultValue={gp.welfareCardExpiry} className={inputCls} /></div>
            <div className="sm:col-span-2">
              <FileInput name="welfareCardFile" label="Card Image" existingPath={gp.welfareCardFile} accept="image/*,application/pdf" />
            </div>
          </div>
        )}
      </div>

      {/* Police Verification */}
      <p className={sectionLabelCls}>Police Verification</p>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="policeVerification" value="true" defaultChecked={gp.policeVerification}
            onChange={(e) => setShowPolice(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300" />
          <span className="text-sm text-slate-700">Police Verification Done</span>
        </label>
        {showPolice && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
            <div><label className={labelCls}>Certificate Number</label><input name="policeVerifCertNo" defaultValue={gp.policeVerifCertNo} className={inputCls} /></div>
            <div><label className={labelCls}>Issued By</label><input name="policeVerifIssuedBy" defaultValue={gp.policeVerifIssuedBy} className={inputCls} /></div>
            <div><label className={labelCls}>Issue Date</label><input name="policeVerifIssueDate" type="date" defaultValue={gp.policeVerifIssueDate} className={inputCls} /></div>
            <div>
              <label className={labelCls}>Provision Status</label>
              <input name="policeVerifStatus" defaultValue={gp.policeVerifStatus} placeholder="e.g. Approved" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <FileInput name="policeVerifFile" label="Upload Document" existingPath={gp.policeVerifFile} accept="image/*,application/pdf" />
            </div>
          </div>
        )}
      </div>

      {/* Employment */}
      <p className={sectionLabelCls}>Employment (Internal)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={labelCls}>Employee ID</label><input name="employeeId" defaultValue={gp.employeeId} className={inputCls} /></div>
        <div><label className={labelCls}>Department</label><input name="department" defaultValue={gp.department} className={inputCls} /></div>
        <div><label className={labelCls}>Designation</label><input name="designation" defaultValue={gp.designation} className={inputCls} /></div>
        <div><label className={labelCls}>Joining Date</label><input name="joiningDate" type="date" defaultValue={gp.joiningDate} className={inputCls} /></div>
      </div>

      {/* Insurance */}
      <p className={sectionLabelCls}>Insurance</p>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="insurance" value="true" defaultChecked={gp.insurance}
            onChange={(e) => setShowInsurance(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300" />
          <span className="text-sm text-slate-700">Insurance Active</span>
        </label>
        {showInsurance && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
            <div><label className={labelCls}>Insurance Provider</label><input name="insuranceProvider" defaultValue={gp.insuranceProvider} className={inputCls} /></div>
            <div><label className={labelCls}>Policy Number</label><input name="insurancePolicyNo" defaultValue={gp.insurancePolicyNo} className={inputCls} /></div>
            <div><label className={labelCls}>Policy Start Date</label><input name="insurancePolicyStart" type="date" defaultValue={gp.insurancePolicyStart} className={inputCls} /></div>
            <div><label className={labelCls}>Policy Expiry Date</label><input name="insurancePolicyExpiry" type="date" defaultValue={gp.insurancePolicyExpiry} className={inputCls} /></div>
            <div className="sm:col-span-2">
              <FileInput name="insuranceFile" label="Upload Insurance Document" existingPath={gp.insuranceFile} accept="image/*,application/pdf" />
            </div>
          </div>
        )}
      </div>
    </StepSection>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export function KycForms({ technicianId, bloodGroups, serviceCategories, leafServices, locations, certificates, existing }: Props) {
  const pf = existing.profile;
  const ed = existing.education;
  const bk = existing.bank;
  const co = existing.company;
  const [hasFirm, setHasFirm] = useState(co.companyAvailable);
  const [hasGst, setHasGst] = useState(co.gstAvailable);
  const [hasEmployees, setHasEmployees] = useState((co.numberOfEmployees ?? "") !== "");

  return (
    <div className="space-y-3 max-w-3xl">

      {/* ── Step 1: Personal ── */}
      <StepSection title="1 · Personal KYC" step="profile" technicianId={technicianId} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* App order: Name, DOB, Blood Group, Aadhaar, PAN, Address, Pincode, District, Taluk, City, Working Field */}
          <div className="sm:col-span-2"><label className={labelCls}>Name (As per Aadhaar)</label><input name="fullName" defaultValue={pf.fullName} className={inputCls} /></div>
          <div><label className={labelCls}>Date of Birth</label><input name="dob" type="date" defaultValue={pf.dob} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Blood Group</label>
            <select name="bloodGroupId" className={inputCls} defaultValue={pf.bloodGroupId}>
              <option value="">Select</option>
              {bloodGroups.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Aadhaar Number</label>
            <input name="aadharNumber" defaultValue={pf.aadharNumber} inputMode="numeric" maxLength={12} placeholder="12-digit Aadhaar" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>PAN Number</label>
            <input name="panNumber" defaultValue={pf.panNumber} maxLength={10} placeholder="ABCDE1234F" className={`${inputCls} uppercase`} />
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Address</label><input name="addressLine1" defaultValue={pf.addressLine1} className={inputCls} /></div>
          <div><label className={labelCls}>Pincode</label><input name="pincode" inputMode="numeric" maxLength={6} defaultValue={pf.pincode} className={inputCls} /></div>
          <div><label className={labelCls}>District</label><input name="district" defaultValue={pf.district} className={inputCls} /></div>
          <div><label className={labelCls}>Taluk</label><input name="taluk" defaultValue={pf.taluk} className={inputCls} /></div>
          <div><label className={labelCls}>City / Town / Village</label><input name="city" defaultValue={pf.city} className={inputCls} /></div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Working Field</label>
            <div className="flex flex-wrap gap-5 mt-1">
              <CheckboxField name="domestic" label="Domestic" defaultChecked={pf.domestic} />
              <CheckboxField name="commercial" label="Commercial" defaultChecked={pf.commercial} />
              <CheckboxField name="corporate" label="Corporate" defaultChecked={pf.corporate} />
            </div>
          </div>
          {/* Admin-only extra fields */}
          <div>
            <label className={labelCls}>Gender</label>
            <select name="gender" className={inputCls} defaultValue={pf.gender}>
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div><label className={labelCls}>State</label><input name="state" defaultValue={pf.state} className={inputCls} /></div>
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

      {/* ── Step 2: Education ── */}
      <StepSection title="2 · Education" step="education" technicianId={technicianId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Maximum Educational Qualification</label>
            <select name="qualification" className={inputCls} defaultValue={ed.qualification}>
              <option value="">Select</option>
              <option value="SSLC">SSLC</option>
              <option value="HSC">HSC</option>
              <option value="ITI">ITI</option>
              <option value="DIPLOMA">Diploma</option>
              <option value="Graduate">Graduate</option>
              <option value="Post Graduate">Post Graduate</option>
              <option value="OTHERS">Others</option>
            </select>
          </div>
          <div><label className={labelCls}>Passed Out Year</label><input name="yearOfPassing" inputMode="numeric" defaultValue={ed.yearOfPassing} placeholder="2018" className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Institution</label><input name="institution" defaultValue={ed.institution} className={inputCls} /></div>
        </div>
        {/* Existing certificates */}
        {ed.certificateFiles.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-3">
            <p className="text-sm font-medium text-slate-600">Existing certificates ({ed.certificateFiles.length})</p>
            <div className="flex flex-wrap gap-4">
              {ed.certificateFiles.map((f, i) => (
                <div key={i}><p className="text-xs text-slate-500 mb-1">Certificate {i + 1}</p><FilePreview path={f} /></div>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className={labelCls}>Upload Certificate(s)</label>
          <p className="text-xs text-slate-400 mb-1">Multiple files allowed. New uploads are added to existing ones.</p>
          <input name="certificateFile" type="file" accept="image/*,application/pdf" multiple className={inputCls} />
        </div>
      </StepSection>

      {/* ── Step 3: Services (Categories + Experience + Leaf Services) ── */}
      <StepSection title="3 · Services" step="services" technicianId={technicianId}>
        {/* Already-added categories */}
        {existing.services.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-2">
            <p className="font-medium text-slate-600">Added categories</p>
            {existing.services.map((s, i) => (
              <div key={i} className="space-y-1">
                <p className="text-slate-700">• {s.name}{s.yearsOfExperience != null ? ` — ${s.yearsOfExperience} yr${s.yearsOfExperience !== 1 ? "s" : ""}` : ""}
                  {s.certificate ? ` · ${s.certificate}` : ""}</p>
                {s.fileUrl && <div className="pl-3"><FilePreview path={s.fileUrl} /></div>}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Service Category (Max 3) *</label>
            <select name="serviceCategoryId" required className={inputCls} defaultValue="">
              <option value="">Select</option>
              {serviceCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Years of Experience</label>
            <input name="yearsOfExperience" type="number" min={0} max={50} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Certificate</label>
            <select name="certificateId" className={inputCls} defaultValue="">
              <option value="">None</option>
              {certificates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Certificate File</label><input name="certificateFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
        </div>
        <p className="text-xs text-slate-400">Add one category at a time. Selecting the same category again updates it.</p>
      </StepSection>

      {/* ── Step 3b: Specific Leaf Services ── */}
      {leafServices.length > 0 && (
        <StepSection title="3b · Specific Services" step="leaf_services" technicianId={technicianId}>
          {existing.technicianServices.length > 0 && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
              <p className="font-medium text-slate-600">Currently selected services</p>
              {existing.technicianServices.map((ts, i) => (
                <p key={i} className="text-slate-700">• {ts.serviceName}</p>
              ))}
            </div>
          )}
          <div>
            <label className={labelCls}>Select Services (hold Ctrl/Cmd for multiple)</label>
            <select name="leafServiceIds" multiple className={`${inputCls} h-44`}
              defaultValue={existing.technicianServices.map((ts) => ts.serviceId)}>
              {leafServices.map((ls) => (
                <option key={ls.id} value={ls.id}>{ls.categoryName} → {ls.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400">Selecting here replaces the current selection entirely.</p>
        </StepSection>
      )}

      {/* ── Step 4: Service Certificates (Professional Documents) ── */}
      <StepSection title="4 · Service Certificates" step="service_certificate" technicianId={technicianId}>
        {existing.serviceCertificates.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-4">
            <p className="font-medium text-slate-600">Added certificates</p>
            {existing.serviceCertificates.map((sc, i) => (
              <div key={i} className="space-y-1">
                <p className="text-slate-700 font-medium">{sc.serviceName}{sc.certificateName ? ` — ${sc.certificateName}` : ""}</p>
                {sc.certificateNumber && <p className="text-xs text-slate-500">No: {sc.certificateNumber}</p>}
                <p className="text-xs text-slate-500">{sc.noExpiry ? "No expiry" : sc.expiryDate ? `Expires: ${sc.expiryDate}` : ""}</p>
                {sc.files.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {sc.files.map((f, j) => <div key={j}><FilePreview path={f} /></div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Service *</label>
            <select name="serviceId" required className={inputCls} defaultValue="">
              <option value="">Select</option>
              {leafServices.map((ls) => <option key={ls.id} value={ls.id}>{ls.categoryName} → {ls.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Certificate Type</label>
            <select name="certificateId" className={inputCls} defaultValue="">
              <option value="">None</option>
              {certificates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Certificate Number</label><input name="certificateNumber" className={inputCls} /></div>
          <div><label className={labelCls}>Expiry Date</label><input name="expiryDate" type="date" className={inputCls} /></div>
          <div className="sm:col-span-2"><CheckboxField name="noExpiry" label="No expiry / lifetime certificate" defaultChecked /></div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Certificate Files</label>
            <p className="text-xs text-slate-400 mb-1">Multiple files allowed.</p>
            <input name="certFiles" type="file" accept="image/*,application/pdf" multiple className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-slate-400">Each submission adds a new certificate record.</p>
      </StepSection>

      {/* ── Step 5: Company KYC ── */}
      <StepSection title="5 · Firm / Company KYC" step="company" technicianId={technicianId}>
        {/* App order: Has Firm → Has GST → GSTIN → Has Employees → Employees count → Legal Name → Name → Address → Pincode → District → Taluk → City */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" name="companyAvailable" value="true" defaultChecked={co.companyAvailable}
              onChange={(e) => setHasFirm(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <span className="text-sm text-slate-700">Do you have a Firm / Company / Agency?</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" name="gstAvailable" value="true" defaultChecked={co.gstAvailable}
              onChange={(e) => setHasGst(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <span className="text-sm text-slate-700">Do you have GST?</span>
          </label>
        </div>
        {hasGst && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>GSTIN</label><input name="gstNumber" defaultValue={co.gstNumber} maxLength={15} className={`${inputCls} uppercase`} /></div>
            <div><label className={labelCls}>Legal Name (from GST)</label><input name="legalName" defaultValue={co.legalName} className={inputCls} /></div>
          </div>
        )}
        <label className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50">
          <input type="checkbox" defaultChecked={hasEmployees}
            onChange={(e) => setHasEmployees(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          <span className="text-sm text-slate-700">Do you have Employees / Staff?</span>
        </label>
        {hasEmployees && (
          <div>
            <label className={labelCls}>Number of Employees</label>
            <input name="numberOfEmployees" type="number" min={0} defaultValue={co.numberOfEmployees} className={inputCls} />
          </div>
        )}
        {hasFirm && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className={labelCls}>Company Name</label><input name="companyName" defaultValue={co.companyName} className={inputCls} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Company Address</label><input name="companyAddress" defaultValue={co.companyAddress} className={inputCls} /></div>
            <div><label className={labelCls}>Pincode</label><input name="companyPincode" inputMode="numeric" maxLength={6} defaultValue={co.pincode} className={inputCls} /></div>
            <div><label className={labelCls}>District</label><input name="companyDistrict" defaultValue={co.companyDistrict} className={inputCls} /></div>
            <div><label className={labelCls}>Taluk</label><input name="companyTaluk" defaultValue={co.companyTaluk} className={inputCls} /></div>
            <div><label className={labelCls}>City / Town / Village</label><input name="cityTownVillage" defaultValue={co.cityTownVillage} className={inputCls} /></div>
          </div>
        )}
        {/* Admin-only extras */}
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700">More fields (admin only)</summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div><label className={labelCls}>PAN</label><input name="panNumber" defaultValue={co.panNumber} className={`${inputCls} uppercase`} /></div>
            <div><label className={labelCls}>Registration Number</label><input name="registrationNumber" defaultValue={co.registrationNumber} className={inputCls} /></div>
          </div>
        </details>
      </StepSection>

      {/* ── Step 6: Bank KYC ── */}
      <StepSection title="6 · Bank KYC" step="bank" technicianId={technicianId}>
        {/* App order: Bank Name, Account Holder Name, Account Type, Account Number, Confirm Account Number, IFSC, Branch, UPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Bank Name</label><input name="bankName" defaultValue={bk.bankName} className={inputCls} /></div>
          <div><label className={labelCls}>Account Holder Name</label><input name="accountHolder" defaultValue={bk.accountHolder} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Account Type</label>
            <select name="accountType" className={inputCls} defaultValue="">
              <option value="Saving account">Saving account</option>
              <option value="Current account">Current account</option>
            </select>
          </div>
          <div><label className={labelCls}>Account Number</label><input name="accountNumber" inputMode="numeric" defaultValue={bk.accountNumber} className={inputCls} /></div>
          <div><label className={labelCls}>Confirm Account Number</label><input name="confirmAccountNumber" inputMode="numeric" className={inputCls} placeholder="Re-enter account number" /></div>
          <div><label className={labelCls}>IFSC Code</label><input name="ifsc" defaultValue={bk.ifsc} className={`${inputCls} uppercase`} /></div>
          <div><label className={labelCls}>Branch Name</label><input name="branch" defaultValue={bk.branch} className={inputCls} /></div>
          <div><label className={labelCls}>UPI ID / UPI Number</label><input name="upiId" defaultValue={bk.upiId} className={inputCls} /></div>
          <div className="sm:col-span-2">
            <FileInput name="passbookFile" label="Bank Statement / Passbook" existingPath={bk.passbookFile} hint="A passbook file is already on record" />
          </div>
        </div>
      </StepSection>

      {/* ── Step 7: Documents ── */}
      <StepSection title="7 · Document KYC" step="document" technicianId={technicianId}>
        {/* App order: Aadhar Front, Aadhar Back, PAN, Bank Statement, Profile Photo, License Front, License Back, Company Photo, GST */}
        {existing.documents.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-4">
            <p className="font-medium text-slate-600">Already added</p>
            {existing.documents.map((d, i) => (
              <div key={i}>
                <p className="text-slate-700 font-medium">{d.docType}{d.docNumber ? ` — ${d.docNumber}` : ""}</p>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {d.frontFile && <div><p className="text-xs text-slate-500 mb-1">Front</p><FilePreview path={d.frontFile} /></div>}
                  {d.backFile && <div><p className="text-xs text-slate-500 mb-1">Back</p><FilePreview path={d.backFile} /></div>}
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
              <option value="PAN">PAN Card</option>
              <option value="BANK_PASSBOOK">Bank Statement</option>
              <option value="PROFILE_PHOTO">Profile Photo</option>
              <option value="DRIVING_LICENSE">Driving License</option>
              <option value="COMPANY_PHOTO">Company Photo</option>
              <option value="GST">GST Document</option>
              <option value="VOTER_ID">Voter ID</option>
            </select>
          </div>
          <div><label className={labelCls}>Document Number (if any)</label><input name="docNumber" className={inputCls} /></div>
          <div><label className={labelCls}>Front / Main Image</label><input name="frontFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
          <div><label className={labelCls}>Back Image (if applicable)</label><input name="backFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
        </div>
        <p className="text-xs text-slate-400">Add one document at a time. Selecting a type already added will update it.</p>
      </StepSection>

      {/* ── Step 8: General Profile ── */}
      <GeneralProfileStep technicianId={technicianId} existing={existing.generalProfile} />

    </div>
  );
}
