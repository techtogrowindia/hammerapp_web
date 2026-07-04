"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/upload";

const TEXT_KEYS = [
  "site.title",
  "site.description",
  "whatsapp.api_url",
  "whatsapp.api_key",
  "whatsapp.sender",
  "idfy.api_key",
  "idfy.account_id",
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
    return { ok: true, message: "Settings saved successfully" };
  } catch (err) {
    console.error("[saveSettings]", err);
    return { ok: false, message: "Failed to save settings" };
  }
}
