"use client";

import { useActionState, useRef, useState } from "react";
import { Loader2, Save, Upload, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { saveSettings } from "./actions";

const UPLOAD_BASE = "/uploads";
function fileUrl(p?: string) {
  return p ? `${UPLOAD_BASE}/${p.replace(/^\/+/, "")}` : null;
}

interface Props {
  settings: Record<string, string>;
}

type TabType = "deposit" | "payment" | "gif" | "message" | "notification" | "branding" | "whatsapp" | "idfy";

export function SettingsForm({ settings }: Props) {
  const [state, action, pending] = useActionState(saveSettings, null);
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const gifRef = useRef<HTMLInputElement>(null);

  const logoUrl = fileUrl(settings["site.logo"]);
  const faviconUrl = fileUrl(settings["site.favicon"]);
  const gifUrl = fileUrl(settings["app.otp_gif"]);

  const tabs: Array<{ id: TabType; label: string }> = [
    { id: "deposit", label: "Initial Deposit" },
    { id: "payment", label: "Payment gateway" },
    { id: "gif", label: "Gif Settings" },
    { id: "message", label: "Positive message" },
    { id: "notification", label: "Notification" },
    { id: "branding", label: "Branding" },
    { id: "whatsapp", label: "WhatsApp API" },
    { id: "idfy", label: "IDfy Verification" },
  ];

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600 mt-1">Manage initial deposit and payment gateway configuration.</p>
      </div>

      {state && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm my-6 ${
            state.ok
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {state.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {state.message}
        </div>
      )}

      {/* ── Horizontal Tabs ── */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <form action={action} className="space-y-6">
        {/* ── Initial Deposit ── */}
        {activeTab === "deposit" && (
          <>
            <Field label="Technician onboarding charges" name="deposit.technician" defaultValue={settings["deposit.technician"]} placeholder="500" />
            <Field label="Shop onboarding charges" name="deposit.shop" defaultValue={settings["deposit.shop"]} placeholder="1000" />
          </>
        )}

        {/* ── Payment Gateway ── */}
        {activeTab === "payment" && (
          <>
            <Field label="Razorpay ID (Key)" name="razorpay.key_id" defaultValue={settings["razorpay.key_id"]} placeholder="rzp_live_xxxxx" />
            <Field
              label="Razorpay secret"
              name="razorpay.key_secret"
              defaultValue={settings["razorpay.key_secret"]}
              placeholder="•••••••••••••••"
              secret
              helper="Leave blank to keep existing secret unchanged."
            />
            <Field
              label="Company API bearer token"
              name="api.company_bearer_token"
              defaultValue={settings["api.company_bearer_token"]}
              placeholder="Enter new token to set; leave blank to keep current"
              helper="Used to authorize PATCH /api/technician/kyc_status. Leave blank to keep existing token."
            />
          </>
        )}

        {/* ── Gif Settings ── */}
        {activeTab === "gif" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">OTP Screen GIF</label>
              <div className="flex items-start gap-4">
                {gifUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gifUrl} alt="OTP screen gif preview" className="h-32 w-32 rounded border border-slate-200 bg-slate-50 p-1 object-contain" />
                ) : (
                  <div className="h-32 w-32 rounded border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">No GIF</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => gifRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload GIF
                  </button>
                  <input ref={gifRef} type="file" name="app.otp_gif" accept="image/gif,image/png,image/jpeg" className="hidden" />
                  <p className="text-xs text-slate-400">GIF/PNG/JPG. Max 10 MB.</p>
                  <p className="text-xs text-slate-400">Leave empty to keep existing file.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Positive Message ── */}
        {activeTab === "message" && (
          <>
            <Field
              label="Positive message"
              name="app.positive_message"
              defaultValue={settings["app.positive_message"]}
              placeholder="Keep going! Every service builds trust."
              textarea
              helper="Use #username# and #servicename# as placeholders for the app."
            />
          </>
        )}

        {/* ── Notification ── */}
        {activeTab === "notification" && (
          <>
            <Field
              label="Team member notification webhook URL"
              name="webhook.team_member"
              defaultValue={settings["webhook.team_member"]}
              placeholder="https://example.com/webhook/team-member-created"
              helper="When a technician creates a child ID (team member), a POST request is sent to this URL with JSON like: {'name':'...', 'mobile':'...'}"
              type="url"
            />
            <Field
              label="Referral notification webhook URL"
              name="webhook.referral"
              defaultValue={settings["webhook.referral"]}
              placeholder="https://example.com/webhook/referral"
              helper="When a technician, shop, or customer submits a referral, a POST is sent with JSON like: {'mobile':'...', 'referrer_name':'...'}. Referral status is pending until the mobile registers."
              type="url"
            />
            <Field
              label="Customer login/register OTP webhook URL"
              name="webhook.customer_otp"
              defaultValue={settings["webhook.customer_otp"]}
              placeholder="https://example.com/webhook/customer-otp"
              helper="When a customer requests login/register OTP, a POST is sent with JSON like: {'mobile':'...', 'otp':'1234'}."
              type="url"
            />
          </>
        )}

        {/* ── Branding ── */}
        {activeTab === "branding" && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Logo</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-12 w-auto rounded border border-slate-200 bg-slate-50 p-1 object-contain" />
                ) : (
                  <div className="h-12 w-20 rounded border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                    No logo
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
                <input ref={logoRef} type="file" name="site.logo" accept="image/*" className="hidden" />
              </div>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG. Recommended: 200×50 px.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Favicon</label>
              <div className="flex items-center gap-4">
                {faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={faviconUrl} alt="Favicon" className="h-8 w-8 rounded border border-slate-200 bg-slate-50 p-0.5 object-contain" />
                ) : (
                  <div className="h-8 w-8 rounded border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                    –
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => faviconRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </button>
                <input ref={faviconRef} type="file" name="site.favicon" accept="image/*" className="hidden" />
              </div>
              <p className="text-xs text-slate-400 mt-1">ICO or PNG, 32×32 px recommended.</p>
            </div>

            <Field label="Site title" name="site.title" defaultValue={settings["site.title"]} placeholder="Hammer Admin" />
            <Field label="Meta description" name="site.description" defaultValue={settings["site.description"]} placeholder="Hammer services marketplace admin panel" textarea />
          </>
        )}

        {/* ── WhatsApp API ── */}
        {activeTab === "whatsapp" && (
          <>
            <Field label="API URL" name="whatsapp.api_url" defaultValue={settings["whatsapp.api_url"]} placeholder="https://api.whatsapp-provider.com/send" type="url" />
            <Field label="API key / token" name="whatsapp.api_key" defaultValue={settings["whatsapp.api_key"]} placeholder="Bearer token or API key" secret />
            <Field label="Sender number" name="whatsapp.sender" defaultValue={settings["whatsapp.sender"]} placeholder="+919876543210" />
          </>
        )}

        {/* ── IDfy Verification ── */}
        {activeTab === "idfy" && (
          <>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 space-y-1 mb-6">
              <p className="font-medium">IDfy API details</p>
              <p>Endpoint: <code className="bg-amber-100 rounded px-1">https://api.idfy.com/tasks/sync/verify_with_source/aadhaar_pan_link</code></p>
              <p>Get your <strong>API Key</strong> and <strong>Account ID</strong> from the <a href="https://idfy.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">IDfy dashboard</a>. Until configured, verification runs in stub mode (mock result).</p>
            </div>
            <Field label="IDfy API key" name="idfy.api_key" defaultValue={settings["idfy.api_key"]} placeholder="••••••••••••••••" secret />
            <Field label="IDfy Account ID" name="idfy.account_id" defaultValue={settings["idfy.account_id"]} placeholder="Your IDfy account ID" />
          </>
        )}

        <div className="flex items-center gap-3 pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-6 py-2.5 transition-colors disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving…" : "Save changes"}
          </button>
          {state?.ok && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}

// ── Sub-components ──

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  secret,
  textarea,
  helper,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  secret?: boolean;
  textarea?: boolean;
  helper?: string;
}) {
  const base =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white";

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor={name}>
        {label}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={4}
          className={base}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={secret ? "password" : type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          className={base}
        />
      )}
      {helper && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
    </div>
  );
}
