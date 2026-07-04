import { shopOk } from "@/lib/api-shop";

// GET /api/general/dynamic_content — remote-config style content (stub).
export async function GET() {
  return shopOk({ banners: [], notices: [] }, "Dynamic content");
}
