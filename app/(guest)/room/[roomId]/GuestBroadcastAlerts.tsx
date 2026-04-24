"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Volume2 } from "lucide-react";
import Badge from "@/app/_components/ui/Badge";
import Card from "@/app/_components/ui/Card";
import { Broadcast } from "@/lib/staff/types";

export default function GuestBroadcastAlerts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBroadcasts() {
      try {
        const response = await fetch("/api/broadcast?target=guests", {
          cache: "no-store",
        });
        if (response.ok) {
          const data = (await response.json()) as { broadcasts?: Broadcast[] };
          setBroadcasts(data.broadcasts || []);
        }
      } catch (error) {
        console.error("Failed to fetch broadcasts:", error);
      } finally {
        setLoading(false);
      }
    }

    // Fetch immediately and then every 5 seconds
    void fetchBroadcasts();
    const interval = window.setInterval(() => {
      void fetchBroadcasts();
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  if (loading || broadcasts.length === 0) {
    return null;
  }

  const criticalBroadcasts = broadcasts.filter((b) => b.priority === "critical");
  const hasCritical = criticalBroadcasts.length > 0;

  return (
    <Card
      variant="elevated"
      className={`space-y-4 border-2 ${
        hasCritical ? "border-danger bg-danger/5" : "border-warning bg-warning/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-xl p-3 ${
            hasCritical
              ? "bg-danger/10 text-danger-light"
              : "bg-warning/10 text-warning-light"
          }`}
        >
          {hasCritical ? (
            <AlertTriangle size={22} />
          ) : (
            <Bell size={22} />
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            {hasCritical ? "Critical Alert" : "Staff Announcement"}
          </h2>
          <p className="text-sm text-text-secondary">
            Important message from emergency staff
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {broadcasts.map((broadcast) => (
          <div
            key={broadcast.id}
            className={`rounded-xl border-l-4 px-4 py-3 ${
              broadcast.priority === "critical"
                ? "border-l-danger bg-danger/10"
                : broadcast.priority === "high"
                  ? "border-l-warning bg-warning/10"
                  : "border-l-brand bg-brand/10"
            }`}
          >
            <div className="flex items-start gap-2">
              <Volume2 className="mt-1 flex-shrink-0" size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary break-words">
                  {broadcast.message}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      broadcast.priority === "critical"
                        ? "danger"
                        : broadcast.priority === "high"
                          ? "warning"
                          : "info"
                    }
                  >
                    {broadcast.priority}
                  </Badge>
                  <span className="text-xs text-text-muted">
                    {new Date(broadcast.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
