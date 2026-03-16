import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/api/v1/payments/webhook",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://api.tosspayments.com", // Restrict Webhook origin for security
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST, OPTIONS",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
