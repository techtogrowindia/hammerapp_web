import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { checkPreAuth } from "@/lib/auth-mobile";
import { shopOk, shopCreated, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { generateShopCode } from "@/lib/id";
import { issueShopOtp } from "@/lib/otp-shop";
import { signShopToken } from "@/lib/jwt";
import { createShopSchema, formatZodError } from "@/lib/validation";
import { checkRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { shopUser } from "@/lib/shop-serialize";

// POST /api/shop/create — Register a shop (pre-auth static token). Returns session token + OTP sent.
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, AUTH_RATE_LIMIT);
  if (limited) return limited;
  if (!checkPreAuth(req)) return shopUnauthorized("Invalid pre-auth token");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return shopFail("Invalid JSON body");
  }

  const parsed = createShopSchema.safeParse(body);
  if (!parsed.success) return shopFail(formatZodError(parsed.error));
  const { name, mobile, email, password } = parsed.data;

  try {
    const existing = await prisma.shop.findUnique({ where: { mobile } });
    if (existing) {
      if (existing.status === "ACTIVE" || existing.mobileVerified) {
        return shopFail("Mobile number already registered. Please login.", 409);
      }
      // Not yet verified → update password, re-issue OTP, return token to continue.
      const hash = await bcrypt.hash(password, 10);
      const updated = await prisma.shop.update({
        where: { id: existing.id },
        data: { name: name ?? existing.name, email: email || existing.email, password: hash },
      });
      await issueShopOtp(updated.id, mobile, "REGISTER");
      const token = signShopToken({ sub: updated.id, code: updated.code, mobile: updated.mobile });
      return shopOk({ ...shopUser(updated), otp_sent: true }, "OTP sent. Please verify to continue.", { token });
    }

    const hash = await bcrypt.hash(password, 10);
    const shop = await prisma.$transaction(async (tx) => {
      const code = await generateShopCode();
      return tx.shop.create({
        data: {
          code,
          name: name ?? null,
          mobile,
          email: email || null,
          password: hash,
          status: "INACTIVE",
          kycStatus: "NOT_STARTED",
        },
      });
    });

    await issueShopOtp(shop.id, mobile, "REGISTER");
    const token = signShopToken({ sub: shop.id, code: shop.code, mobile: shop.mobile });

    return shopCreated({ ...shopUser(shop), otp_sent: true }, "Registration successful. OTP sent.", token);
  } catch (err) {
    console.error("[shop/create]", err);
    return shopServerError();
  }
}
