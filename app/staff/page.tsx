"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export interface ExtendedIncident {
  id: string;
  title: string;
  summary: string;
  location: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "investigating" | "contained" | "resolved";
  trapped: number;
  sourceReportIds?: string[];
  createdAt: string;
  updatedAt: string;
  timeline: any[];
  roomId?: string;
  mediaUrl?: string;
  mediaType?: string;
}

export default function StaffRouterPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleRedirect = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        router.replace("/staff/desktop");
      } else {
        router.replace("/staff/mobile");
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <span className="text-xs font-bold tracking-[0.2em] text-cyan-400 animate-pulse">
          ESTABLISHING TACTICAL COM LINK...
        </span>
      </div>
    </div>
  );
}
