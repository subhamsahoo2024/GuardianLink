import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/app/_components/pwa/InstallPrompt";
import ServiceWorkerRegistration from "@/app/_components/pwa/ServiceWorkerRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GuardianLink — Crisis Coordination for Hospitality",
  description:
    "A decentralized emergency response ecosystem for the hospitality industry. Zero-install PWA that bridges guests, staff, and first responders during crises.",
  manifest: "/manifest.webmanifest",
  keywords: [
    "emergency response",
    "hospitality safety",
    "crisis management",
    "PWA",
    "hotel safety",
  ],
  authors: [{ name: "GuardianLink Team" }],
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "GuardianLink — Crisis Coordination",
    description:
      "Next-gen crisis coordination for hospitality. Zero-install safety for every guest.",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0b0e17",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-high-contrast="false"
    >
      <body className="min-h-screen flex flex-col antialiased">
        <ServiceWorkerRegistration />
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
