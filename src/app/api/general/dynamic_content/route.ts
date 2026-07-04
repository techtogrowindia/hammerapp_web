import { shopOk } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

const base = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";

// GET /api/general/dynamic_content — remote-config style content.
// Returns otp_screen_gif URL for DynamicContentCubit in the technician app.
export async function GET() {
  const gif = await prisma.setting.findUnique({ where: { key: "app.otp_gif" } });
  const gifUrl = gif?.value
    ? `${base.replace(/\/$/, "")}/${gif.value.replace(/^\/+/, "")}`
    : null;

  return shopOk({ otp_screen_gif: gifUrl, banners: [], notices: [] }, "Dynamic content");
}
