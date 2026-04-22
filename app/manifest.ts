import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GuardianLink",
    short_name: "GuardianLink",
    description:
      "Zero-install crisis coordination for guests, staff, and first responders.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0e17",
    theme_color: "#0b0e17",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
