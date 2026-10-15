import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
