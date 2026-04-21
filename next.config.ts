import type { NextConfig } from "next";

const remoteImagePatterns = [
  {
    protocol: "https",
    hostname: "firebasestorage.googleapis.com",
    pathname: "/v0/b/**",
  },
  {
    protocol: "https",
    hostname: "storage.googleapis.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "maps.googleapis.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "maps.gstatic.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    pathname: "/**",
  },
] as const satisfies NonNullable<NextConfig["images"]>["remotePatterns"];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remoteImagePatterns,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
