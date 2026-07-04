import { NextResponse, type NextRequest } from "next/server";

// Domains that may send an Origin header and call the API from a browser.
// Flutter mobile app does NOT send Origin — we allow it implicitly.
const ALLOWED_ORIGINS = new Set([
  "https://dev.hammerapp.in",
  "https://admin.hammerapp.in",
  "https://hammerapp.in",
  // dev
  "http://localhost:3003",
  "http://localhost:3000",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  // If the request has no Origin (mobile app, curl, server-to-server), return open access.
  // If it has an Origin, only allow known domains.
  const allowOrigin =
    !origin || ALLOWED_ORIGINS.has(origin) ? (origin ?? "*") : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin || "null",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // ── CORS preflight ───────────────────────────────────────
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const res = NextResponse.next();

  // ── CORS actual request ──────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const ch = corsHeaders(origin);
    for (const [k, v] of Object.entries(ch)) {
      res.headers.set(k, v);
    }
  }

  return res;
}

export const config = {
  // Run on API routes only (Edge-compatible — no Node.js globals here)
  matcher: ["/api/:path*"],
};
