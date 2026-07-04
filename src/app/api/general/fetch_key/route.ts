import { shopOk } from "@/lib/api-shop";

// GET /api/general/fetch_key — publishable keys for the mobile SDK.
// razorpay_key is empty in stub mode (see lib/payment.ts).
export async function GET() {
  return shopOk(
    { razorpay_key: process.env.RAZORPAY_KEY_ID ?? "" },
    "Keys",
  );
}
