"use client";

import { useActionState, useRef } from "react";
import { Loader2, Save, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { saveSettings } from "./actions";

const UPLOAD_BASE = "/uploads";
function fileUrl(p?: string) {
  return p ? `${UPLOAD_BASE}/${p.replace(/^\/+/, "")}` : null;
}

interface Props {
  settings: Record<string, string>;
}

export function SettingsForm({ settings }: Props) {
  const [state, action, pending] = useActionState(saveSettings, null);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const logoUrl = fileUrl(settings["site.logo"]);
  const faviconUrl = fileUrl(settings["site.favicon"]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure site branding and third-party API credentials.
        </p>
      </div>

      {state && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
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

      <form action={action} className="space-y-8">
        {/* ── Site Branding ── */}
        <Section title="Site Branding" description="Logo, favicon and metadata shown in the admin panel.">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Logo
            </label>
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
                <Upload className="h-3.5 w-3.5" /> Upload logo
              </button>
              <input ref={logoRef} type="file" name="site.logo" accept="image/*" className="hidden" />
            </div>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG. Recommended: 200×50 px.</p>
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Favicon
            </label>
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
                <Upload className="h-3.5 w-3.5" /> Upload favicon
              </button>
              <input ref={faviconRef} type="file" name="site.favicon" accept="image/*" className="hidden" />
            </div>
            <p className="text-xs text-slate-400 mt-1">ICO or PNG, 32×32 px recommended.</p>
          </div>

          <Field label="Site title" name="site.title" defaultValue={settings["site.title"]} placeholder="Hammer Admin" />
          <Field
            label="Meta description"
            name="site.description"
            defaultValue={settings["site.description"]}
            placeholder="Hammer services marketplace admin panel"
            textarea
          />
        </Section>

        {/* ── WhatsApp API ── */}
        <Section title="WhatsApp API" description="OTP and notification delivery via your WhatsApp API provider.">
          <Field label="API URL" name="whatsapp.api_url" defaultValue={settings["whatsapp.api_url"]} placeholder="https://api.whatsapp-provider.com/send" type="url" />
          <Field label="API key / token" name="whatsapp.api_key" defaultValue={settings["whatsapp.api_key"]} placeholder="Bearer token or API key" secret />
          <Field label="Sender number" name="whatsapp.sender" defaultValue={settings["whatsapp.sender"]} placeholder="+919876543210" />
        </Section>

        {/* ── IDfy Verification ── */}
        <Section
          title="IDfy Verification"
          description={
            <>
              Aadhaar–PAN linkage and GST verification via{" "}
              <a href="https://idfy.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline-offset-2 hover:underline">
                IDfy
              </a>
              . Get your credentials from the IDfy dashboard. Until configured, verification runs in stub mode (mock result).
            </>
          }
        >
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-medium">IDfy API details</p>
            <p>IDfy endpoint: <code className="bg-amber-100 rounded px-1">https://api.idfy.com/tasks/sync/verify_with_source/aadhaar_pan_link</code></p>
            <p>Obtain your <strong>API Key</strong> and <strong>Account ID</strong> from the IDfy developer console.</p>
          </div>
          <Field label="IDfy API key" name="idfy.api_key" defaultValue={settings["idfy.api_key"]} placeholder="••••••••••••••••" secret />
          <Field label="IDfy Account ID" name="idfy.account_id" defaultValue={settings["idfy.account_id"]} placeholder="Your IDfy account ID" />
        </Section>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-5 py-2.5 transition-colors disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving…" : "Save settings"}
          </button>
          {state?.ok && (
            <span className="text-sm text-green-600">Saved ✓</span>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Sub-components ──

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] bg-slate-50">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  secret,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  secret?: boolean;
  textarea?: boolean;
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
          rows={3}
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
    </div>
  );
}
