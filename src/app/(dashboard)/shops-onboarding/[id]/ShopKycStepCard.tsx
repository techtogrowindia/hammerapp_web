"use client";

import { useState, useTransition } from "react";
import { Check, X, HelpCircle, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { reviewShopKycStep, type ShopKycStep } from "./actions";

interface Field {
  label: string;
  value: React.ReactNode;
}

export function ShopKycStepCard({
  shopId,
  step,
  title,
  status,
  fields,
  remark,
}: {
  shopId: number;
  step: ShopKycStep;
  title: string;
  status: string;
  fields: Field[];
  remark?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const hasData = status !== "NOT_STARTED";

  function act(
    newStatus: "VERIFIED" | "REJECTED" | "NEED_CLARIFICATION",
    remarkText?: string,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await reviewShopKycStep({ shopId, step, status: newStatus, remark: remarkText });
      if (!res.ok) setError(res.message);
      else setShowReject(false);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-slate-50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <StatusBadge status={status} />
      </div>

      <div className="p-5 space-y-4">
        {!hasData ? (
          <p className="text-sm text-slate-400 italic">Not submitted yet.</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {fields.map((f, i) => (
              <div key={i}>
                <dt className="text-xs text-slate-500">{f.label}</dt>
                <dd className="text-sm text-slate-800 mt-0.5 break-words">
                  {f.value || <span className="text-slate-400">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {remark && (
          <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <span className="font-medium">Remark:</span> {remark}
          </p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {hasData && (
          <>
            {showReject ? (
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for rejection / clarification..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <div className="flex gap-2">
                  <button
                    disabled={pending}
                    onClick={() => act("REJECTED", reason)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60"
                  >
                    {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Confirm Reject
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => act("NEED_CLARIFICATION", reason)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Request Clarification
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setError(null); }}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  disabled={pending}
                  onClick={() => act("VERIFIED")}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Approve
                </button>
                <button
                  disabled={pending}
                  onClick={() => setShowReject(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-xs font-medium px-3 py-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject / Clarify
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
