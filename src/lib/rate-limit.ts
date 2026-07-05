/**
 * In-memory sliding-window rate limiter.
 *
 * Works in Node.js API route runtime. NOT suitable for the Edge runtime.
 * For multi-instance PM2 deployments, replace the store with Redis
 * (e.g. Upstash @upstash/ratelimit).
 *
 * Current config: PM2 `instances: 1` — single process, so this is safe.
 * See claude.md §10 before adding more instances.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Timestamps = number[];
const store = new Map<string, Timestamps>();

// Purge stale entries every 2 minutes to prevent unbounded memory growth.
setInterval(() => {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [key, ts] of store) {
    const recent = ts.filter((t) => t > cutoff);
    if (recent.length === 0) store.delete(key);
    else store.set(key, recent);
  }
}, 120_000).unref();

export interface RateLimitConfig {
  /** Maximum requests allowed in the window. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Key prefix — use a different prefix per endpoint. */
  prefix?: string;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/**
 * Returns a 429 NextResponse if the request is rate-limited, or `null`
 * to allow the request through.
 *
 * Usage in a route handler:
 *   const limited = checkRateLimit(req, { max: 5, windowMs: 15 * 60_000 });
 *   if (limited) return limited;
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): NextResponse | null {
  const ip = getClientIp(req);
  const key = `${config.prefix ?? "rl"}:${ip}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  const headers = {
    "X-RateLimit-Limit": String(config.max),
    "X-RateLimit-Remaining": String(Math.max(0, config.max - timestamps.length - 1)),
    "X-RateLimit-Reset": String(
      timestamps.length > 0 ? timestamps[0] + config.windowMs : now + config.windowMs,
    ),
  };

  if (timestamps.length >= config.max) {
    const retryAfter = Math.ceil((timestamps[0] + config.windowMs - now) / 1000);
    return NextResponse.json(
      { status: false, message: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { ...headers, "Retry-After": String(retryAfter) },
      },
    );
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return null;
}

// Pre-configured limiters for auth endpoints.
//
// NOTE ON THE INDIAN MARKET: these limits are PER-IP, and Jio/Airtel route
// large subscriber pools through shared CGNAT IPv4 addresses. A limit that is
// too low blocks legitimate users who never made a prior request themselves
// (they just share an IP with someone who did). The values below are tuned to
// tolerate CGNAT + normal app retries while still capping abuse. Per-mobile
// throttling of OTP sends is a better long-term guard against SMS/WhatsApp
// cost abuse — see the OTP send path — but is not yet implemented.
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  max: 30,
  windowMs: 15 * 60_000, // 30 attempts per 15 minutes per IP (~2/min)
  prefix: "auth",
};

export const OTP_RATE_LIMIT: RateLimitConfig = {
  max: 15,
  windowMs: 15 * 60_000, // 15 OTP resends per 15 minutes per IP
  prefix: "otp",
};

export const OTP_VERIFY_RATE_LIMIT: RateLimitConfig = {
  max: 30,
  windowMs: 15 * 60_000, // 30 verify attempts per 15 minutes per IP
  prefix: "otp-verify",
};
