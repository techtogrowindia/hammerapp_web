"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

export interface AadharPanResult {
  ok: boolean;
  linked?: boolean;
  mock?: boolean;
  message?: string;
}

interface Props {
  linked: boolean | null;
  checkedAt: string | null;
  action: () => Promise<AadharPanResult>;
}

export function AadharPanCheck({ linked, checkedAt, action }: Props) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const statusText =
    linked == null ? "Not checked" : linked ? "Linked" : "Not linked";
  const statusCls =
    linked == null ? "text-slate-400" : linked ? "text-green-600 font-medium" : "text-red-600 font-medium";

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-slate-500">Aadhaar–PAN linkage</span>
        <span className={statusCls}>{statusText}</span>
      </div>
      {checkedAt && <p className="text-[11px] text-slate-400 text-right">Last checked: {checkedAt}</p>}
      <button
        onClick={() => {
          setErr(null);
          start(async () => {
            const r = await action();
            if (!r.ok) setErr(r.message ?? "Check failed");
            else router.refresh();
          });
        }}
        disabled={pending}
        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-amber-50 text-xs font-medium px-3 py-1.5 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        {pending ? "Checking..." : "Check Aadhaar–PAN link"}
      </button>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  );
}
