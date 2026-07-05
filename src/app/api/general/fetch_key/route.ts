import { shopOk } from "@/lib/api-shop";
import { getPublishableKeyId } from "@/lib/payment";

// GET /api/general/fetch_key — publishable keys for the mobile SDK.
// Key resolves from admin-panel settings first, env var fallback; empty in stub mode.
export async function GET() {
  return shopOk(
    { razorpay_key: await getPublishableKeyId() },
    "Keys",
  );
}
