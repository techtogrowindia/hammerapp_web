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
function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface PaymentVerifyResult {
  ok: boolean;
  reason?: string;
}

/**
 * Verifies a Razorpay payment. The mobile app does NOT send `razorpay_signature`,
 * so we can't rely on HMAC alone. Strategy:
 *   1. Stub mode (no keys)  → accept any non-empty paymentId (dev/testing).
 *   2. Signature present    → verify HMAC (fast, no network round-trip).
 *   3. Otherwise (app case) → fetch the payment from Razorpay's API and confirm
 *      it is captured/authorized, belongs to the expected order, and — when
 *      known — matches the expected amount.
 */
export async function verifyPayment(params: {
  orderId: string; // razorpay_order_id
  paymentId: string; // razorpay_payment_id
  signature?: string;
  expectedAmount?: number; // paise
}): Promise<PaymentVerifyResult> {
  const { orderId, paymentId, signature, expectedAmount } = params;

  if (!paymentId) return { ok: false, reason: "missing payment id" };
  if (!isPaymentLive()) return { ok: true }; // stub accepts

  // Fast path: honour a signature if the client ever provides one.
  if (signature) {
    return verifySignature(orderId, paymentId, signature)
      ? { ok: true }
      : { ok: false, reason: "signature mismatch" };
  }

  // App path: verify by fetching the payment from Razorpay directly.
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
  } catch (err) {
    console.error("[payment] Razorpay fetch failed", err);
    return { ok: false, reason: "razorpay unreachable" };
  }
  if (!res.ok) return { ok: false, reason: `razorpay status ${res.status}` };

  const p = (await res.json()) as {
    status?: string;
    order_id?: string;
    amount?: number;
  };

  if (p.status !== "captured" && p.status !== "authorized") {
    return { ok: false, reason: `payment status ${p.status}` };
  }
  if (orderId && p.order_id && p.order_id !== orderId) {
    return { ok: false, reason: "order mismatch" };
  }
  if (expectedAmount != null && p.amount != null && p.amount !== expectedAmount) {
    return { ok: false, reason: "amount mismatch" };
  }
  return { ok: true };
}
