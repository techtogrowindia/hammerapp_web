import { ok } from "@/lib/api";

// GET /api/general/common-details — shared by technician and shop apps.
// Technician app model: { deposit_amounts: { technician, shop }, razorpay: { key, secret }, contact_admin }
// Shop app reads: registration_fee_paise, registration_fee_rupees, etc.
// We return a superset that satisfies both parsers.
export async function GET() {
  const RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID ?? "";
  // Never expose the Razorpay secret — return empty string; the secret is
  // only needed server-side for signature verification.
  return ok(
    {
      deposit_amounts: {
        technician: 0,
        shop: 1000,
      },
      razorpay: {
        key: RAZORPAY_KEY,
        secret: "",
      },
      contact_admin: "support@hammerapp.in",
      // Shop-app extras
      registration_fee_paise: 100000,
      registration_fee_rupees: 1000,
      support_email: "support@hammerapp.in",
      support_phone: "",
      max_product_categories: 3,
    },
    "Common details",
  );
}
