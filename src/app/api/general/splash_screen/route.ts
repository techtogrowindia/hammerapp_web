import { shopOk } from "@/lib/api-shop";

// GET /api/general/splash_screen — splash content (stub until admin-managed).
export async function GET() {
  return shopOk({ image: null, title: "Grow with Hammer", subtitle: "More Sales. More Benefits." }, "Splash");
}
