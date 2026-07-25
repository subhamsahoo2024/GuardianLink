"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2,
  Compass,
  Mic,
  Send,
  Users,
  Volume2,
  Phone,
  RefreshCw,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Flame,
  VolumeX,
} from "lucide-react";
import { RoomRecord, RoomStatus, BridgeMessage, LiveBridgeSession } from "@/lib/responder/types";
import { DangerZone } from "@/lib/staff/types";

// Dynamically import map subcomponent to prevent SSR compiling issues
const MobileResponderMap = dynamic(() => import("./MobileResponderMap"), {
  ssr: false,
});

const LANGUAGES = [
  { code: "es", label: "Spanish (Español)" },
  { code: "vi", label: "Vietnamese (Tiếng Việt)" },
  { code: "zh", label: "Mandarin (中文)" },
  { code: "fr", label: "French (Français)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "ko", label: "Korean (한국어)" },
];

const MOCK_GUEST_DIALOGUES: Record<string, Array<{ guest: string; english: string }>> = {
  default: [
    { guest: "Entendido, nos quedaremos aquí esperando instrucciones.", english: "Understood, we will stay here waiting for instructions." },
    { guest: "Gracias, por favor dense prisa. El aire se está volviendo difícil de respirar.", english: "Thank you, please hurry. The air is getting hard to breathe." },
    { guest: "Estamos listos para salir cuando nos digan.", english: "We are ready to leave when you tell us." }
  ],
  "402": [
    { guest: "El humo está entrando por debajo de la puerta de la escalera.", english: "Smoke is coming in under the stairwell door." },
    { guest: "Somos dos adultos y un niño en la habitación 402.", english: "We are two adults and one child in room 402." },
    { guest: "Pusimos toallas mojadas en la puerta, pero el humo sigue filtrándose.", english: "We put wet towels at the door, but smoke is still leaking in." }
  ],
  "410": [
    { guest: "Huele muy fuerte a gas en el pasillo, tenemos miedo de una chispa.", english: "It smells very strongly of gas in the hallway, we are afraid of a spark." },
    { guest: "Estamos en el cuarto piso, habitación 410. ¿Deberíamos abrir las ventanas?", english: "We are on the fourth floor, room 410. Should we open the windows?" },
    { guest: "No escuchamos a nadie afuera. Las alarmas siguen sonando.", english: "We don't hear anyone outside. The alarms are still ringing." }
  ],
  "305": [
    { guest: "Vemos chispas en el cuarto de servicio de enfrente. Hay agua en el suelo.", english: "We see sparks in the utility room across. There is water on the floor." },
    { guest: "El nivel de agua está subiendo lentamente. Habitación 305.", english: "The water level is rising slowly. Room 305." },
    { guest: "El pasillo está inundado. No podemos cruzar hacia las escaleras.", english: "The hallway is flooded. We cannot cross to the stairs." }
  ]
};

const demoBypassEnabled = process.env.NEXT_PUBLIC_RESPONDER_DEMO_BYPASS !== "false";
const demoPasscode = process.env.NEXT_PUBLIC_RESPONDER_DEMO_PASSCODE || "guardian-responder-demo";

export default function MobileTacticalHub() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(demoBypassEnabled);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Bottom Navigation tabs (Map | Triage | Comms)
  const [activeTab, setActiveTab] = useState<"map" | "triage" | "comms">("map");

  // Core data states
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [selectedFloor, setSelectedFloor] = useState<number>(4);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tactical layer states
  const [mapLayers, setMapLayers] = useState({
    gas: true,
    water: true,
    electrical: true,
    hazardZones: true,
    safePaths: true,
  });

  // Comms session states
  const [activeSession, setActiveSession] = useState<LiveBridgeSession | null>(null);
  const [messages, setMessages] = useState<BridgeMessage[]>([]);
  const [guestLanguage, setGuestLanguage] = useState("es");
  const [responderText, setResponderText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isHoldingPtt, setIsHoldingPtt] = useState(false);
  const [pttHoldTime, setPttHoldTime] = useState(0);

  // Simulation index pointers
  const [dialogueIndices, setDialogueIndices] = useState<Record<string, number>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const pttTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load backend store data
  const fetchData = async (showProgress = false) => {
    if (showProgress) setRefreshing(true);
    try {
      // 1. Fetch Rooms
      const roomsRes = await fetch("/api/responder/rooms");
      const roomsData = await roomsRes.json();
      setRooms(roomsData.rooms || []);

      // 2. Fetch Danger Zones
      const zonesRes = await fetch("/api/danger-zones");
      const zonesData = await zonesRes.json();
      setDangerZones(zonesData.dangerZones || []);

    } catch (e) {
      console.error("Mobile Hub fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 4500);

    return () => clearInterval(interval);
  }, [authenticated]);

  const handleAuthSubmit = () => {
    if (passcodeInput === demoPasscode) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect system passcode. Access denied.");
    }
  };

  // Fetch session message transcripts
  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/responder/live-session?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Error loading bridge transcripts:", e);
    }
  };

  // Bind or join live communication link
  const handleLinkComms = async (roomId: string, switchView = true) => {
    try {
      const listRes = await fetch("/api/responder/live-session");
      const listData = await listRes.json();
      const existing = (listData.sessions || []).find(
        (s: LiveBridgeSession) => s.roomId === roomId
      );

      if (existing) {
        setActiveSession(existing);
        setGuestLanguage(existing.guestLanguage || "es");
        await fetchSessionMessages(existing.sessionId);
      } else {
        // Create new session via API POST
        const createRes = await fetch("/api/responder/live-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, guestLanguage }),
        });
        const createData = await createRes.json();
        if (createData.session) {
          setActiveSession(createData.session);
          setMessages([
            {
              id: "system-1",
              speaker: "system",
              text: `Bridge connection established with Room ${roomId} (${LANGUAGES.find(l => l.code === guestLanguage)?.label || "Spanish"})`,
              createdAt: new Date().toISOString(),
              translated: false,
            }
          ]);
        }
      }

      if (switchView) {
        setActiveTab("comms");
      }
    } catch (error) {
      console.error("Failed to link comms:", error);
    }
  };

  // Switch active room target and match floor
  const handleSelectRoom = (roomId: string, switchView = true) => {
    setSelectedRoomId(roomId);
    
    const room = rooms.find(r => r.roomId === roomId);
    if (room) {
      setSelectedFloor(room.floor);
      handleLinkComms(roomId, switchView);
    }
  };

  // Update room status via PATCH REST call
  const handleUpdateStatus = async (roomId: string, status: RoomStatus) => {
    try {
      const res = await fetch("/api/responder/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, status }),
      });
      const data = await res.json();
      
      if (data.ok) {
        // Optimistic local state update
        setRooms(prev =>
          prev.map(r => (r.roomId === roomId ? { ...r, status } : r))
        );
        fetchData();
      }
    } catch (e) {
      console.error("Failed updating room status:", e);
    }
  };

  // Scroll messages feed
  useEffect(() => {
    if (activeTab === "comms") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Submit and translate messages
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || responderText).trim();
    if (!textToSend || !activeSession) return;

    setSendingMessage(true);
    if (!customText) setResponderText("");

    try {
      const res = await fetch("/api/responder/live-session/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          text: textToSend,
          targetLanguage: guestLanguage,
        }),
      });
      const data = await res.json();
      
      if (data.messages) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== "system-1" && m.id !== "empty-prompt");
          return [...filtered, ...data.messages];
        });

        // Trigger guest reply loop
        simulateGuestReply();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Dialogue simulations matching distress parameters
  const simulateGuestReply = () => {
    if (!selectedRoomId || !activeSession) return;

    setTimeout(() => {
      const roomKey = MOCK_GUEST_DIALOGUES[selectedRoomId] ? selectedRoomId : "default";
      const dialogues = MOCK_GUEST_DIALOGUES[roomKey];
      const index = dialogueIndices[selectedRoomId] || 0;
      const response = dialogues[index % dialogues.length];

      setDialogueIndices(prev => ({
        ...prev,
        [selectedRoomId]: index + 1
      }));

      // Append simulated guest translation logs
      setMessages(prev => [
        ...prev,
        {
          id: `sim-guest-${Date.now()}`,
          speaker: "guest",
          text: response.guest,
          createdAt: new Date().toISOString(),
          translated: false,
        },
        {
          id: `sim-trans-${Date.now()}`,
          speaker: "system",
          text: `[EN TRANSLATION] ${response.english}`,
          createdAt: new Date().toISOString(),
          translated: true,
        }
      ]);
    }, 1800);
  };

  // Microphone PTT triggers
  const handlePttStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsHoldingPtt(true);
    setPttHoldTime(0);

    pttTimerRef.current = setInterval(() => {
      setPttHoldTime(p => p + 1);
    }, 100);
  };

  const handlePttEnd = () => {
    setIsHoldingPtt(false);
    if (pttTimerRef.current) {
      clearInterval(pttTimerRef.current);
    }

    if (pttHoldTime > 5 && selectedRoomId) {
      const room = rooms.find(r => r.roomId === selectedRoomId);
      let pttText = "Commander Audio Broadcast: Maintain absolute position, rescue teams have been dispatched.";
      
      if (room?.status === "trapped") {
        pttText = "Crisis command note: Evacuation path is blocked by flame. Remain inside and seal entry door cracks.";
      } else if (room?.status === "checking") {
        pttText = "Crisis command request: Verify if all building occupants are ready for exit.";
      } else if (room?.status === "evacuated") {
        pttText = "Crisis command directive: Remain outside building boundary at assembly sector alpha.";
      }

      handleSendMessage(pttText);
    }
  };

  // Rooms list filtered by currently active map floor level
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => room.floor === selectedFloor);
  }, [rooms, selectedFloor]);

  if (!mounted) return null;

  if (!authenticated) {
    return (
      <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-slate-950 px-6 text-white font-sans select-none">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-black tracking-widest text-slate-200 uppercase font-mono">
              TACTICAL COM BRIDGE
            </h1>
            <p className="mt-1 text-xs text-slate-500">Authorize responder passcode for field access.</p>
          </div>
          <div className="space-y-4 p-5 bg-slate-900/40 border border-slate-900 rounded-2xl">
            <input
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              type="password"
              placeholder="Passcode Required"
              className="w-full h-12 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none focus:border-slate-800"
              onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
            />
            {authError && <p className="text-xs text-rose-500 font-mono">{authError}</p>}
            <button
              onClick={handleAuthSubmit}
              className="w-full h-12 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/60 text-xs font-mono font-bold rounded-xl text-cyan-400 transition"
            >
              UNLOCK HUB
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-slate-950 text-slate-100 select-none select-none font-sans">
      
      {/* 1. Top Mini-Header (h-12) */}
      <header className="h-12 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-3.5 z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-black tracking-[0.2em] font-mono text-slate-300">
            {selectedRoomId ? `TARGET: RM ${selectedRoomId}` : "AWAITING TARGET"}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedRoomId && (
            (() => {
              const r = rooms.find(item => item.roomId === selectedRoomId);
              let color = "text-slate-400 bg-slate-900 border-slate-800";
              if (r?.status === "evacuated") color = "text-emerald-400 bg-emerald-950/40 border-emerald-900";
              if (r?.status === "trapped") color = "text-rose-400 bg-rose-950/40 border-rose-900 animate-pulse";
              if (r?.status === "no_response") color = "text-amber-500 bg-amber-950/40 border-amber-900";

              return (
                <span className={`text-[8px] uppercase tracking-wide font-black px-1.5 py-0.5 rounded border ${color}`}>
                  {r?.status.replace("_", " ")}
                </span>
              );
            })()
          )}

          <button
            onClick={() => router.push("/responder/desktop")}
            className="h-7 px-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded text-[9px] font-mono font-bold text-slate-300 flex items-center gap-1 transition"
          >
            <Monitor className="h-3 w-3" />
            DESKTOP
          </button>
        </div>
      </header>

      {/* 2. Main Scrollable Tab Panels */}
      <div className="flex-grow w-full relative bg-slate-950 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
            <span className="text-[9px] font-mono tracking-widest text-cyan-400 mt-2">ESTABLISHING LINK...</span>
          </div>
        )}

        {/* Tab 1: Tactical Map Panel */}
        {activeTab === "map" && (
          <div className="w-full h-full relative overflow-hidden flex flex-col">
            <div className="flex-grow relative">
              <MobileResponderMap
                floor={selectedFloor}
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={(roomId) => handleSelectRoom(roomId, true)}
                dangerZones={dangerZones}
                layerToggles={{
                  gas: mapLayers.gas,
                  water: mapLayers.water,
                  electrical: mapLayers.electrical,
                  hazardZones: mapLayers.hazardZones,
                  safePaths: mapLayers.safePaths,
                }}
              />

              {/* Floating top selector pill for active floor level */}
              <div className="absolute top-2.5 right-2.5 z-[400] flex bg-slate-950/90 border border-slate-900 p-0.5 rounded-lg gap-0.5 shadow-lg">
                {[2, 3, 4].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setSelectedFloor(fl)}
                    className={`h-7 px-2.5 text-[10px] font-mono font-black rounded transition-all ${
                      selectedFloor === fl
                        ? "bg-cyan-950 text-cyan-400 border border-cyan-800/80 shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    L{fl}
                  </button>
                ))}
              </div>

              {/* Floating bottom-right controls panel to toggle map hazard layers */}
              <div className="absolute bottom-2.5 right-2.5 z-[400] bg-slate-950/95 border border-slate-900 p-2 rounded-lg flex flex-col gap-1.5 shadow-xl min-w-[110px]">
                <span className="text-[8px] text-slate-500 font-mono tracking-wider font-bold border-b border-slate-900 pb-0.5 mb-0.5">
                  OVERLAYS
                </span>
                
                <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={mapLayers.gas}
                    onChange={(e) => setMapLayers(p => ({ ...p, gas: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 h-3 w-3"
                  />
                  <span>Gas</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={mapLayers.water}
                    onChange={(e) => setMapLayers(p => ({ ...p, water: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 h-3 w-3"
                  />
                  <span>Water</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={mapLayers.electrical}
                    onChange={(e) => setMapLayers(p => ({ ...p, electrical: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 h-3 w-3"
                  />
                  <span>Electric</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={mapLayers.hazardZones}
                    onChange={(e) => setMapLayers(p => ({ ...p, hazardZones: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 h-3 w-3"
                  />
                  <span className="text-red-400">Hazards</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Triage Grid Panel */}
        {activeTab === "triage" && (
          <div className="w-full h-full flex flex-col bg-slate-950">
            {/* Top floor display banner */}
            <div className="bg-slate-950 border-b border-slate-900 px-4 py-2 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                ACTIVE PLAN: LEVEL {selectedFloor} ROOMS
              </span>
              
              <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded gap-0.5">
                {[2, 3, 4].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setSelectedFloor(fl)}
                    className={`h-6 px-2 text-[9px] font-mono font-bold rounded ${
                      selectedFloor === fl ? "bg-slate-800 text-cyan-400" : "text-slate-500"
                    }`}
                  >
                    L{fl}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable list area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {filteredRooms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-[10px]">
                  <span>NO DATA REGISTERED FOR LEVEL {selectedFloor}</span>
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isTarget = selectedRoomId === room.roomId;
                  
                  let borderStyle = "border-slate-900 bg-slate-950/40";
                  let statusLabel = "Checking";
                  let statusColor = "text-slate-400 bg-slate-900 border-slate-800";

                  if (room.status === "evacuated") {
                    borderStyle = isTarget ? "border-emerald-500 bg-emerald-950/5" : "border-emerald-950/30 bg-emerald-950/5";
                    statusLabel = "Evacuated";
                    statusColor = "text-emerald-400 bg-emerald-950/30 border-emerald-900/50";
                  } else if (room.status === "trapped") {
                    borderStyle = isTarget ? "border-rose-500 bg-rose-950/5" : "border-rose-950/30 bg-rose-950/5";
                    statusLabel = "Trapped";
                    statusColor = "text-rose-400 bg-rose-950/30 border-rose-900/50";
                  } else if (room.status === "no_response") {
                    borderStyle = isTarget ? "border-amber-500 bg-amber-950/5" : "border-amber-950/30 bg-amber-950/5";
                    statusLabel = "No Response";
                    statusColor = "text-amber-400 bg-amber-950/30 border-amber-900/50";
                  }

                  if (isTarget && room.status !== "evacuated" && room.status !== "trapped" && room.status !== "no_response") {
                    borderStyle = "border-cyan-500 bg-cyan-950/5";
                  }

                  return (
                    <div
                      key={room.roomId}
                      onClick={() => handleSelectRoom(room.roomId, false)}
                      className={`p-3.5 rounded-lg border transition duration-150 cursor-pointer ${borderStyle}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-200">ROOM {room.roomId}</span>
                        <span className={`text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 border rounded ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span>Occupants: <strong className="text-slate-200">{room.occupantCount}</strong></span>
                        </div>
                        <span>Signal: {room.signalStrength.toUpperCase()}</span>
                      </div>

                      {room.sos && (
                        <div className="mt-2.5 p-2 bg-slate-900 border border-slate-900 rounded text-[10px] text-rose-300 font-mono leading-relaxed">
                          <span className="font-bold text-rose-500 uppercase mr-1">[SOS ALERT]:</span>
                          &quot;{room.sos.text}&quot;
                        </div>
                      )}

                      {/* Large, thumb-friendly action buttons (minimum height 48px / h-12) */}
                      <div className="mt-3.5 pt-3 border-t border-slate-900 flex gap-2 w-full">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(room.roomId, "evacuated");
                          }}
                          className="flex-1 h-11 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-[10px] font-mono font-bold text-emerald-400 rounded-lg transition uppercase tracking-wider active:scale-[0.98]"
                        >
                          MARK CLEARED
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(room.roomId, "trapped");
                          }}
                          className="flex-1 h-11 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-[10px] font-mono font-bold text-rose-400 rounded-lg transition uppercase tracking-wider active:scale-[0.98]"
                        >
                          NEEDS RESCUE
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRoom(room.roomId, true);
                          }}
                          className="h-11 px-3 bg-slate-900 border border-slate-800 text-[10px] font-mono font-bold text-cyan-400 rounded-lg transition uppercase"
                        >
                          Comms
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Translator Bridge Walkie-Talkie Panel */}
        {activeTab === "comms" && (
          <div className="w-full h-full flex flex-col bg-slate-950 relative overflow-hidden">
            {!selectedRoomId ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 font-mono text-[10px]">
                <VolumeX className="h-7 w-7 text-slate-700 mb-2.5 animate-pulse" />
                <span>NO COM TARGET SECURED</span>
                <p className="text-[9px] text-slate-700 mt-2 max-w-[180px] leading-relaxed">
                  Select a room in the map or triage panel first to bind translation.
                </p>
              </div>
            ) : !activeSession ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 font-mono text-[10px]">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-500 mb-2.5" />
                <span>NEGOTIATING COM CHANNEL...</span>
                <button
                  onClick={() => handleLinkComms(selectedRoomId, true)}
                  className="mt-4 h-10 px-4 bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold text-cyan-400 rounded-lg transition"
                >
                  ESTABLISH LINK
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col overflow-hidden relative">
                
                {/* Micro selector for guest target language */}
                <div className="p-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between flex-shrink-0">
                  <span className="text-[9px] text-slate-500 font-mono font-bold">TRANSLATE GUEST TO:</span>
                  <select
                    value={guestLanguage}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setGuestLanguage(newLang);
                      handleLinkComms(selectedRoomId, true);
                    }}
                    className="h-8 max-w-[130px] bg-slate-900 border border-slate-800 rounded px-1 text-[9px] font-mono text-slate-300 focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Translation Feed Transcript */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3.5 pb-36">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-600 font-mono text-[9px]">
                      AWAITING FIRST-RESPONDER TRANSMISSION
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      if (msg.speaker === "system" && !msg.translated) {
                        return (
                          <div key={msg.id} className="text-center">
                            <span className="inline-block px-2.5 py-1 bg-slate-900 border border-slate-900 text-[8px] font-mono text-slate-500 rounded">
                              {msg.text.toUpperCase()}
                            </span>
                          </div>
                        );
                      }

                      if (msg.translated) {
                        return null; // Skip rendering standalone translations (grouped inline instead)
                      }

                      const isResponder = msg.speaker === "responder";
                      
                      // Look ahead to find matching translation
                      let translationMsg: BridgeMessage | undefined = undefined;
                      for (let i = index + 1; i < messages.length; i++) {
                        const nextMsg = messages[i];
                        if (!nextMsg.translated) break;
                        
                        if (isResponder) {
                          if (nextMsg.speaker === "guest" && nextMsg.translated) {
                            translationMsg = nextMsg;
                            break;
                          }
                        } else {
                          if ((nextMsg.speaker === "system" || nextMsg.speaker === "responder") && nextMsg.translated) {
                            translationMsg = nextMsg;
                            break;
                          }
                        }
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col gap-1 max-w-[85%] ${
                            isResponder ? "ml-auto items-end" : "mr-auto items-start"
                          }`}
                        >
                          <span className="text-[8px] text-slate-500 font-mono uppercase tracking-wider font-bold">
                            {isResponder ? "COMMAND HUD" : `GUEST (${guestLanguage.toUpperCase()})`}
                          </span>

                          <div
                            className={`px-3 py-2 rounded-lg border text-[11px] leading-relaxed transition-all ${
                              isResponder
                                ? "bg-slate-900 border-slate-800 text-slate-200"
                                : "bg-slate-950 border-slate-900 text-slate-200"
                            }`}
                          >
                            <p className={isResponder ? "text-slate-200" : "text-slate-300 font-mono italic"}>
                              {isResponder ? msg.text : `"${msg.text}"`}
                            </p>

                            {translationMsg && (
                              <div className="mt-1 pt-1.5 border-t border-slate-900/60 text-[10px]">
                                <span className="text-[8px] font-mono text-cyan-400 block uppercase font-bold tracking-tight mb-0.5">
                                  {isResponder ? `[${guestLanguage.toUpperCase()} TRANSLATION]` : "[ENG TRANSLATION]"}
                                </span>
                                <p className="font-semibold text-slate-300">
                                  {translationMsg.text.startsWith("[EN TRANSLATION] ")
                                    ? translationMsg.text.substring(17)
                                    : translationMsg.text}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Simulated PTT Waveform Overlay */}
                {isHoldingPtt && (
                  <div className="absolute bottom-[115px] inset-x-0 bg-slate-950/95 border-y border-slate-900/60 py-4 flex flex-col items-center justify-center gap-2 z-10 animate-fade-in backdrop-blur-md">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-[0.2em] animate-pulse">
                      AUDIO CHANNEL ACTIVE
                    </span>
                    <div className="flex items-end gap-1.5 h-7 mt-1.5">
                      <div className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s", height: "80%" }} />
                      <div className="w-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s", height: "100%" }} />
                      <div className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s", height: "45%" }} />
                      <div className="w-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.5s", height: "90%" }} />
                      <div className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s", height: "60%" }} />
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono">
                      Release to transcribe ({(pttHoldTime / 10).toFixed(1)}s)
                    </span>
                  </div>
                )}

                {/* Bottom absolute translator controls (PTT + Send Input) */}
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-900 p-2.5 space-y-2.5">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      disabled={sendingMessage}
                      placeholder="Send message to guest..."
                      value={responderText}
                      onChange={(e) => setResponderText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSendMessage();
                      }}
                      className="w-full h-11 bg-slate-900/80 border border-slate-850 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-800"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!responderText.trim() || sendingMessage}
                      className="absolute right-1.5 p-1 rounded-md text-cyan-400 disabled:opacity-40"
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Massive PTT button target (h-14 / 56px > 48px) */}
                  <button
                    onTouchStart={handlePttStart}
                    onTouchEnd={handlePttEnd}
                    onMouseDown={handlePttStart}
                    onMouseUp={handlePttEnd}
                    onMouseLeave={isHoldingPtt ? handlePttEnd : undefined}
                    className={`w-full h-14 rounded-xl font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2.5 border transition-all duration-150 ${
                      isHoldingPtt
                        ? "bg-cyan-950/80 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)] animate-pulse"
                        : "bg-slate-900 border-slate-850 text-slate-200 active:bg-slate-850"
                    }`}
                  >
                    <Mic className={`h-4.5 w-4.5 ${isHoldingPtt ? "text-cyan-400 animate-ping" : "text-slate-400"}`} />
                    {isHoldingPtt ? "RELEASE TO TRANSMIT" : "HOLD TO TALK (PTT COMMS)"}
                  </button>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Navigation Bar (Fixed h-16 / 64px) */}
      <nav className="h-16 border-t border-slate-900 bg-slate-950/95 backdrop-blur-md flex items-center justify-around z-10 flex-shrink-0">
        
        {/* Tab 1 target: Map */}
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 h-full py-2 flex flex-col items-center justify-center transition-all ${
            activeTab === "map" ? "text-cyan-400" : "text-slate-500"
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="text-[9px] font-mono font-bold mt-1.5 uppercase">Tactical Map</span>
        </button>

        {/* Tab 2 target: Triage */}
        <button
          onClick={() => setActiveTab("triage")}
          className={`flex-1 h-full py-2 flex flex-col items-center justify-center transition-all relative ${
            activeTab === "triage" ? "text-cyan-400" : "text-slate-500"
          }`}
        >
          <div className="relative">
            <Users className="h-5 w-5" />
            {rooms.filter(r => r.floor === selectedFloor && (r.status === "trapped" || r.status === "no_response")).length > 0 && (
              <span className="absolute -top-1 -right-1.5 h-2 w-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-[9px] font-mono font-bold mt-1.5 uppercase">Triage Grid</span>
        </button>

        {/* Tab 3 target: Comms */}
        <button
          onClick={() => setActiveTab("comms")}
          className={`flex-1 h-full py-2 flex flex-col items-center justify-center transition-all relative ${
            activeTab === "comms" ? "text-cyan-400" : "text-slate-500"
          }`}
        >
          <div className="relative">
            <Volume2 className="h-5 w-5" />
            {activeSession && (
              <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 bg-cyan-400 rounded-full animate-ping" />
            )}
          </div>
          <span className="text-[9px] font-mono font-bold mt-1.5 uppercase">Bridge Comms</span>
        </button>

      </nav>
    </div>
  );
}
