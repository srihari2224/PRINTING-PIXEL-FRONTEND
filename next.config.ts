import type { NextConfig } from "next";

const securityHeaders = [
  // ── Prevent clickjacking ───────────────────────────────────────────────────
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // ── Stop MIME-sniffing ────────────────────────────────────────────────────
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // ── Referrer privacy ──────────────────────────────────────────────────────
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // ── Disable unused browser features ───────────────────────────────────────
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  // ── Content Security Policy ───────────────────────────────────────────────
  // Allowlist: self + Razorpay + Google OAuth/Fonts + Render.com backends
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: self, Razorpay, Google OAuth, Cloudflare Speculation
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://accounts.google.com https://cdnjs.cloudflare.com",
      // Styles: self + inline (needed for styled-jsx / next) + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: self + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs (thumbnails) + blob (PDF previews)
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      // API calls: both Render.com backends + Razorpay
      `connect-src 'self' https://printing-pixel-1.onrender.com https://kiosk-backend-t1mi.onrender.com https://api.razorpay.com wss://printing-pixel-1.onrender.com`,
      // Frames: Razorpay iframes (payment modal)
      "frame-src https://api.razorpay.com https://checkout.razorpay.com https://accounts.google.com",
      // Workers: blob (PDF.js web worker)
      "worker-src 'self' blob:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // "standalone" mode bundles only the files needed to run the production server.
  // This is required for the Docker multi-stage build to work correctly.
  // It creates .next/standalone/server.js which the runner stage executes.
  output: "standalone",

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
