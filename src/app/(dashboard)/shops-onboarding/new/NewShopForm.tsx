"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Store, Upload, Loader2, CheckCircle2, Download } from "lucide-react";
import { registerShop, importCsv, type RegisterResult, type ImportResult } from "./actions";

type Tab = "single" | "bulk";

function SubmitBtn({ icon, label, busyLabel }: { icon: React.ReactNode; label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-medium px-4 py-2.5 text-sm transition-colors"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {pending ? busyLabel : label}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export function NewShopForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("single");

  const [regResult, regAction] = useActionState<RegisterResult | undefined, FormData>(registerShop, undefined);
  const [importResult, importAction] = useActionState<ImportResult | undefined, FormData>(importCsv, undefined);

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("single")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "single" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          Single Shop
        </button>
        <button
          onClick={() => setTab("bulk")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "bulk" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
        >
          Bulk CSV Import
        </button>
      </div>

      {tab === "single" && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-6">
          {regResult?.ok ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-slate-800">{regResult.message}</p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => router.push(`/shops-onboarding/${regResult.shopId}/kyc`)}
                  className="rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2"
                >
                  Enter KYC Data →
                </button>
                <button
                  onClick={() => router.refresh()}
                  className="rounded-lg border border-slate-300 text-slate-600 text-sm font-medium px-4 py-2"
                >
                  Add Another
                </button>
              </div>
            </div>
          ) : (
            <form action={regAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Owner / Shop Name *</label>
                <input name="name" required placeholder="Name as per Aadhaar" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile *</label>
                  <input name="mobile" required inputMode="numeric" placeholder="9876543210" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Firm Type</label>
                  <select name="firmType" defaultValue="" className={inputCls}>
                    <option value="">Select</option>
                    <option value="PROPRIETORSHIP">Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="PRIVATE_LIMITED">Private Limited</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input name="email" type="email" placeholder="shop@example.com (optional)" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input name="password" type="text" placeholder="Leave blank to auto-generate" className={inputCls} />
                <p className="text-xs text-slate-400 mt-1">
                  The shop owner can reset this from the app via &ldquo;Forgot Password&rdquo;.
                </p>
              </div>
              {regResult && !regResult.ok && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{regResult.message}</p>
              )}
              <SubmitBtn icon={<Store className="h-4 w-4" />} label="Register Shop" busyLabel="Registering..." />
            </form>
          )}
        </div>
      )}

      {tab === "bulk" && (
        <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">CSV format</p>
            <code className="text-xs block bg-white border border-slate-200 rounded px-2 py-1.5 font-mono">
              name,mobile,email,firm_type
            </code>
            <a
              href="data:text/csv;charset=utf-8,name%2Cmobile%2Cemail%2Cfirm_type%0ASri%20Traders%2C9876543210%2Cshop%40example.com%2Cproprietorship"
              download="shops_template.csv"
              className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline text-xs mt-2"
            >
              <Download className="h-3.5 w-3.5" />
              Download template
            </a>
          </div>

          <form action={importAction} className="space-y-4">
            <input
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:text-white file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-[var(--accent-hover)]"
            />
            <SubmitBtn icon={<Upload className="h-4 w-4" />} label="Import CSV" busyLabel="Importing..." />
          </form>

          {importResult && (
            <div className={`rounded-lg px-4 py-3 text-sm ${importResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              <p className="font-medium">{importResult.message}</p>
              {importResult.errors && importResult.errors.length > 0 && (
                <ul className="mt-2 text-xs text-slate-600 list-disc list-inside space-y-0.5">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
