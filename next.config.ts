import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "giangxa-media-cdn.b-cdn.net", pathname: "/moc-maria/ktv/**" },
      {
        protocol: "https",
        hostname: "giangxa-media-cdn.b-cdn.net",
        pathname: "/moc-maria/provider-showcase/**",
      },
      {
        protocol: "https",
        hostname: "giangxa-media-cdn.b-cdn.net",
        pathname: "/moc-maria/provider-tips/qr/**",
      },
      {
        // Same-origin fallback when a mobile browser/PWA fails to load the
        // direct Bunny CDN selfie (only this tightly scoped media folder).
        protocol: "https",
        hostname: "giangxa-media-cdn.b-cdn.net",
        pathname: "/moc-maria/staff-attendance/**",
      },
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    // P16: only the event host's root is the Event landing.
    // The primary Mộc Maria site and every other path keep existing routing.
    return [
      {
        source: "/",
        has: [{ type: "host", value: "event.mocmaria.com" }],
        destination: "/event",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
      {
        source: "/media/audio/chat-notification-053a2fe62791.mp3",
        headers: [{ key: "Cache-Control", value: "public,max-age=31536000,immutable" }],
      },
      {
        source: "/demo/ktv/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/services/photography/:path*",
        headers: [{ key: "Cache-Control", value: "public,max-age=31536000,immutable" }],
      },
      {
        source: "/demo/services/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
