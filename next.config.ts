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
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://maps.googleapis.com https://maps.gstatic.com https://lh3.googleusercontent.com; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://firestore.googleapis.com https://firebasestorage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://translation.googleapis.com https://generativelanguage.googleapis.com https://maps.googleapis.com https://maps.gstatic.com; worker-src 'self' blob:; media-src 'self' blob: data:;",
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
