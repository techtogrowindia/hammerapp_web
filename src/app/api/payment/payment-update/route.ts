import type { NextRequest } from "next/server";
import { getAuthShop } from "@/lib/auth-mobile";
import { shopOk, shopFail, shopUnauthorized, shopNotFound, shopServerError } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/payment";

// POST /api/payment/payment-update
// body: { order_id (int), razorpay_order_id, razorpay_payment_id, razorpay_signature? }
export async function POST(req: NextRequest) {
  const shop = await getAuthShop(req);
  if (!shop) return shopUnauthorized();

  let body: {
    order_id?: number;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return shopFail("Invalid JSON body");
  }

  const orderId = Number(body.order_id);
  if (!Number.isInteger(orderId)) return shopFail("order_id required");

  try {
    const payment = await prisma.shopPayment.findUnique({ where: { id: orderId } });
    if (!payment || payment.shopId !== shop.id) return shopNotFound("Order not found");

    const valid = verifyPaymentSignature({
      orderId: body.razorpay_order_id ?? payment.orderId ?? "",
      paymentId: body.razorpay_payment_id ?? "",
      signature: body.razorpay_signature,
    });

    if (!valid) {
      await prisma.shopPayment.update({ where: { id: orderId }, data: { status: "FAILED" } });
      return shopFail("Payment verification failed", 400);
    }

    await prisma.$transaction([
      prisma.shopPayment.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paymentId: body.razorpay_payment_id ?? null,
          paidAt: new Date(),
        },
      }),
      prisma.shop.update({
        where: { id: shop.id },
        data: { registrationPaid: true, status: shop.status === "INACTIVE" ? "ACTIVE" : shop.status },
      }),
    ]);

    return shopOk({ order_id: orderId, status: "PAID" }, "Payment recorded");
  } catch (err) {
    console.error("[payment/payment-update]", err);
    return shopServerError();
  }
}
