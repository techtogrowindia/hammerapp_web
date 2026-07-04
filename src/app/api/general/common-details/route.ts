import { shopOk } from "@/lib/api-shop";
import { REGISTRATION_FEE_PAISE } from "@/lib/payment";

// GET /api/general/common-details — app-wide config surfaced to the shop app.
export async function GET() {
  return shopOk(
    {
      registration_fee_paise: REGISTRATION_FEE_PAISE,
      registration_fee_rupees: Math.round(REGISTRATION_FEE_PAISE / 100),
      support_email: "support@hammerapp.in",
      support_phone: "",
      max_product_categories: 3,
    },
    "Common details",
  );
}
