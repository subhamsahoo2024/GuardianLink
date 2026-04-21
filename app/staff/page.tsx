import Link from "next/link";
import { ArrowLeft, BellRing, BrainCircuit, Map, Users } from "lucide-react";
import Badge from "@/app/_components/ui/Badge";
import Card from "@/app/_components/ui/Card";
import LoadingSkeleton from "@/app/_components/ui/LoadingSkeleton";
import Navbar from "@/app/_components/ui/Navbar";
import StatusPulse from "@/app/_components/ui/StatusPulse";

const incidentCards = [
  {
    title: "Gemini Pulse feed",
    detail:
      "Synthesized incident summaries will appear here once the synthesis route is connected.",
    badge: "AI feed",
  },
  {
    title: "Occupancy heatmap",
    detail:
      "Real-time guest markers and floor density overlays will drive this panel.",
    badge: "Live map",
  },
  {
    title: "Broadcast log",
    detail:
      "High-priority alerts, push delivery, and history will accumulate here.",
    badge: "FCM",
  },
];

export default function StaffPage() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Navbar active="staff" compact roomLabel="Staff Command Center" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="safe" dot pulse>
              Staff Command Center
            </Badge>
            <h1 className="mt-3 text-3xl font-extrabold text-text-primary">
              Operations dashboard scaffold
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">
              The AI feed, heatmap, and broadcast surfaces are wired as a
              navigable shell so the next slices can attach live Firebase and
              Gemini data.
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

        <div className="grid gap-4 md:grid-cols-4">
          <Card variant="glass">
            <StatusPulse status="safe" label="Active floors" />
            <div className="mt-3 text-2xl font-bold text-text-primary">3</div>
            <p className="text-sm text-text-muted">
              Hotel floors monitored in demo mode.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="warning" label="Open incidents" />
            <div className="mt-3 text-2xl font-bold text-text-primary">7</div>
            <p className="text-sm text-text-muted">
              Placeholder incident count for the feed layout.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="danger" label="Critical alerts" />
            <div className="mt-3 text-2xl font-bold text-text-primary">1</div>
            <p className="text-sm text-text-muted">
              Broadcast urgency indicator for emergency messaging.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="no-response" label="No response" />
            <div className="mt-3 text-2xl font-bold text-text-primary">12</div>
            <p className="text-sm text-text-muted">
              Guests awaiting status confirmation.
            </p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <Card variant="elevated" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Mission panels
                </h2>
                <p className="text-sm text-text-secondary">
                  The three core staff surfaces from the implementation guide.
                </p>
              </div>
              <Badge variant="info">Demo route</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {incidentCards.map((card) => (
                <Card key={card.title} variant="glass" hover>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm text-text-secondary">
                        {card.detail}
                      </p>
                    </div>
                    <Badge variant="neutral">{card.badge}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card variant="glass" hover>
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-brand-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Gemini Pulse
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Synthesis engine placeholder
                  </p>
                </div>
              </div>
              <LoadingSkeleton variant="card" className="mt-4" />
            </Card>

            <Card variant="glass" hover>
              <div className="flex items-center gap-3">
                <Map className="text-safe-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Heatmap window
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Live occupancy surface pending map integration.
                  </p>
                </div>
              </div>
              <LoadingSkeleton variant="card" className="mt-4" />
            </Card>

            <Card variant="glass" hover>
              <div className="flex items-center gap-3">
                <BellRing className="text-warning-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Broadcast queue
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Alert composer and history log placeholder.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-text-muted">
                <Users size={16} />
                Staff notifications will render here in the next slice.
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
