"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  BrainCircuit,
  Clock3,
  Flame,
  Map,
  ShieldAlert,
  Siren,
} from "lucide-react";
import Badge from "@/app/_components/ui/Badge";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";
import Navbar from "@/app/_components/ui/Navbar";
import StatusPulse from "@/app/_components/ui/StatusPulse";
import {
  Broadcast,
  DangerZone,
  GuestPresence,
  Incident,
  Priority,
} from "@/lib/staff/types";

type DashboardSection =
  | "overview"
  | "incidents"
  | "heatmap"
  | "broadcast"
  | "danger-zones"
  | "management";

const demoBypassEnabled = process.env.NEXT_PUBLIC_STAFF_DEMO_BYPASS !== "false";
const demoPasscode =
  process.env.NEXT_PUBLIC_STAFF_DEMO_PASSCODE || "guardian-staff-demo";
const osmTileUrl =
  process.env.NEXT_PUBLIC_OSM_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const sectionLabels: Array<{ key: DashboardSection; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "incidents", label: "Gemini Pulse" },
  { key: "heatmap", label: "Occupancy Heatmap" },
  { key: "broadcast", label: "Alert Broadcast" },
  { key: "danger-zones", label: "Danger Zones" },
  { key: "management", label: "Incident Management" },
];

function severityBadgeVariant(
  severity: Incident["severity"],
): "danger" | "warning" | "info" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "info";
  return "neutral";
}

function statusBadgeVariant(
  status: Incident["status"],
): "danger" | "warning" | "safe" | "info" {
  if (status === "new") return "danger";
  if (status === "investigating") return "warning";
  if (status === "contained") return "info";
  return "safe";
}

function guestColor(status: GuestPresence["status"]) {
  if (status === "needs_help") return "#ef4444";
  if (status === "safe") return "#10b981";
  return "#6b7280";
}

function priorityVariant(
  priority: Priority,
): "danger" | "warning" | "info" | "neutral" {
  if (priority === "critical") return "danger";
  if (priority === "high") return "warning";
  if (priority === "normal") return "info";
  return "neutral";
}

export default function StaffPage() {
  type LeafletModule = typeof import("leaflet");
  type LeafletMap = import("leaflet").Map;
  type RemovableLayer = { remove: () => void };

  const [authenticated, setAuthenticated] = useState(demoBypassEnabled);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("overview");

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [synthBusy, setSynthBusy] = useState(false);

  const [guests, setGuests] = useState<GuestPresence[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [selectedFloor, setSelectedFloor] = useState(4);
  const [mapInitFailed, setMapInitFailed] = useState(false);
  const [clickedPoint, setClickedPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPriority, setBroadcastPriority] = useState<Priority>("high");
  const [broadcastTarget, setBroadcastTarget] = useState<
    "all" | "staff" | "guests"
  >("all");
  const [broadcastBusy, setBroadcastBusy] = useState(false);

  const [zoneLabel, setZoneLabel] = useState("");
  const [zoneSeverity, setZoneSeverity] =
    useState<DangerZone["severity"]>("high");
  const [zoneRadius, setZoneRadius] = useState(25);
  const [zoneBusy, setZoneBusy] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const leafletModuleRef = useRef<LeafletModule | null>(null);
  const mapDrawnObjectsRef = useRef<RemovableLayer[]>([]);

  const selectedIncident = useMemo(
    () =>
      incidents.find((incident) => incident.id === selectedIncidentId) ||
      incidents[0] ||
      null,
    [incidents, selectedIncidentId],
  );

  const dashboardStats = useMemo(() => {
    const criticalIncidents = incidents.filter(
      (incident) => incident.severity === "critical",
    ).length;
    const openIncidents = incidents.filter(
      (incident) => incident.status !== "resolved",
    ).length;
    const needsHelp = guests.filter(
      (guest) => guest.status === "needs_help",
    ).length;
    const noResponse = guests.filter(
      (guest) => guest.status === "no_response",
    ).length;

    return {
      criticalIncidents,
      openIncidents,
      needsHelp,
      noResponse,
    };
  }, [guests, incidents]);

  const refreshIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    try {
      const response = await fetch("/api/incidents", { cache: "no-store" });
      const payload = (await response.json()) as { incidents?: Incident[] };
      const items = payload.incidents || [];
      setIncidents(items);
      setSelectedIncidentId((current) => current || items[0]?.id || "");
    } finally {
      setLoadingIncidents(false);
    }
  }, []);

  const refreshOccupancy = useCallback(async () => {
    const response = await fetch("/api/occupancy", { cache: "no-store" });
    const payload = (await response.json()) as {
      guests?: GuestPresence[];
      dangerZones?: DangerZone[];
    };
    setGuests(payload.guests || []);
    setDangerZones(payload.dangerZones || []);
  }, []);

  const refreshBroadcasts = useCallback(async () => {
    const response = await fetch("/api/broadcast", { cache: "no-store" });
    const payload = (await response.json()) as { broadcasts?: Broadcast[] };
    setBroadcasts(payload.broadcasts || []);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshIncidents(),
      refreshOccupancy(),
      refreshBroadcasts(),
    ]);
  }, [refreshBroadcasts, refreshIncidents, refreshOccupancy]);

  useEffect(() => {
    if (!authenticated) return;

    queueMicrotask(() => {
      void refreshAll();
    });
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 9000);

    return () => window.clearInterval(timer);
  }, [authenticated, refreshAll]);

  useEffect(() => {
    if (!authenticated || !mapRef.current) return;

    let mounted = true;

    async function initMap() {
      try {
        const L = await import("leaflet");
        leafletModuleRef.current = L;
        if (!mounted || !mapRef.current) return;

        mapInstanceRef.current = L.map(mapRef.current, {
          center: [40.7582, -73.9855],
          zoom: 19,
          zoomControl: false,
        });

        L.tileLayer(osmTileUrl, {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 20,
        }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.on("click", (evt) => {
          if (!evt.latlng) return;
          setClickedPoint({ lat: evt.latlng.lat, lng: evt.latlng.lng });
          setActiveSection("danger-zones");
        });
      } catch {
        setMapInitFailed(true);
      }
    }

    void initMap();

    return () => {
      mounted = false;
      mapDrawnObjectsRef.current.forEach((layer) => layer.remove());
      mapDrawnObjectsRef.current = [];
      const map = mapInstanceRef.current as { remove?: () => void } | null;
      map?.remove?.();
      mapInstanceRef.current = null;
      leafletModuleRef.current = null;
    };
  }, [authenticated]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = leafletModuleRef.current;
    if (!L) return;

    const map = mapInstanceRef.current;

    mapDrawnObjectsRef.current.forEach((item) => item.remove());
    mapDrawnObjectsRef.current = [];

    const floorGuests = guests.filter((guest) => guest.floor === selectedFloor);
    const floorZones = dangerZones.filter(
      (zone) => zone.floor === selectedFloor && zone.active,
    );

    floorGuests.forEach((guest) => {
      const marker = L.circleMarker([guest.lat, guest.lng], {
        radius: 8,
        color: "#ffffff",
        weight: 1,
        fillColor: guestColor(guest.status),
        fillOpacity: 1,
      }).addTo(map);
      marker.bindTooltip(guest.roomId, {
        permanent: true,
        direction: "top",
        offset: [0, -8],
        opacity: 0.95,
      });
      mapDrawnObjectsRef.current.push(marker);

      const halo = L.circle([guest.lat, guest.lng], {
        radius: 8,
        color: guestColor(guest.status),
        weight: 0,
        fillColor: guestColor(guest.status),
        fillOpacity: 0.15,
      }).addTo(map);
      mapDrawnObjectsRef.current.push(halo);
    });

    floorZones.forEach((zone) => {
      const dangerCircle = L.circle([zone.center.lat, zone.center.lng], {
        radius: zone.radiusMeters,
        color: "#fca5a5",
        opacity: 0.95,
        weight: 1,
        fillColor: zone.severity === "critical" ? "#dc2626" : "#ef4444",
        fillOpacity: 0.23,
      }).addTo(map);
      mapDrawnObjectsRef.current.push(dangerCircle);
    });
  }, [dangerZones, guests, selectedFloor]);

  useEffect(() => {
    const heatmapVisible =
      activeSection === "overview" || activeSection === "heatmap";
    if (!authenticated || !heatmapVisible || !mapRef.current) return;

    const currentMap = mapInstanceRef.current as
      | ({
          invalidateSize?: () => void;
          remove?: () => void;
          _container?: unknown;
        } & LeafletMap)
      | null;

    if (
      currentMap &&
      currentMap._container &&
      currentMap._container !== mapRef.current
    ) {
      currentMap.remove?.();
      mapInstanceRef.current = null;
      mapDrawnObjectsRef.current = [];
    }

    async function ensureMapBoundToCurrentContainer() {
      if (!mapRef.current) return;

      if (!leafletModuleRef.current) {
        leafletModuleRef.current = await import("leaflet");
      }

      const L = leafletModuleRef.current;
      if (!L || mapInstanceRef.current || !mapRef.current) return;

      mapInstanceRef.current = L.map(mapRef.current, {
        center: [40.7582, -73.9855],
        zoom: 19,
        zoomControl: false,
      });

      L.tileLayer(osmTileUrl, {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 20,
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.on("click", (evt) => {
        if (!evt.latlng) return;
        setClickedPoint({ lat: evt.latlng.lat, lng: evt.latlng.lng });
        setActiveSection("danger-zones");
      });
    }

    void ensureMapBoundToCurrentContainer();

    const timer = window.setTimeout(() => {
      const map = mapInstanceRef.current as
        | ({ invalidateSize?: () => void } & LeafletMap)
        | null;
      map?.invalidateSize?.();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeSection, authenticated]);

  async function handleSynthesize() {
    setSynthBusy(true);
    try {
      await fetch("/api/incidents/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await refreshIncidents();
      setActiveSection("incidents");
    } finally {
      setSynthBusy(false);
    }
  }

  async function handleIncidentStatusUpdate(status: Incident["status"]) {
    if (!selectedIncident) return;
    await fetch("/api/incidents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentId: selectedIncident.id,
        status,
        note: `Staff updated status to ${status}.`,
      }),
    });

    await refreshIncidents();
  }

  async function handleBroadcastSend() {
    const message = broadcastMessage.trim();
    if (!message) return;

    setBroadcastBusy(true);
    try {
      await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          priority: broadcastPriority,
          target: broadcastTarget,
        }),
      });

      setBroadcastMessage("");
      await refreshBroadcasts();
    } finally {
      setBroadcastBusy(false);
    }
  }

  async function handleDangerZoneCreate() {
    if (!clickedPoint || !zoneLabel.trim()) return;

    setZoneBusy(true);
    try {
      await fetch("/api/danger-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floor: selectedFloor,
          label: zoneLabel.trim(),
          severity: zoneSeverity,
          center: clickedPoint,
          radiusMeters: zoneRadius,
          active: true,
        }),
      });

      setZoneLabel("");
      await refreshOccupancy();
    } finally {
      setZoneBusy(false);
    }
  }

  async function handleDangerZoneDelete(zoneId: string) {
    await fetch(`/api/danger-zones?id=${encodeURIComponent(zoneId)}`, {
      method: "DELETE",
    });
    await refreshOccupancy();
  }

  function handleAuthSubmit() {
    if (passcodeInput === demoPasscode) {
      setAuthenticated(true);
      setAuthError("");
      return;
    }
    setAuthError("Invalid passcode for staff dashboard demo mode.");
  }

  if (!authenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl space-y-6">
          <Navbar active="staff" compact roomLabel="Staff Command Center" />
          <Card variant="elevated" className="space-y-4">
            <Badge variant="warning" dot pulse>
              Staff authentication required
            </Badge>
            <h1 className="text-2xl font-extrabold text-text-primary">
              Command center access gate
            </h1>
            <p className="text-sm text-text-secondary">
              Enter the staff passcode.
            </p>

            <input
              value={passcodeInput}
              onChange={(event) => setPasscodeInput(event.target.value)}
              type="password"
              placeholder="Enter passcode"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none ring-brand/40 transition focus:ring"
            />

            {authError ? (
              <p className="text-sm text-danger-light">{authError}</p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAuthSubmit}>Unlock Dashboard</Button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand/30 hover:bg-surface-elevated"
              >
                <ArrowLeft size={16} />
                Back home
              </Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Navbar active="staff" compact roomLabel="Staff Command Center" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge
              variant={dashboardStats.criticalIncidents > 0 ? "danger" : "safe"}
              dot
              pulse
            >
              Crisis status{" "}
              {dashboardStats.criticalIncidents > 0 ? "CRITICAL" : "STABLE"}
            </Badge>
            <h1 className="mt-3 text-3xl font-extrabold text-text-primary">
              Staff Command Center
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="warning"
              icon={<BrainCircuit size={16} />}
              loading={synthBusy}
              onClick={handleSynthesize}
            >
              Synthesize Incidents
            </Button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand/30 hover:bg-surface-elevated"
            >
              <ArrowLeft size={16} />
              Back home
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card variant="glass">
            <StatusPulse status="warning" label="Open incidents" />
            <div className="mt-3 text-2xl font-bold text-text-primary">
              {dashboardStats.openIncidents}
            </div>
            <p className="text-sm text-text-muted">
              Incidents pending containment or resolution.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="danger" label="Critical" />
            <div className="mt-3 text-2xl font-bold text-text-primary">
              {dashboardStats.criticalIncidents}
            </div>
            <p className="text-sm text-text-muted">
              High-priority incidents requiring immediate action.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="danger" label="Needs help" />
            <div className="mt-3 text-2xl font-bold text-text-primary">
              {dashboardStats.needsHelp}
            </div>
            <p className="text-sm text-text-muted">
              Guests reporting direct hazard exposure.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="no-response" label="No response" />
            <div className="mt-3 text-2xl font-bold text-text-primary">
              {dashboardStats.noResponse}
            </div>
            <p className="text-sm text-text-muted">
              Rooms still awaiting guest confirmation.
            </p>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_1fr] lg:grid-cols-[240px_1fr] overflow-hidden">
          <aside className="min-w-0 space-y-3">
            <Card variant="elevated" className="space-y-2 p-3 overflow-hidden">
              {sectionLabels.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveSection(section.key)}
                  aria-label={`Show ${section.label} section`}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                    activeSection === section.key
                      ? "bg-brand/15 text-brand-light"
                      : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </Card>
          </aside>

          <div className="min-w-0 space-y-6">
            {(activeSection === "overview" ||
              activeSection === "incidents") && (
              <Card variant="elevated" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BrainCircuit className="text-brand-light" />
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">
                        Gemini Pulse Incident Feed
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Real-time synthesized incidents with severity and
                        trapped estimates.
                      </p>
                    </div>
                  </div>
                  <Badge variant="info">{incidents.length} total</Badge>
                </div>

                <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                  {loadingIncidents && incidents.length === 0 ? (
                    <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
                      Loading incidents...
                    </div>
                  ) : null}

                  {incidents.map((incident) => (
                    <button
                      key={incident.id}
                      type="button"
                      onClick={() => {
                        setSelectedIncidentId(incident.id);
                        setActiveSection("management");
                      }}
                      aria-label={`Open incident ${incident.title}`}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        selectedIncident?.id === incident.id
                          ? "border-brand/40 bg-brand/10"
                          : "border-border bg-surface hover:border-brand/20"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-text-primary">
                            {incident.title}
                          </h3>
                          <p className="mt-1 text-sm text-text-secondary">
                            {incident.summary}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={severityBadgeVariant(incident.severity)}
                          >
                            {incident.severity}
                          </Badge>
                          <Badge variant={statusBadgeVariant(incident.status)}>
                            {incident.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Map size={12} />
                          {incident.location}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {incident.trapped} potentially trapped
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {new Date(incident.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </button>
                  ))}

                  {incidents.length === 0 && !loadingIncidents ? (
                    <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
                      No incidents yet. Run synthesis to generate the first
                      grouped event.
                    </div>
                  ) : null}
                </div>
              </Card>
            )}

            {(activeSection === "overview" || activeSection === "heatmap") && (
              <Card variant="elevated" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Flame className="text-danger-light" />
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">
                        Occupancy and Safety Heatmap
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Advanced markers for guest status, danger circles, and
                        floor-level visualization.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {[2, 3, 4].map((floor) => (
                      <button
                        key={floor}
                        type="button"
                        onClick={() => setSelectedFloor(floor)}
                        aria-label={`Select floor ${floor}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          selectedFloor === floor
                            ? "bg-brand/15 text-brand-light"
                            : "bg-surface text-text-secondary"
                        }`}
                      >
                        Floor {floor}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-80 overflow-hidden rounded-2xl border border-border bg-surface">
                  <div ref={mapRef} className="h-full w-full" />
                </div>
                {mapInitFailed ? (
                  <p className="text-sm text-warning-light">
                    Map failed to initialize. Check network and tile access.
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-safe" />{" "}
                    Safe
                  </div>
                  <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-danger" />{" "}
                    Needs help
                  </div>
                  <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-no-response" />{" "}
                    No response
                  </div>
                </div>
              </Card>
            )}

            {(activeSection === "overview" ||
              activeSection === "broadcast") && (
              <Card variant="elevated" className="space-y-4">
                <div className="flex items-center gap-3">
                  <BellRing className="text-warning-light" />
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">
                      Critical Alert Broadcast
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Compose high-priority announcements and track delivery
                      history.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                  <textarea
                    value={broadcastMessage}
                    onChange={(event) =>
                      setBroadcastMessage(event.target.value)
                    }
                    rows={3}
                    placeholder="Example: Evacuate using Stairwell B. Avoid east corridor due to smoke spread."
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none ring-brand/40 transition focus:ring"
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      value={broadcastPriority}
                      onChange={(event) =>
                        setBroadcastPriority(event.target.value as Priority)
                      }
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary"
                    >
                      <option value="low">Low priority</option>
                      <option value="normal">Normal priority</option>
                      <option value="high">High priority</option>
                      <option value="critical">Critical priority</option>
                    </select>

                    <select
                      value={broadcastTarget}
                      onChange={(event) =>
                        setBroadcastTarget(
                          event.target.value as "all" | "staff" | "guests",
                        )
                      }
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary"
                    >
                      <option value="all">All devices</option>
                      <option value="staff">Staff only</option>
                      <option value="guests">Guests only</option>
                    </select>

                    <Button
                      variant="danger"
                      icon={<Siren size={16} />}
                      loading={broadcastBusy}
                      onClick={handleBroadcastSend}
                    >
                      Send Alert
                    </Button>
                  </div>
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {broadcasts.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <Badge variant={priorityVariant(item.priority)}>
                            {item.priority}
                          </Badge>
                          <Badge variant="neutral">{item.target}</Badge>
                        </div>
                        <span className="text-xs text-text-muted">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {item.message}
                      </p>
                      <div className="mt-2 text-xs text-text-muted">
                        Delivery: {item.delivery}
                      </div>
                    </div>
                  ))}

                  {broadcasts.length === 0 ? (
                    <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
                      No alerts have been broadcast yet.
                    </div>
                  ) : null}
                </div>
              </Card>
            )}

            {(activeSection === "overview" ||
              activeSection === "danger-zones") && (
              <Card variant="elevated" className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-danger-light" />
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">
                      Danger Zone Management
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Use map clicks to pin hazard centers, then create/update
                      restricted areas.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    value={zoneLabel}
                    onChange={(event) => setZoneLabel(event.target.value)}
                    placeholder="Zone label"
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  />
                  <select
                    value={zoneSeverity}
                    onChange={(event) =>
                      setZoneSeverity(
                        event.target.value as DangerZone["severity"],
                      )
                    }
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <input
                    value={zoneRadius}
                    onChange={(event) =>
                      setZoneRadius(Number(event.target.value) || 10)
                    }
                    type="number"
                    min={5}
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                  />
                  <Button loading={zoneBusy} onClick={handleDangerZoneCreate}>
                    Save Zone
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                  {clickedPoint
                    ? `Selected center: ${clickedPoint.lat.toFixed(5)}, ${clickedPoint.lng.toFixed(5)} (Floor ${selectedFloor})`
                    : "Click on the map in the heatmap panel to select a danger-zone center point."}
                </div>

                <div className="space-y-2">
                  {dangerZones
                    .filter((zone) => zone.floor === selectedFloor)
                    .map((zone) => (
                      <div
                        key={zone.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold text-text-primary">
                            {zone.label}
                          </div>
                          <div className="text-xs text-text-muted">
                            Radius {zone.radiusMeters}m •{" "}
                            {zone.center.lat.toFixed(5)},{" "}
                            {zone.center.lng.toFixed(5)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={severityBadgeVariant(zone.severity)}>
                            {zone.severity}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDangerZoneDelete(zone.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {(activeSection === "overview" || activeSection === "management") &&
              selectedIncident && (
                <Card variant="elevated" className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-text-primary">
                        Incident Detail View
                      </h2>
                      <p className="text-sm text-text-secondary">
                        Status controls and timeline for tactical decision
                        tracking.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant={severityBadgeVariant(
                          selectedIncident.severity,
                        )}
                      >
                        {selectedIncident.severity}
                      </Badge>
                      <Badge
                        variant={statusBadgeVariant(selectedIncident.status)}
                      >
                        {selectedIncident.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                      {selectedIncident.title}
                    </h3>
                    <p className="mt-2 text-sm text-text-secondary">
                      {selectedIncident.summary}
                    </p>
                    <div className="mt-3 text-xs text-text-muted">
                      Location: {selectedIncident.location}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() =>
                        handleIncidentStatusUpdate("investigating")
                      }
                    >
                      Investigating
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleIncidentStatusUpdate("contained")}
                    >
                      Mark Contained
                    </Button>
                    <Button
                      size="sm"
                      variant="safe"
                      onClick={() => handleIncidentStatusUpdate("resolved")}
                    >
                      Mark Resolved
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {selectedIncident.timeline.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-border bg-surface px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-text-primary">
                            {entry.note}
                          </span>
                          <Badge variant={statusBadgeVariant(entry.status)}>
                            {entry.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-text-muted">
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            {!selectedIncident && activeSection === "management" ? (
              <Card variant="glass" className="text-sm text-text-muted">
                Choose an incident in the Gemini Pulse feed to manage status and
                timeline.
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
