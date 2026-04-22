import { Broadcast, DangerZone, Incident, SosReport } from "@/lib/staff/types";

export const firestoreCollections = {
  hotels: "hotels",
  rooms: "rooms",
  guests: "guests",
  sosReports: "sos_reports",
  incidents: "incidents",
  dangerZones: "danger_zones",
  broadcasts: "broadcasts",
} as const;

export type FirestoreCollectionName =
  (typeof firestoreCollections)[keyof typeof firestoreCollections];

export interface HotelDocument {
  id: string;
  name: string;
  address: string;
  floors: number;
  updatedAt: string;
}

export interface RoomDocument {
  id: string;
  hotelId: string;
  roomId: string;
  floor: number;
  status: "vacant" | "occupied" | "evacuated" | "needs_help";
  updatedAt: string;
}

export interface GuestDocument {
  id: string;
  roomId: string;
  floor: number;
  status: "safe" | "needs_help" | "no_response";
  updatedAt: string;
}

export interface SosReportDocument extends SosReport {
  hotelId?: string;
  status: "new" | "triaged" | "clustered";
}

export interface IncidentDocument extends Incident {
  hotelId?: string;
}

export interface DangerZoneDocument extends DangerZone {
  hotelId?: string;
}

export interface BroadcastDocument extends Broadcast {
  hotelId?: string;
  audience: "all" | "staff" | "guests";
}

export const firestoreSchema = {
  collections: {
    hotels: {
      name: firestoreCollections.hotels,
      description: "Hotel master records and metadata.",
    },
    rooms: {
      name: firestoreCollections.rooms,
      description: "Room inventory and evacuation status.",
    },
    guests: {
      name: firestoreCollections.guests,
      description: "Active guest sessions and presence stream.",
    },
    sosReports: {
      name: firestoreCollections.sosReports,
      description: "Incoming distress reports from the guest PWA.",
    },
    incidents: {
      name: firestoreCollections.incidents,
      description: "Synthesized incident clusters for staff operations.",
    },
    dangerZones: {
      name: firestoreCollections.dangerZones,
      description: "Dynamic restricted area overlays for safe-path routing.",
    },
    broadcasts: {
      name: firestoreCollections.broadcasts,
      description: "Push broadcast history and delivery records.",
    },
  },
  listeners: [
    "Guest status stream",
    "Incident feed stream",
    "Danger zone updates stream",
    "Broadcast alerts stream",
  ],
  notes: [
    "Indexes should prioritize hotelId + updatedAt for active streams.",
    "Guest and room listeners should be ordered by updatedAt desc.",
    "Danger zones should be scoped by hotelId and floor for map rendering.",
  ],
};
