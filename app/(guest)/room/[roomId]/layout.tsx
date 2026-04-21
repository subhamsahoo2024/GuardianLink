import React from "react";
import Navbar from "@/app/_components/ui/Navbar";

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
      <Navbar active="guest" roomLabel="Emergency Assistance" />

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
