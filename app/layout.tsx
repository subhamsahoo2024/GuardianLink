import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  keywords: [
    "emergency response",
    "hospitality safety",
    "crisis management",
    "PWA",
    "hotel safety",
  ],
  authors: [{ name: "GuardianLink Team" }],
  openGraph: {
    title: "GuardianLink — Crisis Coordination",
    description:
      "Next-gen crisis coordination for hospitality. Zero-install safety for every guest.",
    type: "website",
  },
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
    >
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
