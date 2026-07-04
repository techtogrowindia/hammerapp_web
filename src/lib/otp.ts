import { prisma } from "./prisma";

const OTP_LENGTH = Number(process.env.OTP_LENGTH ?? 6);
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);
const OTP_PROVIDER = process.env.OTP_PROVIDER ?? "console";

/** Generate a numeric OTP of the configured length. */
export function generateOtpCode(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

// ─────────────────────────────────────────────────────────────
// Pluggable delivery adapter
// ─────────────────────────────────────────────────────────────

interface OtpAdapter {
  send(mobile: string, code: string): Promise<void>;
}

const consoleAdapter: OtpAdapter = {
  async send(mobile, code) {
    // Dev only — surfaces the OTP in server logs.
    console.log(`[OTP:console] → ${mobile} : ${code}`);
  },
};

const whatsappAdapter: OtpAdapter = {
  async send(mobile, code) {
    const url = process.env.WHATSAPP_API_URL;
    const key = process.env.WHATSAPP_API_KEY;
    if (!url) {
      console.warn("[OTP:whatsapp] WHATSAPP_API_URL not set — falling back to console");
      return consoleAdapter.send(mobile, code);
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
  },
};

function getAdapter(): OtpAdapter {
  return OTP_PROVIDER === "whatsapp" ? whatsappAdapter : consoleAdapter;
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
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.otp.updateMany({
    where: { technicianId, purpose, consumed: false },
    data: { consumed: true },
  });

  await prisma.otp.create({
    data: { technicianId, mobile, code, purpose, expiresAt },
  });

  await getAdapter().send(mobile, code);
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
