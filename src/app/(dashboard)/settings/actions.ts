"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload, UploadError } from "@/lib/upload";

const GIF_MAX_BYTES = 15 * 1024 * 1024; // 15 MB — animated GIFs run larger than static images

const TEXT_KEYS = [
  "site.title",
  "site.description",
  "whatsapp.api_url",
  "whatsapp.api_key",
  "whatsapp.sender",
  "idfy.api_key",
  "idfy.account_id",
  "deposit.technician",
  "deposit.shop",
  "razorpay.key_id",
  "razorpay.key_secret",
  "api.company_bearer_token",
  "app.positive_message",
  "webhook.team_member",
  "webhook.referral",
  "webhook.customer_otp",
] as const;

export async function saveSettings(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "Unauthorized" };

  try {
    const upserts: Array<{ key: string; value: string }> = [];

    // Text fields
    for (const key of TEXT_KEYS) {
      const val = formData.get(key);
      if (val !== null) upserts.push({ key, value: String(val).trim() });
    }

    // Logo file upload
    const logoFile = formData.get("site.logo") as File | null;
    if (logoFile && logoFile.size > 0) {
      const stored = await saveUpload(logoFile, "settings", "global");
      upserts.push({ key: "site.logo", value: stored.path });
    }

    // Favicon file upload
    const faviconFile = formData.get("site.favicon") as File | null;
    if (faviconFile && faviconFile.size > 0) {
      const stored = await saveUpload(faviconFile, "settings", "global");
      upserts.push({ key: "site.favicon", value: stored.path });
    }

    // OTP GIF upload — allow a larger cap since animated GIFs run bigger than static images.
    const gifFile = formData.get("app.otp_gif") as File | null;
    if (gifFile && gifFile.size > 0) {
      const stored = await saveUpload(gifFile, "settings", "global", GIF_MAX_BYTES);
      upserts.push({ key: "app.otp_gif", value: stored.path });
    }

    await prisma.$transaction(
      upserts.map(({ key, value }) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );

    revalidatePath("/settings");
    revalidatePath("/", "layout"); // refresh title, favicon, sidebar logo
    return { ok: true, message: "Settings saved successfully" };
  } catch (err) {
    console.error("[saveSettings]", err);
    const message = err instanceof UploadError ? err.message : "Failed to save settings";
    return { ok: false, message };
  }
}
