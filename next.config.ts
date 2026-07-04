import type { NextConfig } from "next";

const securityHeaders = [
  // Enforce HTTPS for 1 year, including subdomains
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Deny iframe embedding (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Control referrer information sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features not needed by this app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content-Security-Policy: tight default; loosen per-page if needed
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval required by Next.js dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Expose the API only — do not generate an output for the static homepage in prod
  // (remove this if you add an admin UI later and need the full SSR page)

  // Restrict server-side body size (file uploads go through multipart, not raw body)
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Allow serving uploaded files cross-origin to the mobile app
        source: "/uploads/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // API responses must not be cached by default
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },

  // Log fewer details in production (no stack traces in responses)
  productionBrowserSourceMaps: false,

  // Compress responses (enabled by default; explicit for clarity)
  compress: true,
};

export default nextConfig;
