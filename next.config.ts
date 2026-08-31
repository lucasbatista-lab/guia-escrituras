import type { NextConfig } from "next";

/**
 * Browser CSP for Amém Chat (App Router + next/font self-hosted).
 * Checkout redirects to Stripe hosted pages (top-level navigation).
 * Browser talks to same-origin APIs and Supabase Auth/realtime.
 *
 * Meta Pixel hosts (browser only; CAPI uses server → graph.facebook.com and is
 * not subject to this CSP) are derived from:
 * - src/lib/meta/pixel-loader.ts → https://connect.facebook.net/en_US/fbevents.js
 * - Meta Pixel docs: also loads /signals/config/{id} from connect.facebook.net;
 *   image/XHR beacons use https://www.facebook.com/tr
 * Consent still gates loading; CSP only makes consented loads possible.
 *
 * Paid-landing VSL: NEXT_PUBLIC_PAID_LANDING_VIDEO_URL may point at Vercel Blob
 * public URLs (https://<store-id>.public.blob.vercel-storage.com/...).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.facebook.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.facebook.com https://connect.facebook.net",
  "media-src 'self' https://*.public.blob.vercel-storage.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Content-Security-Policy",
    value: CONTENT_SECURITY_POLICY,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
