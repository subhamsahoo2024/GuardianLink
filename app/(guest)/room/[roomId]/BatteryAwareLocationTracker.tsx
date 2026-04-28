"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, LocateOff, MapPin } from "lucide-react";
import Card from "@/app/_components/ui/Card";
import Badge from "@/app/_components/ui/Badge";

type BatteryLike = {
  charging: boolean;
  level: number;
};

type NavigatorWithBattery = Navigator & {
  connection?: {
    saveData?: boolean;
  };
  getBattery?: () => Promise<BatteryLike>;
};

interface LocationFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export default function BatteryAwareLocationTracker() {
  const [enabled, setEnabled] = useState(false);
  const [trackingState, setTrackingState] = useState<
    "idle" | "active" | "limited" | "error"
  >("idle");
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const geolocationAvailable =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const effectiveTrackingState =
    enabled && !geolocationAvailable ? "error" : trackingState;

  const cadenceLabel = useMemo(() => {
    if (effectiveTrackingState === "error") return "Location disabled";
    if (!enabled) return "Tracking paused";
    return lowPowerMode ? "Conserving battery" : "Active tracking";
  }, [enabled, effectiveTrackingState, lowPowerMode]);

  useEffect(() => {
    const updateBatteryMode = async () => {
      const navigatorWithBattery = navigator as NavigatorWithBattery;
      const saveData = navigatorWithBattery.connection?.saveData === true;
      let charging = true;
      let level = 1;

      try {
        const battery = await navigatorWithBattery.getBattery?.();
        if (battery) {
          charging = battery.charging;
          level = battery.level;
        }
      } catch {
        // Battery API unavailable; fall back to conservative defaults.
      }

      setLowPowerMode(saveData || (!charging && level < 0.35));
    };

    void updateBatteryMode();
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!geolocationAvailable) {
      return;
    }

    const sampleLocation = () => {
      setTrackingState(lowPowerMode ? "limited" : "active");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFix({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
          setTrackingState(lowPowerMode ? "limited" : "active");
        },
        () => setTrackingState("error"),
        {
          enableHighAccuracy: !lowPowerMode,
          maximumAge: lowPowerMode ? 60000 : 15000,
          timeout: lowPowerMode ? 15000 : 10000,
        },
      );
    };

    sampleLocation();
    intervalRef.current = window.setInterval(
      sampleLocation,
      lowPowerMode ? 60000 : 20000,
    );

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, geolocationAvailable, lowPowerMode]);

  return (
    <Card variant="glass" hover className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            location tracking
          </h3>
        </div>
        <Badge
          variant={
            effectiveTrackingState === "error"
              ? "danger"
              : enabled
                ? "safe"
                : "neutral"
          }
        >
          {cadenceLabel}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setEnabled((current) => !current)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            enabled
              ? "bg-safe/15 text-safe-light border border-safe/30"
              : "bg-surface-elevated text-text-primary border border-border hover:border-brand/30"
          }`}
          aria-pressed={enabled}
        >
          {enabled ? <LocateOff size={16} /> : <LocateFixed size={16} />}
          {enabled ? "Stop tracking" : "Share location"}
        </button>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
          <MapPin size={14} />
          {lowPowerMode ? "Low-power cadence" : "Balanced cadence"}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Mode
          </div>
          <div className="mt-1 text-sm font-semibold text-text-primary">
            {enabled ? (lowPowerMode ? "Battery saver" : "Live") : "Paused"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Accuracy
          </div>
          <div className="mt-1 text-sm font-semibold text-text-primary">
            {fix ? `±${Math.round(fix.accuracy)}m` : "Waiting"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
            Fix
          </div>
          <div className="mt-1 text-sm font-semibold text-text-primary">
            {fix ? new Date(fix.timestamp).toLocaleTimeString() : "None"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-text-secondary">
        {effectiveTrackingState === "error"
          ? "Location access is unavailable or denied. The guest can still use SOS and manual routing guidance."
          : fix
            ? `Last known position: ${fix.latitude.toFixed(5)}, ${fix.longitude.toFixed(5)}`
            : "Enable tracking to capture a low-frequency, battery-conscious location fix."}
      </div>
    </Card>
  );
}
