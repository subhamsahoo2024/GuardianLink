import { synthesizeReports } from "@/lib/gemini";
import {
  Broadcast,
  DangerZone,
  GuestPresence,
  Incident,
  IncidentStatus,
  Priority,
  Severity,
  SosReport,
} from "@/lib/staff/types";

const nowIso = () => new Date().toISOString();

const reportSeed: SosReport[] = [
  {
    id: "r-001",
    roomId: "402",
    floor: 4,
    text: "Dense smoke in east corridor near stairwell A.",
    createdAt: nowIso(),
  },
  {
    id: "r-002",
    roomId: "410",
    floor: 4,
    text: "I can smell gas and alarms are active in hallway.",
    createdAt: nowIso(),
  },
  {
    id: "r-003",
    roomId: "305",
    floor: 3,
    text: "Water leak and electrical sparks near service room.",
    createdAt: nowIso(),
  },
];

const guestSeed: GuestPresence[] = [
  {
    id: "g-001",
    roomId: "402",
    floor: 4,
    lat: 40.75835,
    lng: -73.9856,
    status: "needs_help",
    updatedAt: nowIso(),
  },
  {
    id: "g-002",
    roomId: "305",
    floor: 3,
    lat: 40.75812,
    lng: -73.98535,
    status: "no_response",
    updatedAt: nowIso(),
  },
  {
    id: "g-003",
    roomId: "201",
    floor: 2,
    lat: 40.75795,
    lng: -73.9852,
    status: "safe",
    updatedAt: nowIso(),
  },
  {
    id: "g-004",
    roomId: "412",
    floor: 4,
    lat: 40.75848,
    lng: -73.98572,
    status: "needs_help",
    updatedAt: nowIso(),
  },
];

const zoneSeed: DangerZone[] = [
  {
    id: "z-001",
    floor: 4,
    label: "Stairwell A smoke pocket",
    severity: "high",
    center: { lat: 40.75841, lng: -73.98558 },
    radiusMeters: 28,
    active: true,
    updatedAt: nowIso(),
  },
  {
    id: "z-002",
    floor: 3,
    label: "Utility room electrical arc",
    severity: "critical",
    center: { lat: 40.75805, lng: -73.98527 },
    radiusMeters: 22,
    active: true,
    updatedAt: nowIso(),
  },
];

const reports: SosReport[] = [...reportSeed];
const guests: GuestPresence[] = [...guestSeed];
let dangerZones: DangerZone[] = [...zoneSeed];
let broadcasts: Broadcast[] = [];
let incidents: Incident[] = [];

function severityFromCount(count: number): Severity {
  if (count >= 6) return "critical";
  if (count >= 4) return "high";
  if (count >= 2) return "medium";
  return "low";
}

function titleFromType(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized === "fire") return "Active fire threat";
  if (normalized === "flood") return "Flooding risk";
  if (normalized === "structural") return "Structural instability";
  if (normalized === "medical") return "Medical emergency cluster";
  if (normalized === "chemical") return "Chemical hazard";
  return "Unclassified hazard";
}

export function listReports(): SosReport[] {
  return reports;
}

export function listIncidents(): Incident[] {
  return incidents.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function listGuests(): GuestPresence[] {
  return guests;
}

export function listDangerZones(): DangerZone[] {
  return dangerZones;
}

export function listBroadcasts(): Broadcast[] {
  return broadcasts.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export async function synthesizeIncidentFromReports(
  selectedReports: SosReport[] = reports,
): Promise<Incident> {
  const synthesis = await synthesizeReports(
    selectedReports.map((r) => ({
      text: r.text,
      room: r.roomId,
      timestamp: r.createdAt,
    })),
  );

  const incident: Incident = {
    id: `inc-${Date.now()}`,
    title: titleFromType(synthesis.type),
    summary: synthesis.summary,
    location: synthesis.location,
    severity: severityFromCount(synthesis.trapped),
    status: "new",
    trapped: synthesis.trapped,
    sourceReportIds: selectedReports.map((r) => r.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    timeline: [
      {
        id: `tl-${Date.now()}`,
        note: "Incident synthesized from SOS reports.",
        status: "new",
        createdAt: nowIso(),
      },
    ],
  };

  incidents = [incident, ...incidents];
  return incident;
}

export function createFallbackIncident(
  selectedReports: SosReport[] = reports,
): Incident {
  const first = selectedReports[0];
  const incident: Incident = {
    id: `inc-${Date.now()}`,
    title: "Awaiting AI synthesis",
    summary:
      "Gemini synthesis is unavailable. Reports have been grouped into a tactical placeholder incident.",
    location: `Floor ${first?.floor ?? "unknown"}, room ${first?.roomId ?? "unknown"}`,
    severity: "high",
    status: "new",
    trapped: selectedReports.length,
    sourceReportIds: selectedReports.map((r) => r.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    timeline: [
      {
        id: `tl-${Date.now()}`,
        note: "Fallback synthesis used due to unavailable model.",
        status: "new",
        createdAt: nowIso(),
      },
    ],
  };

  incidents = [incident, ...incidents];
  return incident;
}

export function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  note?: string,
): Incident | null {
  const target = incidents.find((inc) => inc.id === incidentId);
  if (!target) return null;

  target.status = status;
  target.updatedAt = nowIso();
  target.timeline = [
    {
      id: `tl-${Date.now()}`,
      note: note || `Status updated to ${status}.`,
      status,
      createdAt: nowIso(),
    },
    ...target.timeline,
  ];

  return target;
}

export function upsertDangerZone(
  zone: Omit<DangerZone, "id" | "updatedAt"> & { id?: string },
): DangerZone {
  if (zone.id) {
    const existing = dangerZones.find((item) => item.id === zone.id);
    if (existing) {
      Object.assign(existing, zone, { updatedAt: nowIso() });
      return existing;
    }
  }

  const created: DangerZone = {
    id: `z-${Date.now()}`,
    floor: zone.floor,
    label: zone.label,
    severity: zone.severity,
    center: zone.center,
    radiusMeters: zone.radiusMeters,
    active: zone.active,
    updatedAt: nowIso(),
  };

  dangerZones = [created, ...dangerZones];
  return created;
}

export function deleteDangerZone(id: string): boolean {
  const before = dangerZones.length;
  dangerZones = dangerZones.filter((zone) => zone.id !== id);
  return dangerZones.length < before;
}

export function addBroadcast(input: {
  message: string;
  priority: Priority;
  target: "all" | "staff" | "guests";
  delivery?: "sent" | "queued" | "failed";
}): Broadcast {
  const created: Broadcast = {
    id: `br-${Date.now()}`,
    message: input.message,
    priority: input.priority,
    target: input.target,
    delivery: input.delivery || "sent",
    createdAt: nowIso(),
  };

  broadcasts = [created, ...broadcasts];
  return created;
}

export function deleteBroadcast(id: string): boolean {
  const before = broadcasts.length;
  broadcasts = broadcasts.filter((item) => item.id !== id);
  return broadcasts.length < before;
}

if (incidents.length === 0) {
  incidents = [
    {
      id: "inc-seed-1",
      title: "Smoke spread across east corridor",
      summary:
        "Multiple rooms report dense smoke near stairwell A with reduced visibility and respiratory discomfort.",
      location: "Floor 4 - East corridor",
      severity: "critical",
      status: "investigating",
      trapped: 4,
      sourceReportIds: ["r-001", "r-002"],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      timeline: [
        {
          id: "tl-seed-1",
          note: "Ops commander assigned suppression crew to east corridor.",
          status: "investigating",
          createdAt: nowIso(),
        },
      ],
    },
  ];
}
