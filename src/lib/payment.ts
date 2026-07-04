import crypto from "node:crypto";

/**
 * Razorpay adapter — pluggable stub.
 *
 * When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set it talks to the real
 * Razorpay Orders API and verifies signatures. Until then it returns a
 * mock order so the shop onboarding flow works end-to-end without keys.
 * Mirrors the WhatsApp OTP adapter pattern (see otp.ts).
 */

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

/** One-time shop registration fee, in paise. ₹1000 default. */
export const REGISTRATION_FEE_PAISE = Number(
  process.env.SHOP_REGISTRATION_FEE_PAISE ?? 100000,
);

export interface RazorpayOrder {
  orderId: string;
  amount: number; // paise
  currency: string;
  keyId: string; // publishable key for the mobile SDK ("" in stub mode)
  mock: boolean;
}

export function isPaymentLive(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

export async function createRegistrationOrder(
  amount: number = REGISTRATION_FEE_PAISE,
  receipt?: string,
): Promise<RazorpayOrder> {
  const currency = "INR";

  if (!isPaymentLive()) {
    // Stub: deterministic-ish mock order id.
    return {
      orderId: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
      amount,
      currency,
      keyId: "",
      mock: true,
    };
  }

  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt: receipt ?? `shop_reg_${Date.now()}`,
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order create failed: ${res.status}`);
  }
  const data = (await res.json()) as { id: string; amount: number; currency: string };
  return {
    orderId: data.id,
    amount: data.amount,
    currency: data.currency,
    keyId: KEY_ID!,
    mock: false,
  };
}

/**
 * Verifies a Razorpay payment signature. In stub mode (no secret) any
 * non-empty paymentId is accepted so the flow can complete in dev.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature?: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  if (!paymentId) return false;
  if (!isPaymentLive()) return true; // stub accepts

  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
