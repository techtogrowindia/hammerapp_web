import { prisma } from "./prisma";
import { resolveOtpCode, sendOtpMessage } from "./otp";

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS ?? 300);

/** Issues a fresh OTP for a shop, invalidating prior unconsumed ones. */
export async function issueShopOtp(
  shopId: number,
  mobile: string,
  purpose = "LOGIN",
): Promise<{ code: string; expiresAt: Date }> {
  const code = await resolveOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.shopOtp.updateMany({
    where: { shopId, purpose, consumed: false },
    data: { consumed: true },
  });
  await prisma.shopOtp.create({
    data: { shopId, mobile, code, purpose, expiresAt },
  });

  await sendOtpMessage(mobile, code);
  return { code, expiresAt };
}

/** Validates a shop OTP WITHOUT consuming it (used by the reset "verify" step). */
export async function peekShopOtp(
  shopId: number,
  code: string,
  purpose = "FORGOT_PASSWORD",
): Promise<boolean> {
  const otp = await prisma.shopOtp.findFirst({
    where: { shopId, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  if (otp.expiresAt < new Date()) return false;
  return otp.code === code;
}

/** Verifies a shop OTP; marks it consumed on success. */
export async function verifyShopOtp(
  shopId: number,
  code: string,
  purpose = "LOGIN",
): Promise<boolean> {
  const otp = await prisma.shopOtp.findFirst({
    where: { shopId, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  if (otp.expiresAt < new Date()) return false;
  if (otp.code !== code) {
    await prisma.shopOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }
  await prisma.shopOtp.update({ where: { id: otp.id }, data: { consumed: true } });
  return true;
}
