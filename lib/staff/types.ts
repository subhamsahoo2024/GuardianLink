export type Severity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "new" | "investigating" | "contained" | "resolved";

export type Priority = "low" | "normal" | "high" | "critical";

export interface SosReport {
  id: string;
  roomId: string;
  floor: number;
  text: string;
  createdAt: string;
}

export interface IncidentTimelineEntry {
  id: string;
  note: string;
  status: IncidentStatus;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  location: string;
  severity: Severity;
  status: IncidentStatus;
  trapped: number;
  sourceReportIds: string[];
  createdAt: string;
  updatedAt: string;
  timeline: IncidentTimelineEntry[];
}

export interface GuestPresence {
  id: string;
  roomId: string;
  floor: number;
  lat: number;
  lng: number;
  status: "safe" | "needs_help" | "no_response";
  updatedAt: string;
}

export interface DangerZone {
  id: string;
  floor: number;
  label: string;
  severity: Severity;
  center: { lat: number; lng: number };
  radiusMeters: number;
  active: boolean;
  updatedAt: string;
}

export interface Broadcast {
  id: string;
  message: string;
  priority: Priority;
  createdAt: string;
  delivery: "sent" | "queued" | "failed";
  target: "all" | "staff" | "guests";
}
