import React from "react";
import { Shield } from "lucide-react";

export const metadata = {
  title: "GuardianLink — Emergency Assistance",
  description:
    "Zero-install emergency assistance for hotel guests. Get real-time evacuation routes and SOS reporting.",
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Compact header for PWA feel */}
      <header className="glass sticky top-0 z-50 px-4 py-3 flex items-center gap-3 border-b border-border">
        <div className="p-1.5 rounded-lg bg-danger/10">
          <Shield size={18} className="text-danger" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-text-primary leading-none">
            GuardianLink
          </h1>
          <p className="text-[10px] text-text-muted">Emergency Assistance</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-danger opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
          </span>
          <span className="text-xs font-semibold text-danger-light">ACTIVE</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
