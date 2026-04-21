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
        src: "/guardianlink-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
