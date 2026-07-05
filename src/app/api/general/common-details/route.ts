import { ok } from "@/lib/api";
import { getPublishableKeyId } from "@/lib/payment";
import { getSettings } from "@/lib/settings";

// GET /api/general/common-details — shared by technician and shop apps.
// Technician app model: { deposit_amounts: { technician, shop }, razorpay: { key, secret }, contact_admin }
// Shop app reads: registration_fee_paise, registration_fee_rupees, etc.
// We return a superset that satisfies both parsers.
export async function GET() {
  const RAZORPAY_KEY = await getPublishableKeyId();
  const s = await getSettings(["deposit.technician", "deposit.shop"]);

  // Deposit / onboarding charges come from admin-panel "Initial Deposit" tab
  // (in rupees). Fall back to the historical defaults if unset.
  const technicianFee = Number(s["deposit.technician"]) || 0;
  const shopFee = Number(s["deposit.shop"]) || 1000;

  // Never expose the Razorpay secret — return empty string; the secret is
  // only needed server-side for signature verification.
  return ok(
    {
      deposit_amounts: {
        technician: technicianFee,
        shop: shopFee,
      },
      razorpay: {
        key: RAZORPAY_KEY,
        secret: "",
      },
      contact_admin: "support@hammerapp.in",
      // Shop-app extras
      registration_fee_paise: shopFee * 100,
      registration_fee_rupees: shopFee,
      support_email: "support@hammerapp.in",
      support_phone: "",
      max_product_categories: 3,
    },
    "Common details",
  );
}
