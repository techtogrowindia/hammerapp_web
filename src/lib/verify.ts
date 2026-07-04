/**
 * GST + Aadhaar-PAN verification adapters — pluggable stubs.
 *
 * The shop app calls company_kyc with { gst_available, gstin } and expects
 * `data.gst_details.legal_name` back. It also checks aadhar_pan_linkage.
 * Until a real provider (IDFY/Signzy/etc.) is wired via env, these return
 * mock-verified responses so onboarding works end-to-end.
 */

const GST_PROVIDER = process.env.GST_VERIFY_PROVIDER; // e.g. "idfy"
const GST_API_URL = process.env.GST_VERIFY_URL;
const GST_API_KEY = process.env.GST_VERIFY_KEY;

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

export async function verifyGstin(gstinRaw: string): Promise<GstDetails> {
  const gstin = gstinRaw.toUpperCase().trim();
  if (!isValidGstin(gstin)) {
    return { legal_name: "", gstin, verified: false, mock: !isGstLive() };
  }

  if (!isGstLive()) {
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

  const res = await fetch(GST_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(GST_API_KEY ? { Authorization: `Bearer ${GST_API_KEY}` } : {}),
    },
    body: JSON.stringify({ gstin, provider: GST_PROVIDER }),
  });
  if (!res.ok) throw new Error(`GST verify failed: ${res.status}`);
  const data = (await res.json()) as {
    legal_name?: string;
    trade_name?: string;
    status?: string;
    address?: string;
  };
  return {
    legal_name: data.legal_name ?? "",
    trade_name: data.trade_name,
    gstin,
    status: data.status,
    address: data.address,
    verified: Boolean(data.legal_name),
    mock: false,
  };
}

export function isGstLive(): boolean {
  return Boolean(GST_API_URL);
}

/**
 * Aadhaar–PAN linkage check. Stub returns linked=true. A real provider
 * would take the aadhaar + pan and return the linkage status.
 */
export async function checkAadharPanLinkage(
  aadhar: string,
  pan: string,
): Promise<{ linked: boolean; mock: boolean }> {
  const provider = process.env.AADHAR_PAN_VERIFY_URL;
  if (!provider) {
    return { linked: Boolean(aadhar && pan), mock: true };
  }
  const res = await fetch(provider, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AADHAR_PAN_VERIFY_KEY
        ? { Authorization: `Bearer ${process.env.AADHAR_PAN_VERIFY_KEY}` }
        : {}),
    },
    body: JSON.stringify({ aadhar, pan }),
  });
  if (!res.ok) throw new Error(`Aadhaar-PAN linkage failed: ${res.status}`);
  const data = (await res.json()) as { linked?: boolean };
  return { linked: Boolean(data.linked), mock: false };
}
