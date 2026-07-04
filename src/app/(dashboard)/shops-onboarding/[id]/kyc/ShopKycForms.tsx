"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save, ChevronDown, CheckCircle2, ExternalLink } from "lucide-react";
import { saveShopKycStep, type StepResult } from "./actions";

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

function FileInput({
  name, label, existingPath, accept = "image/*,application/pdf", hint,
}: {
  name: string; label: string; existingPath?: string | null; accept?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {existingPath && (
        <div className="mb-2">
          <FilePreview path={existingPath} />
          <p className="text-xs text-green-600 mt-1">✓ {hint ?? "A file is already on record"}. Choose a new file to replace it.</p>
        </div>
      )}
      <input name={name} type="file" accept={accept} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
    </div>
  );
}

interface Option { id: string; name: string }
interface ProductOption { id: number; name: string; subcategories: { id: number; name: string }[] }

interface ExistingData {
  profile: {
    name: string; dob: string; bloodGroup: string; aadharNumber: string; panNumber: string;
    firmType: string; businessPan: string; address: string; cityTownVillage: string;
    taluk: string; district: string; pincode: string; profilePhoto: string;
  };
  partners: string[];
  company: {
    hasGst: boolean; gstNumber: string; legalName: string; companyName: string;
    companyAddress: string; cityTownVillage: string; taluk: string; district: string;
    companyPincode: string; numberOfEmployees: string;
  };
  bank: {
    bankName: string; accountHolder: string; accountNumber: string; accountType: string;
    ifsc: string; branch: string; upiId: string; passbookFile: string;
  };
  products: { name: string; subcategory: string | null }[];
  documents: {
    docType: string; docNumber: string | null;
    hasFront: boolean; hasBack: boolean;
    frontFile: string | null; backFile: string | null;
  }[];
}

interface Props {
  shopId: number;
  bloodGroups: Option[];
  products: ProductOption[];
  existing: ExistingData;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1";

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

function StepSection({
  title, step, shopId, children, defaultOpen,
}: {
  title: string; step: string; shopId: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [result, action] = useActionState<StepResult | undefined, FormData>(saveShopKycStep, undefined);

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
          <input type="hidden" name="shopId" value={shopId} />
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

export function ShopKycForms({ shopId, bloodGroups, products, existing }: Props) {
  const pf = existing.profile;
  const co = existing.company;
  const bk = existing.bank;

  return (
    <div className="space-y-3 max-w-3xl">
      {/* 1. Profile */}
      <StepSection title="1 · Profile KYC" step="profile" shopId={shopId} defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Name (as per Aadhaar)</label><input name="name" defaultValue={pf.name} className={inputCls} /></div>
          <div><label className={labelCls}>Date of Birth</label><input name="dob" type="date" defaultValue={pf.dob} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Blood Group</label>
            <select name="bloodGroup" className={inputCls} defaultValue={pf.bloodGroup}>
              <option value="">Select</option>
              {bloodGroups.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Firm Type</label>
            <select name="firmType" className={inputCls} defaultValue={pf.firmType}>
              <option value="">Select</option>
              <option value="PROPRIETORSHIP">Proprietorship</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="PRIVATE_LIMITED">Private Limited</option>
            </select>
          </div>
          <div><label className={labelCls}>Aadhaar Number</label><input name="aadharNumber" inputMode="numeric" defaultValue={pf.aadharNumber} className={inputCls} /></div>
          <div><label className={labelCls}>PAN Number</label><input name="panNumber" defaultValue={pf.panNumber} className={inputCls} /></div>
          <div><label className={labelCls}>Business PAN</label><input name="businessPan" defaultValue={pf.businessPan} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Address</label><input name="address" defaultValue={pf.address} className={inputCls} /></div>
          <div><label className={labelCls}>City / Town / Village</label><input name="cityTownVillage" defaultValue={pf.cityTownVillage} className={inputCls} /></div>
          <div><label className={labelCls}>Taluk</label><input name="taluk" defaultValue={pf.taluk} className={inputCls} /></div>
          <div><label className={labelCls}>District</label><input name="district" defaultValue={pf.district} className={inputCls} /></div>
          <div><label className={labelCls}>Pincode</label><input name="pincode" inputMode="numeric" defaultValue={pf.pincode} className={inputCls} /></div>
          <div className="sm:col-span-2">
            <FileInput name="profilePhoto" label="Profile Photo" existingPath={pf.profilePhoto} accept="image/*" hint="A photo is already on record" />
          </div>
        </div>
      </StepSection>

      {/* 2. Partners */}
      <StepSection title="2 · Partners (partnership / private limited)" step="partners" shopId={shopId}>
        <div>
          <label className={labelCls}>Partner Names</label>
          <textarea name="partners" rows={4} defaultValue={existing.partners.join("\n")}
            placeholder="One partner name per line" className={inputCls} />
          <p className="text-xs text-slate-400 mt-1">Only required for partnership / private limited firms. One name per line.</p>
        </div>
      </StepSection>

      {/* 3. Products */}
      <StepSection title="3 · Products KYC (max 3)" step="products" shopId={shopId}>
        {existing.products.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
            <p className="font-medium text-slate-600 mb-1.5">Already added ({existing.products.length}/3)</p>
            <ul className="space-y-1">
              {existing.products.map((p, i) => (
                <li key={i} className="text-slate-600">• {p.name}{p.subcategory ? ` — ${p.subcategory}` : ""}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Product Category *</label>
            <select name="productCategoryId" required className={inputCls} defaultValue="">
              <option value="">Select</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Subcategory</label>
            <select name="productSubcategoryId" className={inputCls} defaultValue="">
              <option value="">None</option>
              {products.flatMap((p) => p.subcategories).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-400">Add one category at a time (max 3). Re-adding a category updates it.</p>
      </StepSection>

      {/* 4. Company */}
      <StepSection title="4 · Company KYC" step="company" shopId={shopId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>GST Registered?</label>
            <select name="hasGst" className={inputCls} defaultValue={co.hasGst ? "yes" : "no"}>
              <option value="no">No (GST Declaration)</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div><label className={labelCls}>GSTIN</label><input name="gstNumber" defaultValue={co.gstNumber} className={inputCls} /></div>
          <div><label className={labelCls}>Legal Name (auto from GST)</label><input name="legalName" defaultValue={co.legalName} className={inputCls} /></div>
          <div><label className={labelCls}>Company Name</label><input name="companyName" defaultValue={co.companyName} className={inputCls} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Company Address</label><input name="companyAddress" defaultValue={co.companyAddress} className={inputCls} /></div>
          <div><label className={labelCls}>City / Town / Village</label><input name="cityTownVillage" defaultValue={co.cityTownVillage} className={inputCls} /></div>
          <div><label className={labelCls}>Taluk</label><input name="taluk" defaultValue={co.taluk} className={inputCls} /></div>
          <div><label className={labelCls}>District</label><input name="district" defaultValue={co.district} className={inputCls} /></div>
          <div><label className={labelCls}>Pincode</label><input name="companyPincode" inputMode="numeric" defaultValue={co.companyPincode} className={inputCls} /></div>
          <div><label className={labelCls}>Number of Employees</label><input name="numberOfEmployees" inputMode="numeric" defaultValue={co.numberOfEmployees} className={inputCls} /></div>
        </div>
      </StepSection>

      {/* 5. Bank */}
      <StepSection title="5 · Bank KYC" step="bank" shopId={shopId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>Bank Name</label><input name="bankName" defaultValue={bk.bankName} className={inputCls} /></div>
          <div><label className={labelCls}>Account Holder</label><input name="accountHolder" defaultValue={bk.accountHolder} className={inputCls} /></div>
          <div><label className={labelCls}>Account Number</label><input name="accountNumber" inputMode="numeric" defaultValue={bk.accountNumber} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Account Type</label>
            <select name="accountType" className={inputCls} defaultValue={bk.accountType}>
              <option value="">Select</option>
              <option value="SAVINGS">Savings</option>
              <option value="CURRENT">Current</option>
            </select>
          </div>
          <div><label className={labelCls}>IFSC</label><input name="ifsc" defaultValue={bk.ifsc} className={inputCls} /></div>
          <div><label className={labelCls}>Branch</label><input name="branch" defaultValue={bk.branch} className={inputCls} /></div>
          <div><label className={labelCls}>UPI ID</label><input name="upiId" defaultValue={bk.upiId} className={inputCls} /></div>
          <div className="sm:col-span-2">
            <FileInput name="passbookFile" label="Passbook / Statement" existingPath={bk.passbookFile} hint="A passbook file is already on record" />
          </div>
        </div>
      </StepSection>

      {/* 6. Documents */}
      <StepSection title="6 · Document KYC" step="document" shopId={shopId}>
        {existing.documents.length > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-4">
            <p className="font-medium text-slate-600">Already added</p>
            {existing.documents.map((d, i) => (
              <div key={i}>
                <p className="text-slate-700 font-medium">
                  {d.docType.replace(/_/g, " ")}{d.docNumber ? ` — ${d.docNumber}` : ""}
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
              <option value="PAN">PAN Card</option>
              <option value="BANK_PASSBOOK">Bank Passbook</option>
              <option value="GST">GST Document</option>
              <option value="SHOP_PHOTO">Shop Photo (with name board)</option>
              <option value="PHOTO">Profile Photo</option>
            </select>
          </div>
          <div><label className={labelCls}>Document Number</label><input name="docNumber" className={inputCls} /></div>
          <div><label className={labelCls}>Front Image</label><input name="frontFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
          <div><label className={labelCls}>Back Image</label><input name="backFile" type="file" accept="image/*,application/pdf" className={inputCls} /></div>
          <div><label className={labelCls}>Latitude (shop photo)</label><input name="latitude" inputMode="decimal" placeholder="e.g. 9.9252" className={inputCls} /></div>
          <div><label className={labelCls}>Longitude (shop photo)</label><input name="longitude" inputMode="decimal" placeholder="e.g. 78.1198" className={inputCls} /></div>
        </div>
        <p className="text-xs text-slate-400">Add one document at a time. Lat/long apply to the geotagged shop photo.</p>
      </StepSection>
    </div>
  );
}
