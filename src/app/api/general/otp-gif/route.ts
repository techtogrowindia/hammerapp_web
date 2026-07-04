import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const base = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads";

// GET /api/general/otp-gif
// Redirects to the currently configured OTP screen GIF.
// The app points at this stable URL; uploading a new GIF in admin Settings
// changes the target without requiring an app update.
export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: "app.otp_gif" } });
  if (!setting?.value) {
    return NextResponse.json({ error: "No GIF configured" }, { status: 404 });
  }
  const url = `${base.replace(/\/$/, "")}/${setting.value.replace(/^\/+/, "")}`;
  return NextResponse.redirect(url, 302);
}
