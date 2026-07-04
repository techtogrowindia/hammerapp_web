import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { createRegistrationOrder, REGISTRATION_FEE_PAISE } from "@/lib/payment";

// POST /api/payment/razorpay-order-create
// body: { purpose, amount (rupees), user_type:'shop', user_id }
// → data: { order_id (int), razorpay_order_id, amount_paise }
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: { amount?: number; purpose?: string; user_type?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return shopFail("Invalid JSON body");
  }

  // Amount arrives in rupees from the app; fall back to the configured fee.
  const amountPaise = body.amount ? Math.round(Number(body.amount) * 100) : REGISTRATION_FEE_PAISE;

  try {
    const order = await createRegistrationOrder(amountPaise, `shop_${shop.id}_${Date.now()}`);

    const payment = await prisma.shopPayment.create({
      data: {
        shopId: shop.id,
        provider: "RAZORPAY",
        purpose: body.purpose === "onboarding" ? "REGISTRATION_FEE" : (body.purpose ?? "REGISTRATION_FEE"),
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        status: "CREATED",
      },
    });

    return shopOk(
      {
        order_id: payment.id, // int — echoed back by payment-update
        razorpay_order_id: order.orderId,
        amount_paise: order.amount,
        currency: order.currency,
        mock: order.mock,
      },
      "Order created",
    );
  } catch (err) {
    console.error("[payment/razorpay-order-create]", err);
    return shopServerError("Failed to create order");
  }
}
