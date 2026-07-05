import { prisma } from "./prisma";
import { getSettings } from "./settings";

const OTP_LENGTH = Number(process.env.OTP_LENGTH ?? 6);
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);

/** Generate a numeric OTP of the configured length. */
export function generateOtpCode(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// ─────────────────────────────────────────────────────────────
// WhatsApp delivery — admin-panel Settings (WhatsApp API tab) take
// precedence, env vars are the fallback. Auto-activates whenever a URL
// resolves; otherwise OTPs are logged to the console (dev/stub mode).
// ─────────────────────────────────────────────────────────────

interface WhatsAppConfig {
  url?: string;
  key?: string;
}

async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const s = await getSettings(["whatsapp.api_url", "whatsapp.api_key"]);
  return {
    url: s["whatsapp.api_url"]?.trim() || process.env.WHATSAPP_API_URL,
    key: s["whatsapp.api_key"]?.trim() || process.env.WHATSAPP_API_KEY,
  };
}

// TEMPORARY: until WhatsApp API is connected, everyone logs in with this
// fixed PIN instead of a random one so testers don't need server log access.
// Remove STUB_OTP_CODE once WhatsApp is live — resolveOtpCode() already
// switches to real random OTPs automatically the moment a URL is configured.
const STUB_OTP_CODE = "1234";

/** Picks a real random OTP once WhatsApp is configured, else the fixed stub PIN. */
export async function resolveOtpCode(): Promise<string> {
  const { url } = await getWhatsAppConfig();
  return url ? generateOtpCode() : STUB_OTP_CODE;
}

/** Sends an OTP via WhatsApp when configured; falls back to console logging. */
export async function sendOtpMessage(mobile: string, code: string): Promise<void> {
  const { url, key } = await getWhatsAppConfig();
  if (!url) {
    // Dev/stub mode — surfaces the OTP in server logs.
    console.log(`[OTP:console] → ${mobile} : ${code}`);
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ mobile, message: `Your Hammer OTP is ${code}` }),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp OTP send failed: ${res.status}`);
  }
}

// ─────────────────────────────────────────────────────────────
// Issue + verify
// ─────────────────────────────────────────────────────────────

/**
 * Creates and delivers a fresh OTP for a technician. Invalidates any
 * previous unconsumed OTPs for the same purpose.
 */
export async function issueOtp(
  technicianId: string,
  mobile: string,
  purpose = "LOGIN",
): Promise<{ code: string; expiresAt: Date }> {
  const code = await resolveOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.otp.updateMany({
    where: { technicianId, purpose, consumed: false },
    data: { consumed: true },
  });

  await prisma.otp.create({
    data: { technicianId, mobile, code, purpose, expiresAt },
  });

  await sendOtpMessage(mobile, code);
  return { code, expiresAt };
}

/**
 * Verifies an OTP. Returns true on success and marks it consumed.
 */
export async function verifyOtp(
  technicianId: string,
  code: string,
  purpose = "LOGIN",
): Promise<boolean> {
  const otp = await prisma.otp.findFirst({
    where: { technicianId, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;
  if (otp.expiresAt < new Date()) return false;
  if (otp.code !== code) {
    await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otp.update({
    where: { id: otp.id },
    data: { consumed: true },
  });
  return true;
}
