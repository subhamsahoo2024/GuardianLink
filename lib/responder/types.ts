export type RoomStatus = "evacuated" | "trapped" | "no_response" | "checking";

export interface RoomSOSSignal {
  text: string;
  createdAt: string;
}

export interface RoomRecord {
  roomId: string;
  floor: number;
  status: RoomStatus;
  occupantCount: number;
  signalStrength: "low" | "medium" | "high";
  sos: RoomSOSSignal | null;
}

export interface FloorTriageBreakdown {
  floor: number;
  evacuated: number;
  missing: number;
  checking: number;
}

export interface TriageSummary {
  evacuated: number;
  missing: number;
  checking: number;
  activeSessions: number;
  floorBreakdown: FloorTriageBreakdown[];
}

export type GeoJsonGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Polygon"; coordinates: [Array<[number, number]>] };

export interface GeoJsonFeature {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: {
    id: string;
    label: string;
    floor: number;
  };
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface TechnicalOverlayLayer {
  key: "hydrants" | "gas" | "electrical";
  label: string;
  color: string;
  floor: number;
  geoJson: GeoJsonFeatureCollection;
}

export interface BridgeMessage {
  id: string;
  speaker: "responder" | "guest" | "system";
  text: string;
  createdAt: string;
  translated: boolean;
}

export interface LiveBridgeSession {
  sessionId: string;
  roomId: string;
  guestLanguage: string;
  provider: "gemini-live" | "simulated";
  wsUrl: string;
  status: "connecting" | "active" | "simulated";
  createdAt: string;
}
