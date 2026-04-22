import { translateMessage } from "@/lib/gemini";
import { listGuests, listReports } from "@/lib/staff/store";
import {
  BridgeMessage,
  LiveBridgeSession,
  RoomRecord,
  RoomStatus,
  TechnicalOverlayLayer,
  TriageSummary,
} from "@/lib/responder/types";

const floorList = [2, 3, 4];

const nowIso = () => new Date().toISOString();

const sessions: LiveBridgeSession[] = [];
const sessionMessages = new Map<string, BridgeMessage[]>();

function roomTemplate(): Array<{ roomId: string; floor: number }> {
  const result: Array<{ roomId: string; floor: number }> = [];

  floorList.forEach((floor) => {
    for (let index = 1; index <= 12; index += 1) {
      const suffix = index.toString().padStart(2, "0");
      result.push({ roomId: `${floor}${suffix}`, floor });
    }
  });

  return result;
}

function statusFromGuest(
  status: "safe" | "needs_help" | "no_response" | undefined,
): RoomStatus {
  if (status === "safe") return "evacuated";
  if (status === "needs_help") return "trapped";
  if (status === "no_response") return "no_response";
  return "checking";
}

function signalFromStatus(status: RoomStatus): "low" | "medium" | "high" {
  if (status === "trapped") return "high";
  if (status === "no_response") return "medium";
  return "low";
}

export function listResponderRooms(): RoomRecord[] {
  const guests = listGuests();
  const reports = listReports();

  return roomTemplate().map((template) => {
    const guest = guests.find((item) => item.roomId === template.roomId);
    const latestReport = reports
      .filter((item) => item.roomId === template.roomId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

    const status = statusFromGuest(guest?.status);

    return {
      roomId: template.roomId,
      floor: template.floor,
      status,
      occupantCount: guest ? 1 : 0,
      signalStrength: signalFromStatus(status),
      sos: latestReport
        ? {
            text: latestReport.text,
            createdAt: latestReport.createdAt,
          }
        : null,
    };
  });
}

export function buildTriageSummary(): TriageSummary {
  const rooms = listResponderRooms();

  const evacuated = rooms.filter((room) => room.status === "evacuated").length;
  const missing = rooms.filter(
    (room) => room.status === "trapped" || room.status === "no_response",
  ).length;
  const checking = rooms.filter((room) => room.status === "checking").length;

  const floorBreakdown = floorList.map((floor) => {
    const floorRooms = rooms.filter((room) => room.floor === floor);
    return {
      floor,
      evacuated: floorRooms.filter((room) => room.status === "evacuated")
        .length,
      missing: floorRooms.filter(
        (room) => room.status === "trapped" || room.status === "no_response",
      ).length,
      checking: floorRooms.filter((room) => room.status === "checking").length,
    };
  });

  return {
    evacuated,
    missing,
    checking,
    activeSessions: sessions.length,
    floorBreakdown,
  };
}

function pointFeature(
  id: string,
  label: string,
  floor: number,
  lng: number,
  lat: number,
) {
  return {
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [lng, lat] as [number, number],
    },
    properties: {
      id,
      label,
      floor,
    },
  };
}

function lineFeature(
  id: string,
  label: string,
  floor: number,
  coordinates: [number, number][],
) {
  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
    properties: {
      id,
      label,
      floor,
    },
  };
}

function offsetForFloor(floor: number) {
  return {
    lat: 40.75805 + (floor - 2) * 0.00017,
    lng: -73.98575 + (floor - 2) * 0.00008,
  };
}

export function listTechnicalLayers(floor: number): TechnicalOverlayLayer[] {
  const offset = offsetForFloor(floor);

  return [
    {
      key: "hydrants",
      label: "Fire hydrants",
      color: "#38bdf8",
      floor,
      geoJson: {
        type: "FeatureCollection",
        features: [
          pointFeature(
            `hy-${floor}-1`,
            `Hydrant Alpha F${floor}`,
            floor,
            offset.lng,
            offset.lat,
          ),
          pointFeature(
            `hy-${floor}-2`,
            `Hydrant Bravo F${floor}`,
            floor,
            offset.lng + 0.00031,
            offset.lat + 0.00009,
          ),
        ],
      },
    },
    {
      key: "gas",
      label: "Gas lines",
      color: "#fb923c",
      floor,
      geoJson: {
        type: "FeatureCollection",
        features: [
          lineFeature(`gas-${floor}-1`, `Gas Main F${floor}`, floor, [
            [offset.lng - 0.0001, offset.lat - 0.00005],
            [offset.lng + 0.0002, offset.lat + 0.00002],
            [offset.lng + 0.0004, offset.lat + 0.00012],
          ]),
        ],
      },
    },
    {
      key: "electrical",
      label: "Electrical shut-offs",
      color: "#facc15",
      floor,
      geoJson: {
        type: "FeatureCollection",
        features: [
          pointFeature(
            `el-${floor}-1`,
            `Panel E-${floor}A`,
            floor,
            offset.lng + 0.00008,
            offset.lat + 0.00021,
          ),
          pointFeature(
            `el-${floor}-2`,
            `Panel E-${floor}B`,
            floor,
            offset.lng + 0.00035,
            offset.lat - 0.00002,
          ),
        ],
      },
    },
  ];
}

export function createLiveSession(input: {
  roomId: string;
  guestLanguage?: string;
}): LiveBridgeSession {
  const wsUrl =
    process.env.GEMINI_LIVE_WS_URL ||
    process.env.NEXT_PUBLIC_GEMINI_LIVE_WS_URL ||
    "wss://echo.websocket.events";

  const hasLiveApiKey = Boolean(process.env.GOOGLE_GEMINI_LIVE_API_KEY);

  const session: LiveBridgeSession = {
    sessionId: `bridge-${Date.now()}`,
    roomId: input.roomId,
    guestLanguage: input.guestLanguage || "es",
    provider: hasLiveApiKey ? "gemini-live" : "simulated",
    wsUrl,
    status: hasLiveApiKey ? "connecting" : "simulated",
    createdAt: nowIso(),
  };

  sessions.unshift(session);
  sessionMessages.set(session.sessionId, [
    {
      id: `msg-${Date.now()}`,
      speaker: "system",
      text: hasLiveApiKey
        ? "Gemini Live session created. Waiting for socket handshake."
        : "Simulated bridge mode: configure GOOGLE_GEMINI_LIVE_API_KEY for live mode.",
      createdAt: nowIso(),
      translated: false,
    },
  ]);

  return session;
}

export function listLiveSessions() {
  return sessions;
}

export function getSessionMessages(sessionId: string): BridgeMessage[] {
  return sessionMessages.get(sessionId) || [];
}

export function pushSessionMessage(
  sessionId: string,
  message: Omit<BridgeMessage, "id" | "createdAt">,
): BridgeMessage {
  const nextMessage: BridgeMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    createdAt: nowIso(),
    ...message,
  };

  const current = sessionMessages.get(sessionId) || [];
  sessionMessages.set(sessionId, [...current, nextMessage]);
  return nextMessage;
}

export async function translateBridgeText(
  text: string,
  targetLanguage: string,
): Promise<{ translatedText: string; ai: boolean }> {
  try {
    const translatedText = await translateMessage(text, targetLanguage);
    return { translatedText, ai: true };
  } catch {
    return { translatedText: text, ai: false };
  }
}
