"use client";

import Link from "next/link";
import { ArrowLeft, MapPinned, ShieldAlert, Siren } from "lucide-react";
import Badge from "@/app/_components/ui/Badge";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";
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

function DemoExitMap() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="mt-1 text-sm font-semibold text-text-primary">
            Guest room to Stairwell B
          </div>
        </div>
        <Badge variant="safe">Open route</Badge>
      </div>

      <div className="relative h-56 overflow-hidden rounded-xl border border-border bg-[#101522]">
        <svg viewBox="0 0 600 320" className="absolute inset-0 h-full w-full">
          <defs>
            <pattern
              id="grid"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="rgba(148,163,184,0.16)"
                strokeWidth="1"
              />
            </pattern>
            <linearGradient id="routeGlow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <rect width="600" height="320" fill="#101522" />
          <rect width="600" height="320" fill="url(#grid)" />

          <rect
            x="40"
            y="38"
            width="148"
            height="92"
            rx="16"
            fill="#182035"
            stroke="#334155"
          />
          <rect
            x="214"
            y="38"
            width="160"
            height="92"
            rx="16"
            fill="#182035"
            stroke="#334155"
          />
          <rect
            x="400"
            y="38"
            width="160"
            height="92"
            rx="16"
            fill="#182035"
            stroke="#334155"
          />
          <rect
            x="40"
            y="164"
            width="148"
            height="110"
            rx="16"
            fill="#182035"
            stroke="#334155"
          />
          <rect
            x="214"
            y="164"
            width="160"
            height="110"
            rx="16"
            fill="#182035"
            stroke="#334155"
          />
          <rect
            x="400"
            y="164"
            width="160"
            height="110"
            rx="16"
            fill="#182035"
            stroke="#334155"
          />

          <text x="64" y="76" fill="#e8eaf0" fontSize="16" fontWeight="600">
            Guest room
          </text>
          <text x="238" y="76" fill="#e8eaf0" fontSize="16" fontWeight="600">
            Hallway
          </text>
          <text x="428" y="76" fill="#e8eaf0" fontSize="16" fontWeight="600">
            Stairwell B
          </text>
          <text x="64" y="204" fill="#e8eaf0" fontSize="16" fontWeight="600">
            Smoke area
          </text>
          <text x="238" y="204" fill="#e8eaf0" fontSize="16" fontWeight="600">
            Safe corridor
          </text>
          <text x="428" y="204" fill="#e8eaf0" fontSize="16" fontWeight="600">
            Exit door
          </text>

          <circle cx="112" cy="110" r="10" fill="#ef4444" />
          <circle cx="490" cy="95" r="10" fill="#10b981" />

          <path
            d="M 122 110 L 214 110 L 214 165 L 400 165 L 400 190 L 490 190 L 490 95"
            fill="none"
            stroke="url(#routeGlow)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="0"
          />
          <path
            d="M 122 110 L 214 110 L 214 165 L 400 165 L 400 190 L 490 190 L 490 95"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polygon points="490,95 474,89 476,101" fill="#34d399" />
          <polygon points="490,95 504,88 502,100" fill="#34d399" />
          <polygon points="490,95 482,109 494,108" fill="#34d399" />
        </svg>

        <div className="absolute left-4 bottom-4 rounded-xl border border-safe/30 bg-safe/10 px-3 py-2 text-xs text-safe-light shadow-[0_0_24px_rgba(16,185,129,0.18)]">
          Follow the glowing path to Stairwell B
        </div>
      </div>
    </div>
  );
}

export default function GuestRoomShell() {
  const { roomId, floor, hotelName, status, syncState, setStatus } =
    useRoomContext();
  const guestDemoMode = process.env.NEXT_PUBLIC_GUEST_DEMO_MODE !== "false";

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
                  {hotelName} guest shell is the zero-install entry point for
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
                </div>
              </div>

              <div className="mt-6">
                {guestDemoMode ? (
                  <DemoExitMap />
                ) : (
                  <div className="rounded-2xl border border-border bg-surface/80 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-text-muted">
                          Live route placeholder
                        </div>
                        <div className="mt-1 text-lg font-semibold text-text-primary">
                          Waiting for map feed
                        </div>
                      </div>
                      <Badge variant="neutral">Not demo mode</Badge>
                    </div>

                    <div className="mt-4 rounded-xl border border-border bg-background px-4 py-5 text-sm text-text-secondary">
                      The demo floorplan is hidden because guest demo mode is
                      disabled. Connect the real map source here.
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <MultilingualEmergencyTicker />
          </div>
        </div>
      </div>
    </div>
  );
}
