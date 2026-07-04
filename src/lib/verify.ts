/**
 * GST + Aadhaar-PAN verification adapters — pluggable stubs.
 *
 * Credentials are read first from the DB Settings table (set via the admin
 * Settings page), then from environment variables as a fallback.
 * Until credentials are configured, these return mock responses so onboarding
 * works end-to-end in development.
 *
 * IDfy API format:
 *   POST https://api.idfy.com/tasks/sync/verify_with_source/<endpoint>
 *   Headers: api-key, account-id, Content-Type: application/json
 *   Body: { task_id, group_id, data: { ... } }
 */

import { getSettings } from "./settings";
import { randomUUID } from "crypto";

export interface GstDetails {
  legal_name: string;
  trade_name?: string;
  gstin: string;
  status?: string;
  address?: string;
  verified: boolean;
  mock: boolean;
}

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_RE.test(gstin.toUpperCase());
}

/** Load IDfy credentials: DB settings take priority over env vars. */
async function getIdfyCredentials(): Promise<{ apiKey: string; accountId: string } | null> {
  const s = await getSettings(["idfy.api_key", "idfy.account_id"]);
  const apiKey = s["idfy.api_key"] || process.env.IDFY_API_KEY || "";
  const accountId = s["idfy.account_id"] || process.env.IDFY_ACCOUNT_ID || "";
  if (!apiKey || !accountId) return null;
  return { apiKey, accountId };
}

export async function verifyGstin(gstinRaw: string): Promise<GstDetails> {
  const gstin = gstinRaw.toUpperCase().trim();
  if (!isValidGstin(gstin)) {
    return { legal_name: "", gstin, verified: false, mock: false };
  }

  const creds = await getIdfyCredentials();
  if (!creds) {
    // Stub: derive a plausible legal name from the PAN embedded in the GSTIN.
    return {
      legal_name: `Shop ${gstin.slice(2, 7)} Enterprises`,
      trade_name: `Shop ${gstin.slice(2, 7)}`,
      gstin,
      status: "Active",
      verified: true,
      mock: true,
    };
  }

  const res = await fetch(
    "https://api.idfy.com/tasks/sync/verify_with_source/gstin",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": creds.apiKey,
        "account-id": creds.accountId,
      },
      body: JSON.stringify({
        task_id: randomUUID(),
        group_id: randomUUID(),
        data: { id_number: gstin },
      }),
    },
  );

  if (!res.ok) throw new Error(`IDfy GST verify failed: ${res.status}`);

  const data = (await res.json()) as {
    result?: {
      source_output?: {
        legal_name_of_business?: string;
        trade_name?: string;
        gstin_status?: string;
        address?: string;
      };
    };
  };

  const out = data.result?.source_output ?? {};
  return {
    legal_name: out.legal_name_of_business ?? "",
    trade_name: out.trade_name,
    gstin,
    status: out.gstin_status,
    address: out.address,
    verified: Boolean(out.legal_name_of_business),
    mock: false,
  };
}

export function isGstLive(): boolean {
  return Boolean(process.env.IDFY_API_KEY || process.env.GST_VERIFY_URL);
}

/**
 * Aadhaar–PAN linkage check via IDfy.
 * Stub returns linked=true when both numbers present.
 * Provide IDfy credentials in admin Settings to go live — no deploy needed.
 */
export async function checkAadharPanLinkage(
  aadhar: string,
  pan: string,
): Promise<{ linked: boolean; mock: boolean }> {
  const creds = await getIdfyCredentials();
  if (!creds) {
    return { linked: Boolean(aadhar && pan), mock: true };
  }

  const res = await fetch(
    "https://api.idfy.com/tasks/sync/verify_with_source/aadhaar_pan_link",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": creds.apiKey,
        "account-id": creds.accountId,
      },
      body: JSON.stringify({
        task_id: randomUUID(),
        group_id: randomUUID(),
        data: {
          aadhaar_number: aadhar,
          pan_number: pan,
        },
      }),
    },
  );

  if (!res.ok) throw new Error(`IDfy Aadhaar-PAN check failed: ${res.status}`);

  const data = (await res.json()) as {
    result?: {
      source_output?: {
        source_output?: string; // "Y" = linked
      };
    };
  };

  const sourceOut = data.result?.source_output?.source_output ?? "";
  const linked = sourceOut.toUpperCase() === "Y";
  return { linked, mock: false };
}
