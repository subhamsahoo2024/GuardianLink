"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AudioWaveform,
  CheckCircle2,
  Flame,
  Headphones,
  Languages,
  Mic,
  MicOff,
  PanelLeft,
  ShieldHalf,
  Siren,
  TabletSmartphone,
  TriangleAlert,
} from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";
import Badge from "@/app/_components/ui/Badge";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";
import Navbar from "@/app/_components/ui/Navbar";
import StatusPulse from "@/app/_components/ui/StatusPulse";
import {
  BridgeMessage,
  LiveBridgeSession,
  RoomRecord,
  TechnicalOverlayLayer,
  TriageSummary,
} from "@/lib/responder/types";

type OverlayToggle = {
  hydrants: boolean;
  gas: boolean;
  electrical: boolean;
};

type MapClickEvent = { latLng?: { lat: () => number; lng: () => number } };

type MapAdapter = {
  maps: {
    Map: new (
      element: HTMLElement,
      options: {
        center: { lat: number; lng: number };
        zoom: number;
        mapTypeId: string;
        disableDefaultUI: boolean;
        clickableIcons: boolean;
      },
    ) => {
      addListener: (
        event: string,
        handler: (evt: MapClickEvent) => void,
      ) => void;
    };
    Marker: new (options: {
      map: unknown;
      position: { lat: number; lng: number };
      icon?: {
        path: number;
        fillColor: string;
        fillOpacity: number;
        strokeColor: string;
        strokeWeight: number;
        scale: number;
      };
      label?: string;
      title?: string;
    }) => { setMap: (map: null) => void };
    Circle: new (options: {
      map: unknown;
      center: { lat: number; lng: number };
      radius: number;
      fillColor: string;
      fillOpacity: number;
      strokeOpacity: number;
      strokeWeight?: number;
      strokeColor?: string;
    }) => { setMap: (map: null) => void };
    Polyline: new (options: {
      map: unknown;
      path: Array<{ lat: number; lng: number }>;
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
    }) => { setMap: (map: null) => void };
    Polygon: new (options: {
      map: unknown;
      paths: Array<{ lat: number; lng: number }>;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
    }) => { setMap: (map: null) => void };
    SymbolPath: { CIRCLE: number };
  };
};

const responderBypassEnabled =
  process.env.NEXT_PUBLIC_RESPONDER_DEMO_BYPASS !== "false";
const responderPasscode =
  process.env.NEXT_PUBLIC_RESPONDER_DEMO_PASSCODE || "guardian-responder-demo";

function roomStatusVariant(status: RoomRecord["status"]) {
  if (status === "trapped") return "danger" as const;
  if (status === "no_response") return "warning" as const;
  if (status === "evacuated") return "safe" as const;
  return "neutral" as const;
}

function roomStatusLabel(status: RoomRecord["status"]) {
  if (status === "trapped") return "TRAPPED";
  if (status === "no_response") return "NO RESPONSE";
  if (status === "evacuated") return "EVACUATED";
  return "CHECKING";
}

function roomCoordinate(roomId: string, floor: number) {
  const suffix = Number(roomId.slice(1)) || 1;
  const row = Math.floor((suffix - 1) / 4);
  const col = (suffix - 1) % 4;

  return {
    lat: 40.75805 + (floor - 2) * 0.00017 + row * 0.00008,
    lng: -73.98575 + (floor - 2) * 0.00008 + col * 0.00012,
  };
}

export default function ResponderPage() {
  const [authenticated, setAuthenticated] = useState(responderBypassEnabled);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [selectedFloor, setSelectedFloor] = useState(4);
  const [overlayToggles, setOverlayToggles] = useState<OverlayToggle>({
    hydrants: true,
    gas: true,
    electrical: true,
  });

  const [triage, setTriage] = useState<TriageSummary | null>(null);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [layers, setLayers] = useState<TechnicalOverlayLayer[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const [session, setSession] = useState<LiveBridgeSession | null>(null);
  const [messages, setMessages] = useState<BridgeMessage[]>([]);
  const [bridgeText, setBridgeText] = useState("");
  const [guestLanguage, setGuestLanguage] = useState("es");
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [socketState, setSocketState] = useState<
    "disconnected" | "connecting" | "open" | "failed" | "simulated"
  >("disconnected");

  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [mapInitFailed, setMapInitFailed] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const mapObjectsRef = useRef<Array<{ setMap: (map: null) => void }>>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRafRef = useRef<number | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) || null,
    [rooms, selectedRoomId],
  );

  const triageTotal = useMemo(() => {
    if (!triage) return 0;
    return triage.evacuated + triage.missing + triage.checking;
  }, [triage]);

  const refreshTriage = useCallback(async () => {
    const response = await fetch("/api/responder/triage", {
      cache: "no-store",
    });
    const payload = (await response.json()) as { triage?: TriageSummary };
    setTriage(payload.triage || null);
  }, []);

  const refreshRooms = useCallback(async () => {
    const response = await fetch(
      `/api/responder/rooms?floor=${selectedFloor}`,
      {
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as { rooms?: RoomRecord[] };
    const nextRooms = payload.rooms || [];
    setRooms(nextRooms);
    setSelectedRoomId((current) => current || nextRooms[0]?.roomId || "");
  }, [selectedFloor]);

  const refreshOverlays = useCallback(async () => {
    const response = await fetch(
      `/api/responder/overlays?floor=${selectedFloor}`,
      {
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as {
      layers?: TechnicalOverlayLayer[];
    };
    setLayers(payload.layers || []);
  }, [selectedFloor]);

  const refreshBridgeMessages = useCallback(async (sessionId: string) => {
    const response = await fetch(
      `/api/responder/live-session?sessionId=${encodeURIComponent(sessionId)}`,
      {
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as { messages?: BridgeMessage[] };
    setMessages(payload.messages || []);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshTriage(), refreshRooms(), refreshOverlays()]);
  }, [refreshOverlays, refreshRooms, refreshTriage]);

  useEffect(() => {
    if (!authenticated) return;

    queueMicrotask(() => {
      void refreshAll();
    });

    const timer = window.setInterval(() => {
      void refreshAll();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [authenticated, refreshAll]);

  useEffect(() => {
    if (!authenticated || !session) return;

    queueMicrotask(() => {
      void refreshBridgeMessages(session.sessionId);
    });

    const timer = window.setInterval(() => {
      void refreshBridgeMessages(session.sessionId);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [authenticated, refreshBridgeMessages, session]);

  useEffect(() => {
    if (!authenticated || !mapRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    let mounted = true;

    async function initMap() {
      try {
        const loader = new Loader({
          apiKey,
          version: "weekly",
          libraries: ["maps"],
        });

        await loader.load();
        if (!mounted || !mapRef.current) return;

        const g = (window as unknown as { google?: MapAdapter }).google;
        if (!g?.maps) return;

        mapInstanceRef.current = new g.maps.Map(mapRef.current, {
          center: { lat: 40.7582, lng: -73.9855 },
          zoom: 19,
          mapTypeId: "satellite",
          disableDefaultUI: true,
          clickableIcons: false,
        });

        (
          mapInstanceRef.current as {
            addListener: (
              event: string,
              handler: (evt: MapClickEvent) => void,
            ) => void;
          }
        ).addListener("click", (event) => {
          if (!event.latLng) return;
          setMessages((previous) => [
            ...previous,
            {
              id: `local-${Date.now()}`,
              speaker: "system",
              text: `Map ping ${event.latLng.lat().toFixed(5)}, ${event.latLng.lng().toFixed(5)}`,
              createdAt: new Date().toISOString(),
              translated: false,
            },
          ]);
        });
      } catch {
        setMapInitFailed(true);
      }
    }

    void initMap();

    return () => {
      mounted = false;
    };
  }, [authenticated]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const g = (window as unknown as { google?: MapAdapter }).google;
    if (!g?.maps) return;

    mapObjectsRef.current.forEach((shape) => shape.setMap(null));
    mapObjectsRef.current = [];

    rooms.forEach((room) => {
      const coordinate = roomCoordinate(room.roomId, room.floor);
      const marker = new g.maps.Marker({
        map: mapInstanceRef.current,
        position: coordinate,
        label: room.roomId,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          fillColor:
            room.status === "trapped"
              ? "#ef4444"
              : room.status === "no_response"
                ? "#f59e0b"
                : room.status === "evacuated"
                  ? "#10b981"
                  : "#64748b",
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeWeight: 1,
          scale: room.status === "trapped" ? 9 : 7,
        },
        title: `Room ${room.roomId}`,
      });
      mapObjectsRef.current.push(marker);

      if (room.status === "trapped" || room.status === "no_response") {
        const pulse = new g.maps.Circle({
          map: mapInstanceRef.current,
          center: coordinate,
          radius: room.status === "trapped" ? 14 : 11,
          fillColor: room.status === "trapped" ? "#ef4444" : "#f59e0b",
          fillOpacity: 0.2,
          strokeOpacity: 0,
        });
        mapObjectsRef.current.push(pulse);
      }
    });

    layers
      .filter((layer) => overlayToggles[layer.key])
      .forEach((layer) => {
        layer.geoJson.features.forEach((feature) => {
          if (feature.geometry.type === "Point") {
            const marker = new g.maps.Marker({
              map: mapInstanceRef.current,
              position: {
                lng: feature.geometry.coordinates[0],
                lat: feature.geometry.coordinates[1],
              },
              icon: {
                path: g.maps.SymbolPath.CIRCLE,
                fillColor: layer.color,
                fillOpacity: 1,
                strokeColor: "#0f172a",
                strokeWeight: 1,
                scale: 6,
              },
              title: feature.properties.label,
            });
            mapObjectsRef.current.push(marker);
          }

          if (feature.geometry.type === "LineString") {
            const polyline = new g.maps.Polyline({
              map: mapInstanceRef.current,
              path: feature.geometry.coordinates.map(([lng, lat]) => ({
                lat,
                lng,
              })),
              strokeColor: layer.color,
              strokeOpacity: 0.95,
              strokeWeight: 4,
            });
            mapObjectsRef.current.push(polyline);
          }

          if (feature.geometry.type === "Polygon") {
            const polygon = new g.maps.Polygon({
              map: mapInstanceRef.current,
              paths: feature.geometry.coordinates[0].map(([lng, lat]) => ({
                lat,
                lng,
              })),
              fillColor: layer.color,
              fillOpacity: 0.2,
              strokeColor: layer.color,
              strokeOpacity: 0.8,
              strokeWeight: 2,
            });
            mapObjectsRef.current.push(polygon);
          }
        });
      });
  }, [layers, overlayToggles, rooms]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (audioRafRef.current !== null) {
        window.cancelAnimationFrame(audioRafRef.current);
      }
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, []);

  function handleResponderAuth() {
    if (passcodeInput === responderPasscode) {
      setAuthenticated(true);
      setAuthError("");
      return;
    }
    setAuthError("Invalid responder demo passcode.");
  }

  async function startLiveSession(roomId: string) {
    setBridgeBusy(true);
    try {
      setSelectedRoomId(roomId);
      const response = await fetch("/api/responder/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, guestLanguage }),
      });
      const payload = (await response.json()) as {
        session?: LiveBridgeSession;
      };
      if (!payload.session) return;

      setSession(payload.session);
      setSocketState(
        payload.session.status === "simulated" ? "simulated" : "connecting",
      );
      await refreshBridgeMessages(payload.session.sessionId);

      if (payload.session.status === "simulated") {
        return;
      }

      if (socketRef.current) {
        socketRef.current.close();
      }

      const nextSocket = new WebSocket(payload.session.wsUrl);
      socketRef.current = nextSocket;

      nextSocket.onopen = () => {
        setSocketState("open");
        nextSocket.send(
          JSON.stringify({
            type: "responder.handshake",
            sessionId: payload.session?.sessionId,
            roomId,
          }),
        );
      };

      nextSocket.onerror = () => {
        setSocketState("failed");
      };

      nextSocket.onclose = () => {
        setSocketState("disconnected");
      };

      nextSocket.onmessage = (event) => {
        const text =
          typeof event.data === "string" ? event.data : "bridge event";
        setMessages((previous) => [
          ...previous,
          {
            id: `socket-${Date.now()}`,
            speaker: "system",
            text,
            createdAt: new Date().toISOString(),
            translated: false,
          },
        ]);
      };
    } finally {
      setBridgeBusy(false);
    }
  }

  async function toggleAudioBridge() {
    if (recordingAudio) {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;

      if (audioRafRef.current !== null) {
        window.cancelAnimationFrame(audioRafRef.current);
        audioRafRef.current = null;
      }

      setRecordingAudio(false);
      setAudioLevel(0);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const levelData = new Uint8Array(analyser.frequencyBinCount);
    const sampleAudioLevel = () => {
      analyser.getByteFrequencyData(levelData);
      const total = levelData.reduce((sum, value) => sum + value, 0);
      setAudioLevel(Math.min(100, Math.round(total / levelData.length)));
      audioRafRef.current = window.requestAnimationFrame(sampleAudioLevel);
    };
    sampleAudioLevel();

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (event) => {
      if (!session || event.data.size === 0) return;

      const buffer = await event.data.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const binary = Array.from(bytes)
        .map((value) => String.fromCharCode(value))
        .join("");
      const base64 = btoa(binary);

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "audio.chunk",
            sessionId: session.sessionId,
            roomId: session.roomId,
            mimeType: event.data.type || "audio/webm",
            payload: base64,
          }),
        );
      }
    };

    recorder.start(900);
    setRecordingAudio(true);
  }

  async function sendBridgeText() {
    const text = bridgeText.trim();
    if (!session || !text) return;

    setBridgeBusy(true);
    try {
      const response = await fetch("/api/responder/live-session/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          text,
          targetLanguage: guestLanguage,
          sourceLanguage: "en",
        }),
      });

      const payload = (await response.json()) as { messages?: BridgeMessage[] };
      setBridgeText("");
      if (payload.messages && payload.messages.length > 0) {
        setMessages((previous) => [...previous, ...payload.messages]);
      }
    } finally {
      setBridgeBusy(false);
    }
  }

  if (!authenticated) {
    return (
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl space-y-6">
          <Navbar active="responder" compact roomLabel="Responder Bridge" />
          <Card variant="elevated" className="space-y-4">
            <Badge variant="warning" dot pulse>
              Responder authentication required
            </Badge>
            <h1 className="text-2xl font-extrabold text-text-primary">
              Tactical bridge access gate
            </h1>
            <p className="text-sm text-text-secondary">
              Enter the responder passcode to unlock incident operations.
            </p>

            <input
              value={passcodeInput}
              onChange={(event) => setPasscodeInput(event.target.value)}
              type="password"
              placeholder="Enter responder passcode"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none ring-brand/40 transition focus:ring"
            />

            {authError ? (
              <p className="text-sm text-danger-light">{authError}</p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleResponderAuth}>
                Unlock Responder Bridge
              </Button>
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
      <div className="mx-auto max-w-[1200px] space-y-6">
        <Navbar active="responder" compact roomLabel="Responder Bridge" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="warning" dot pulse>
              First Responder Bridge
            </Badge>
            <h1 className="mt-3 text-3xl font-extrabold text-text-primary">
              Tactical tablet operations surface
            </h1>
            <p className="mt-2 max-w-3xl text-text-secondary">
              Technical overlays, multilingual bridge calls, and room-level
              triage in one responder interface.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="warning"
              icon={<Headphones size={16} />}
              loading={bridgeBusy}
              onClick={() => {
                if (selectedRoomId) {
                  void startLiveSession(selectedRoomId);
                }
              }}
            >
              Connect Room
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
            <StatusPulse status="safe" label="Evacuated" />
            <div className="mt-3 text-2xl font-bold text-safe-light">
              {triage?.evacuated ?? 0}
            </div>
            <p className="text-sm text-text-muted">Guests confirmed safe.</p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="danger" label="Missing" />
            <div className="mt-3 text-2xl font-bold text-danger-light">
              {triage?.missing ?? 0}
            </div>
            <p className="text-sm text-text-muted">
              Trapped or no response rooms.
            </p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="warning" label="Checking" />
            <div className="mt-3 text-2xl font-bold text-warning-light">
              {triage?.checking ?? 0}
            </div>
            <p className="text-sm text-text-muted">Rooms under verification.</p>
          </Card>
          <Card variant="glass">
            <StatusPulse status="info" label="Live Sessions" />
            <div className="mt-3 text-2xl font-bold text-brand-light">
              {triage?.activeSessions ?? 0}
            </div>
            <p className="text-sm text-text-muted">
              Active translator bridge links.
            </p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card variant="elevated" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PanelLeft className="text-brand-light" />
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    Technical Floor Plan Overlays
                  </h2>
                  <p className="text-sm text-text-secondary">
                    GeoJSON layers for hydrants, gas mains, and electrical
                    shut-offs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {[2, 3, 4].map((floor) => (
                  <button
                    key={floor}
                    onClick={() => setSelectedFloor(floor)}
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

            <div className="grid gap-3 sm:grid-cols-3">
              {layers.map((layer) => (
                <label
                  key={layer.key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <span className="text-text-secondary">{layer.label}</span>
                  <input
                    type="checkbox"
                    checked={overlayToggles[layer.key]}
                    onChange={(event) =>
                      setOverlayToggles((current) => ({
                        ...current,
                        [layer.key]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-brand"
                  />
                </label>
              ))}
            </div>

            <div className="h-[360px] overflow-hidden rounded-2xl border border-border bg-surface">
              <div ref={mapRef} className="h-full w-full" />
            </div>

            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
              <p className="text-sm text-warning-light">
                Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable live tactical map.
              </p>
            ) : null}
            {mapInitFailed ? (
              <p className="text-sm text-warning-light">
                Map failed to initialize. Check API restrictions and billing.
              </p>
            ) : null}
          </Card>

          <div className="space-y-6">
            <Card variant="glass" className="space-y-3">
              <div className="flex items-center gap-3">
                <ShieldHalf className="text-safe-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Triage Scorecard
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Real-time evacuated vs missing with floor-level breakdown.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  Evacuated
                </div>
                <div className="h-3 rounded-full bg-surface-elevated">
                  <div
                    className="h-3 rounded-full bg-safe"
                    style={{
                      width: `${
                        triageTotal > 0
                          ? Math.round(
                              ((triage?.evacuated || 0) / triageTotal) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="text-sm text-safe-light">
                  {triage?.evacuated ?? 0} / {triageTotal || 0}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  Missing
                </div>
                <div className="h-3 rounded-full bg-surface-elevated">
                  <div
                    className="h-3 rounded-full bg-danger"
                    style={{
                      width: `${
                        triageTotal > 0
                          ? Math.round(
                              ((triage?.missing || 0) / triageTotal) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="text-sm text-danger-light">
                  {triage?.missing ?? 0} / {triageTotal || 0}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  Per-floor breakdown
                </div>
                {triage?.floorBreakdown.map((item) => (
                  <div
                    key={item.floor}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-text-secondary">
                      Floor {item.floor}
                    </span>
                    <span className="text-text-primary">
                      {item.evacuated} safe / {item.missing} missing /{" "}
                      {item.checking} checking
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="glass" className="space-y-3">
              <div className="flex items-center gap-3">
                <AudioWaveform className="text-warning-light" />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Gemini Live Translator Bridge
                  </h2>
                  <p className="text-sm text-text-secondary">
                    WebSocket session + two-way audio stream + translated text
                    relay.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    socketState === "open"
                      ? "safe"
                      : socketState === "simulated"
                        ? "info"
                        : socketState === "failed"
                          ? "danger"
                          : "warning"
                  }
                >
                  {socketState.toUpperCase()}
                </Badge>
                <select
                  value={guestLanguage}
                  onChange={(event) => setGuestLanguage(event.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary"
                >
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <input
                  value={bridgeText}
                  onChange={(event) => setBridgeText(event.target.value)}
                  placeholder="Type responder message to translate"
                  className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                />
                <Button
                  variant="primary"
                  icon={<Languages size={16} />}
                  loading={bridgeBusy}
                  onClick={() => {
                    void sendBridgeText();
                  }}
                >
                  Translate
                </Button>
                <Button
                  variant={recordingAudio ? "danger" : "warning"}
                  icon={
                    recordingAudio ? <MicOff size={16} /> : <Mic size={16} />
                  }
                  onClick={() => {
                    void toggleAudioBridge();
                  }}
                >
                  {recordingAudio ? "Stop" : "Mic"}
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-surface px-3 py-3 text-xs text-text-muted">
                Audio input level
                <div className="mt-2 h-2 rounded-full bg-surface-elevated">
                  <div
                    className="h-2 rounded-full bg-warning"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>

              <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-lg border border-border px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-text-primary">
                        {message.speaker.toUpperCase()}
                      </span>
                      {message.translated ? (
                        <Badge variant="info">translated</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-text-secondary">
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card variant="elevated" className="space-y-4">
          <div className="flex items-center gap-3">
            <TabletSmartphone className="text-brand-light" />
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Room-by-Room Status Grid
              </h2>
              <p className="text-sm text-text-secondary">
                Tap a room to prioritize contact and launch live bridge
                connections.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
              <button
                key={room.roomId}
                onClick={() => {
                  setSelectedRoomId(room.roomId);
                  if (
                    room.status === "trapped" ||
                    room.status === "no_response"
                  ) {
                    void startLiveSession(room.roomId);
                  }
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedRoomId === room.roomId
                    ? "border-brand/40 bg-brand/10"
                    : "border-border bg-surface hover:border-brand/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">
                      Room {room.roomId}
                    </div>
                    <div className="text-xs text-text-muted">
                      Floor {room.floor}
                    </div>
                  </div>
                  <Badge variant={roomStatusVariant(room.status)}>
                    {roomStatusLabel(room.status)}
                  </Badge>
                </div>

                <div className="mt-2 text-xs text-text-secondary">
                  Occupants: {room.occupantCount}
                </div>

                {room.sos ? (
                  <div className="mt-2 rounded-lg border border-border bg-surface-elevated p-2 text-xs text-text-secondary">
                    <div className="font-semibold text-danger-light">SOS</div>
                    <div className="mt-1 line-clamp-2">{room.sos.text}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-text-muted">
                    No active SOS signal
                  </div>
                )}

                {(room.status === "trapped" ||
                  room.status === "no_response") && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-warning-light">
                    <Siren size={12} /> Click to connect
                  </div>
                )}
              </button>
            ))}
          </div>

          {selectedRoom ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
              Active room focus:{" "}
              <span className="font-semibold text-text-primary">
                {selectedRoom.roomId}
              </span>{" "}
              {selectedRoom.status === "trapped" ? (
                <span className="ml-2 inline-flex items-center gap-1 text-danger-light">
                  <TriangleAlert size={14} /> Immediate intervention required
                </span>
              ) : selectedRoom.status === "evacuated" ? (
                <span className="ml-2 inline-flex items-center gap-1 text-safe-light">
                  <CheckCircle2 size={14} /> Verified safe
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center gap-1 text-warning-light">
                  <Flame size={14} /> Pending confirmation
                </span>
              )}
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
