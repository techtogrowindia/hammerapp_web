import type { NextRequest } from "next/server";
import { shopOk, shopFail, shopServerError } from "@/lib/api-shop";
import { checkAadharPanLinkage } from "@/lib/verify";

// POST /api/general/aadhar_pan_linkage — body: { aadhar, pan } → { linked }
export async function POST(req: NextRequest) {
  let body: { aadhar?: string; aadhar_number?: string; pan?: string; pan_number?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return shopFail("Invalid JSON body");
  }

  const aadhar = (body.aadhar ?? body.aadhar_number ?? "").replace(/\s/g, "");
  const pan = (body.pan ?? body.pan_number ?? "").toUpperCase().trim();
  if (!aadhar || !pan) return shopFail("aadhar and pan are required");

  try {
    const result = await checkAadharPanLinkage(aadhar, pan);
    return shopOk(
      { linked: result.linked, aadhar_pan_linkage: result.linked, mock: result.mock },
      result.linked ? "Aadhaar and PAN are linked" : "Aadhaar and PAN are not linked",
    );
  } catch (err) {
    console.error("[general/aadhar_pan_linkage]", err);
    return shopServerError();
  }
}
