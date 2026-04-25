"use client";

import Link from "next/link";
import { ArrowLeft, MapPinned, ShieldAlert, Siren } from "lucide-react";
import AlertBanner from "@/app/_components/ui/AlertBanner";
import Badge from "@/app/_components/ui/Badge";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";
import LoadingSkeleton from "@/app/_components/ui/LoadingSkeleton";
import StatusPulse from "@/app/_components/ui/StatusPulse";
import SOSButton from "./SOSButton";
import SOSReportForm from "./SOSReportForm";
import BatteryAwareLocationTracker from "./BatteryAwareLocationTracker";
import MultilingualEmergencyTicker from "./MultilingualEmergencyTicker";
import { useRoomContext } from "./RoomContext";

const instructions = [
  "Keep the door closed unless you hear staff instructions to evacuate.",
  "Use the guest emergency button only if you are trapped or cannot reach safety.",
  "Watch the path card for the current safe exit direction.",
];

export default function GuestRoomShell() {
  const { roomId, floor, hotelName, status, syncState, setStatus } =
    useRoomContext();

  const statusLabel =
    status === "needs-help"
      ? "Needs help"
      : status === "evacuated"
        ? "Safe"
        : "Awaiting update";

  const statusPulse =
    status === "needs-help"
      ? "danger"
      : status === "evacuated"
        ? "safe"
        : "warning";

  const syncLabel =
    syncState === "live"
      ? "Firestore live"
      : syncState === "syncing"
        ? "Syncing..."
        : syncState === "error"
          ? "Sync error"
          : "Idle";

  const syncBadgeVariant =
    syncState === "live"
      ? "safe"
      : syncState === "syncing"
        ? "warning"
        : syncState === "error"
          ? "danger"
          : "neutral";

  return (
    <div className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
      <AlertBanner
        variant="warning"
        messages={[
          `Room ${roomId} loaded (${hotelName}, floor ${floor})`,
          "SOS capture, route guidance, and battery-aware location tracking are active",
        ]}
        className="rounded-2xl"
      />

      <div className="mx-auto mt-5 max-w-[1200px] space-y-6 overflow-hidden">
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-danger/10" />
          <div className="relative space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <Badge variant="info" dot pulse>
                  Guest Survival Hub
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary">
                  Room {roomId}
                </h1>
                <p className="max-w-2xl text-text-secondary">
                  This guest shell is the zero-install entry point for
                  evacuation guidance, help requests, and language-aware
                  emergency alerts.
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand/30 hover:bg-surface-elevated"
              >
                <ArrowLeft size={16} />
                Back home
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Card variant="glass" padding="sm">
                <div className="text-xs text-text-muted uppercase tracking-[0.2em]">
                  Room linked
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-text-primary">
                    Active
                  </span>
                  <StatusPulse status="safe" size="sm" />
                </div>
              </Card>
              <Card variant="glass" padding="sm">
                <div className="text-xs text-text-muted uppercase tracking-[0.2em]">
                  Hotel context
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-text-primary">
                    Floor {floor}
                  </span>
                  <StatusPulse status="safe" size="sm" />
                </div>
              </Card>
              <Card variant="glass" padding="sm">
                <div className="text-xs text-text-muted uppercase tracking-[0.2em]">
                  Guest status
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-lg font-bold text-text-primary">
                    {statusLabel}
                  </span>
                  <StatusPulse status={statusPulse} size="sm" />
                </div>
              </Card>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0 space-y-6">
            <Card variant="glass" hover>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-danger/10 p-3 text-danger-light">
                  <Siren size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    Emergency guidance
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Keep this page open and follow the latest instruction.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {instructions.map((instruction) => (
                  <div
                    key={instruction}
                    className="rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-text-secondary"
                  >
                    {instruction}
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="elevated" hover>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-brand/10 p-3 text-brand-light">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    Next actions
                  </h2>
                  <p className="text-sm text-text-secondary">
                    This shell is ready for SOS capture, status sync, and
                    translation.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <SOSButton onTrigger={() => setStatus("needs-help")} />
                <Button
                  variant="safe"
                  size="lg"
                  onClick={() => setStatus("evacuated")}
                >
                  I am safe
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Badge variant="warning" dot pulse>
                  Multilingual ticker pending
                </Badge>
                <Badge
                  variant={syncBadgeVariant}
                  dot
                  pulse={syncState === "syncing"}
                >
                  {syncLabel}
                </Badge>
              </div>
            </Card>

            <SOSReportForm />
          </div>

          <div className="min-w-0 space-y-6">
            <BatteryAwareLocationTracker />

            <Card variant="glass" hover>
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-safe/10 p-3 text-safe-light">
                  <MapPinned size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    Current safe-path preview
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    The full indoor map overlay is not wired yet, so this slice
                    shows the route state that the live map will eventually
                    control.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-surface/80 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-text-muted">
                      Primary exit
                    </div>
                    <div className="mt-1 text-lg font-semibold text-text-primary">
                      Stairwell B
                    </div>
                  </div>
                  <Badge variant="safe">Clear</Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <LoadingSkeleton variant="bar" className="h-10" />
                  <LoadingSkeleton variant="bar" className="h-10" />
                  <LoadingSkeleton variant="bar" className="h-10" />
                </div>
              </div>
            </Card>

            <MultilingualEmergencyTicker />
          </div>
        </div>
      </div>
    </div>
  );
}
