import Link from "next/link";
import {
  ArrowLeft,
  AudioWaveform,
  ShieldHalf,
  TabletSmartphone,
} from "lucide-react";
import Badge from "@/app/_components/ui/Badge";
import Card from "@/app/_components/ui/Card";
import LoadingSkeleton from "@/app/_components/ui/LoadingSkeleton";
import Navbar from "@/app/_components/ui/Navbar";
import StatusPulse from "@/app/_components/ui/StatusPulse";

const floorLayers = [
  "Fire hydrants",
  "Gas lines",
  "Electrical shut-offs",
  "Stair cores",
];

export default function ResponderPage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Navbar active="responder" compact roomLabel="Responder Bridge" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="warning" dot pulse>
              Responder Bridge
            </Badge>
            <h1 className="mt-3 text-3xl font-extrabold text-text-primary">
              Tactical tablet scaffold
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              The responder workspace is laid out for technical overlays,
              translator calls, and triage scoring.
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="glass">
            <StatusPulse status="safe" label="Evacuated" />
            <div className="mt-3 text-2xl font-bold text-text-primary">18</div>
            <p className="text-sm text-text-muted">
              Guests already marked safe.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="danger" label="Missing" />
            <div className="mt-3 text-2xl font-bold text-text-primary">4</div>
            <p className="text-sm text-text-muted">
              Rooms still awaiting confirmation.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="warning" label="Live calls" />
            <div className="mt-3 text-2xl font-bold text-text-primary">2</div>
            <p className="text-sm text-text-muted">
              Translator bridge sessions waiting.
            </p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Technical floor plan overlays
                </h2>
                <p className="text-sm text-text-secondary">
                  Layer toggles for the responder view.
                </p>
              </div>
              <Badge variant="info">GeoJSON ready</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {floorLayers.map((layer) => (
                <div
                  key={layer}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-text-secondary"
                >
                  {layer}
                  <Badge variant="neutral">On</Badge>
                </div>
              ))}
            </div>

            <LoadingSkeleton variant="card" className="mt-2" />
          </Card>

          <div className="space-y-6">
            <Card variant="glass" hover>
              <div className="flex items-center gap-3">
                <ShieldHalf className="text-safe-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Triage scorecard
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Evacuated versus missing counts in a single view.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface/80 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Evacuated
                  </div>
                  <div className="mt-2 text-2xl font-bold text-safe-light">
                    82%
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface/80 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                    Missing
                  </div>
                  <div className="mt-2 text-2xl font-bold text-danger-light">
                    18%
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="glass" hover>
              <div className="flex items-center gap-3">
                <AudioWaveform className="text-warning-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Translator bridge
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Live audio and Gemini translation hooks land here next.
                  </p>
                </div>
              </div>
              <LoadingSkeleton variant="bar" className="mt-4" />
              <LoadingSkeleton variant="bar" className="mt-3" />
            </Card>

            <Card variant="glass" hover>
              <div className="flex items-center gap-3">
                <TabletSmartphone className="text-brand-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Room grid
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Room-by-room status cards are pending the next slice.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
