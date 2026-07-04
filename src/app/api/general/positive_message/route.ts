import { shopOk } from "@/lib/api-shop";

const MESSAGES = [
  "Welcome to Hammer — grow your business with us!",
  "More sales, more benefits. Keep going!",
  "Your shop is one step closer to more orders.",
];

// GET /api/general/positive_message — a motivational message for the app.
export async function GET() {
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  return shopOk({ message }, "Positive message");
}
