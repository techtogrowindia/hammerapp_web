import { shopOk } from "@/lib/api-shop";
import { prisma } from "@/lib/prisma";

const FALLBACKS = [
  "Welcome to Hammer — grow your business with us!",
  "More sales, more benefits. Keep going!",
  "Your shop is one step closer to more orders.",
];

// GET /api/general/positive_message — a motivational message for the app.
// Reads from admin Settings (app.positive_message); falls back to hardcoded list.
export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: "app.positive_message" } });
  const message = setting?.value?.trim() || FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  return shopOk({ message }, "Positive message");
}
