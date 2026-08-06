"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Loader2,
  Phone,
  Activity,
  Users,
  CheckCircle,
  AlertTriangle,
  Mic,
  Send,
  Volume2,
  RefreshCw,
  Compass,
  MapPin,
  Flame,
  VolumeX,
} from "lucide-react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { RoomRecord, RoomStatus, BridgeMessage, LiveBridgeSession } from "@/lib/responder/types";
import { DangerZone } from "@/lib/staff/types";

// Dynamically import the map to prevent SSR Leaflet errors
const DesktopResponderMap = dynamic(() => import("./DesktopResponderMap"), {
  ssr: false,
});

// Predefined target languages for the guest translation bridge
const LANGUAGES = [
  { code: "es", label: "Spanish (Español)" },
  { code: "vi", label: "Vietnamese (Tiếng Việt)" },
  { code: "zh", label: "Mandarin (中文)" },
  { code: "fr", label: "French (Français)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "ko", label: "Korean (한국어)" },
];

// Mock sequential guest responses to simulate interactive translation streams
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

export default function DesktopCommanderDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(demoBypassEnabled);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Core system state
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [triageSummary, setTriageSummary] = useState({
    evacuated: 0,
    missing: 0,
    checking: 0,
    liveComms: 0,
  });

  // UI state variables
  const [activeTab, setActiveTab] = useState<"all" | "missing" | "cleared">("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [selectedFloor, setSelectedFloor] = useState<number>(4);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Map layer toggles
  const [mapLayers, setMapLayers] = useState({
    gas: true,
    water: true,
    electrical: true,
    hazardZones: true,
    safePaths: true,
  });

  // Live Translator Bridge state variables
  const [activeSession, setActiveSession] = useState<LiveBridgeSession | null>(null);
  const [messages, setMessages] = useState<BridgeMessage[]>([]);
  const [guestLanguage, setGuestLanguage] = useState("es");
  const [responderText, setResponderText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isHoldingPtt, setIsHoldingPtt] = useState(false);
  const [pttHoldTime, setPttHoldTime] = useState(0);

  // Dialogue index tracking for mock simulation
  const [dialogueIndices, setDialogueIndices] = useState<Record<string, number>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const pttTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Fetch rooms and dashboard data
  const fetchData = async (showProgress = false) => {
    if (showProgress) setRefreshing(true);
    try {
      // 1. Fetch Rooms
      const roomsRes = await fetch("/api/responder/rooms");
      const roomsData = await roomsRes.json();
      const allRooms: RoomRecord[] = roomsData.rooms || [];
      setRooms(allRooms);

      // 2. Fetch Triage Summary
      const triageRes = await fetch("/api/responder/triage");
      const triageData = await triageRes.json();
      if (triageData.triage) {
        setTriageSummary({
          evacuated: triageData.triage.evacuated || 0,
          missing: triageData.triage.missing || 0,
          checking: triageData.triage.checking || 0,
          liveComms: triageData.triage.activeSessions || 0,
        });
      }

      // 3. Fetch Danger Zones
      const zonesRes = await fetch("/api/danger-zones");
      const zonesData = await zonesRes.json();
      setDangerZones(zonesData.dangerZones || []);

    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Mount effect and polling
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    
    fetchData();
    
    // Poll data every 4 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 4000);

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

  // Fetch active session messages when session changes or room is loaded
  const fetchSessionMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/responder/live-session?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Error loading bridge messages:", e);
    }
  };

  // Initialize or connect to a translation bridge session
  const handleLinkComms = async (roomId: string, forcedLanguage?: string) => {
    setLoading(true);
    const targetLang = forcedLanguage || guestLanguage;
    try {
      // First check if a session already exists for this room
      const sessionListRes = await fetch("/api/responder/live-session");
      const sessionListData = await sessionListRes.json();
      const existing = (sessionListData.sessions || []).find(
        (s: LiveBridgeSession) => s.roomId === roomId
      );

      if (existing) {
        setActiveSession(existing);
        setGuestLanguage(forcedLanguage || existing.guestLanguage || "es");
        await fetchSessionMessages(existing.sessionId);
      } else {
        // Create new session via API
        const createRes = await fetch("/api/responder/live-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, guestLanguage: targetLang }),
        });
        const createData = await createRes.json();
        if (createData.session) {
          setActiveSession(createData.session);
          setMessages([
            {
              id: "system-1",
              speaker: "system",
              text: `Bridge connection established with Room ${roomId} (${LANGUAGES.find(l => l.code === targetLang)?.label || "Spanish"})`,
              createdAt: new Date().toISOString(),
              translated: false,
            }
          ]);
        }
      }
      
      // Update local KPI for Live Comms immediately
      setTriageSummary(prev => ({
        ...prev,
        liveComms: prev.liveComms + (existing ? 0 : 1)
      }));

    } catch (error) {
      console.error("Failed linking comms:", error);
    } finally {
      setLoading(false);
    }
  };

  // Switch targets from grid
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    
    // Automatically match the map floor level to the room's floor for seamless UX
    const room = rooms.find(r => r.roomId === roomId);
    if (room) {
      setSelectedFloor(room.floor);
      handleLinkComms(roomId);
    }
  };

  // Update room occupancy status via PATCH request
  const handleUpdateStatus = async (roomId: string, status: RoomStatus) => {
    try {
      const res = await fetch("/api/responder/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, status }),
      });
      const data = await res.json();
      if (data.ok) {
        // Optimistically update status in local state
        setRooms(prev =>
          prev.map(r => (r.roomId === roomId ? { ...r, status } : r))
        );
        // Refresh summary metrics
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Scroll chat feed
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Message Send & translation via Groq
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || responderText).trim();
    if (!textToSend || !activeSession) return;

    setSendingMessage(true);
    if (!customText) setResponderText("");

    try {
      const res = await fetch("/api/translator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLang: "en",
          targetLang: guestLanguage,
          payload: textToSend,
        }),
      });
      const data = await res.json();
      
      if (data.originalText || data.translatedText) {
        const newMsg: BridgeMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          speaker: "responder",
          text: data.originalText || textToSend,
          translatedText: data.translatedText,
          createdAt: new Date().toISOString(),
          translated: false,
        };

        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== "system-1" && m.id !== "empty-prompt");
          return [...filtered, newMsg];
        });

        // Trigger simulated guest responses to show active dynamic conversation
        simulateGuestReply();
      }
    } catch (error) {
      console.error("Failed sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Audio Message Send & transcription/translation via Groq
  const handleSendAudio = async (blob: Blob) => {
    if (!activeSession) return;

    setSendingMessage(true);
    try {
      const formData = new FormData();
      formData.append("sourceLang", "en");
      formData.append("targetLang", guestLanguage);
      formData.append("payload", blob, "audio.webm");

      const res = await fetch("/api/translator", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.originalText || data.translatedText) {
        const newMsg: BridgeMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          speaker: "responder",
          text: data.originalText || "Audio message transmitted.",
          translatedText: data.translatedText,
          createdAt: new Date().toISOString(),
          translated: false,
        };

        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== "system-1" && m.id !== "empty-prompt");
          return [...filtered, newMsg];
        });

        // Trigger simulated guest responses to show active dynamic conversation
        simulateGuestReply();
      }
    } catch (error) {
      console.error("Failed sending audio message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Simulated dialogue loop based on room hazard characteristics
  const simulateGuestReply = () => {
    if (!selectedRoomId || !activeSession) return;
    
    setTimeout(async () => {
      const roomKey = MOCK_GUEST_DIALOGUES[selectedRoomId] ? selectedRoomId : "default";
      const dialogues = MOCK_GUEST_DIALOGUES[roomKey];
      const currentIndex = dialogueIndices[selectedRoomId] || 0;
      const nextDialogue = dialogues[currentIndex % dialogues.length];
      
      // Update dialogue index pointer
      setDialogueIndices(prev => ({
        ...prev,
        [selectedRoomId]: currentIndex + 1
      }));

      // Post guest transcript and translate to English
      try {
        // Add Guest's original language message
        const responderMsg = {
          speaker: "guest" as const,
          text: nextDialogue.guest,
          translated: false,
        };

        // Add English Translation message
        const translatedMsg = {
          speaker: "responder" as const,
          text: nextDialogue.english,
          translated: true,
        };

        // Call server action / push in-memory messages to preserve history
        // Since we are simulating, we push directly into the client feed
        setMessages(prev => [
          ...prev,
          {
            id: `sim-guest-${Date.now()}`,
            speaker: "guest",
            text: nextDialogue.guest,
            createdAt: new Date().toISOString(),
            translated: false,
          },
          {
            id: `sim-trans-${Date.now()}`,
            speaker: "system", // Use system/guest marker for translations
            text: `[EN TRANSLATION] ${nextDialogue.english}`,
            createdAt: new Date().toISOString(),
            translated: true,
          }
        ]);
      } catch (err) {
        console.error("Simulated reply error:", err);
      }
    }, 1800);
  };

  // Push-To-Talk (PTT) using MediaRecorder API
  const handlePttStart = async () => {
    setIsHoldingPtt(true);
    setPttHoldTime(0);
    
    // Start elapsed counter for UI visual feedback
    pttTimerRef.current = setInterval(() => {
      setPttHoldTime(prev => prev + 1);
    }, 100);

    try {
      if (typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Shut down microphone stream tracks
          stream.getTracks().forEach(track => track.stop());

          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size > 0) {
            await handleSendAudio(blob);
          }
        };

        mediaRecorder.start();
      }
    } catch (err) {
      console.error("Error accessing microphone for PTT:", err);
    }
  };

  const handlePttEnd = () => {
    setIsHoldingPtt(false);
    if (pttTimerRef.current) {
      clearInterval(pttTimerRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      // Fallback text broadcast if mic not available or hold too short
      if (pttHoldTime > 5 && selectedRoomId) {
        const room = rooms.find(r => r.roomId === selectedRoomId);
        let pttText = "Commander Audio Broadcast: Please hold your position, rescue units are deployed.";
        
        if (room?.status === "trapped") {
          pttText = "This is Crisis Command. Search and rescue teams are climbing to your sector. Keep doors shut and block smoke doors.";
        } else if (room?.status === "checking") {
          pttText = "This is Crisis Command. Please verify occupancy logs immediately. Are you secure?";
        } else if (room?.status === "evacuated") {
          pttText = "Command notice: Evacuees must remain at Exit Alpha Assembly Point. Do not return inside.";
        }

        handleSendMessage(pttText);
      }
    }
  };

  // Filtered room listing
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Filter by the currently displayed map floor level
      if (room.floor !== selectedFloor) return false;

      // Filter by status tab
      if (activeTab === "cleared") return room.status === "evacuated";
      if (activeTab === "missing") return room.status === "trapped" || room.status === "no_response";
      return true; // "all"
    });
  }, [rooms, activeTab, selectedFloor]);

  if (!mounted) return null;

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white font-sans">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white font-mono tracking-wider">GuardianLink Commander Portal</h1>
            <p className="mt-1 text-sm text-slate-400">Authorize responder credentials for tactical access.</p>
          </div>
          <div className="space-y-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
            <input
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              type="password"
              placeholder="Enter passcode"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-slate-700"
              onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
            />
            {authError && <p className="text-xs text-rose-500 font-mono">{authError}</p>}
            <button
              onClick={handleAuthSubmit}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-500/20 text-xs font-mono font-bold rounded-xl transition duration-150 flex items-center justify-center cursor-pointer"
            >
              Unlock Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 font-sans select-none select-none">
      
      {/* 1. Global Header (Slim HUD Navbar - h-14) */}
      <header className="h-14 flex-shrink-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 flex items-center justify-between z-10">
        
        {/* Left Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-black tracking-[0.25em] text-slate-200 font-mono">
            GUARDIANLINK <span className="text-cyan-400 font-normal">//</span> COMMAND HQ
          </span>
        </div>

        {/* Center Slim KPIs */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-mono tracking-wider font-semibold">EVACUATED</span>
            <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse-safe" />
              {triageSummary.evacuated} <span className="text-[9px] text-slate-600 font-normal">RMS</span>
            </span>
          </div>

          <div className="h-6 w-px bg-slate-900" />

          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-mono tracking-wider font-semibold">MISSING</span>
            <span className="text-xs font-bold font-mono text-rose-400 flex items-center gap-1.5 mt-0.5">
              <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse-danger" />
              {triageSummary.missing} <span className="text-[9px] text-slate-600 font-normal">RMS</span>
            </span>
          </div>

          <div className="h-6 w-px bg-slate-900" />

          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-mono tracking-wider font-semibold">PENDING</span>
            <span className="text-xs font-bold font-mono text-amber-500 flex items-center gap-1.5 mt-0.5">
              <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse-warning" />
              {triageSummary.checking} <span className="text-[9px] text-slate-600 font-normal">RMS</span>
            </span>
          </div>

          <div className="h-6 w-px bg-slate-900" />

          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-mono tracking-wider font-semibold">LIVE COMMS</span>
            <span className="text-xs font-bold font-mono text-cyan-400 flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              {triageSummary.liveComms} <span className="text-[9px] text-slate-600 font-normal">LINKS</span>
            </span>
          </div>
        </div>

        {/* Right HUD Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-1.5 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded transition text-slate-400 hover:text-slate-200"
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          
          <div className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-2 py-1 border border-slate-900 rounded">
            SYS STATUS: <span className="text-emerald-500 font-bold">NOMINAL</span>
          </div>
          
          <button
            onClick={() => router.push("/responder/mobile")}
            className="h-7 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono font-bold text-cyan-400 rounded-md transition duration-150 flex items-center gap-1.5 hover:shadow-[0_0_10px_rgba(34,211,238,0.15)]"
          >
            <Phone className="h-3 w-3" />
            MOBILE MODE
          </button>
        </div>
      </header>

      {/* 2. Resizable 3-Pane Body */}
      <main className="flex-grow h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-slate-950 relative grid-bg">
        {loading && rooms.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-cyan-400 mt-2">ESTABLISHING CRYPTO INTEGRITY COM...</span>
          </div>
        ) : null}

        <PanelGroup direction="horizontal">
          
          {/* Panel 1: Triage Grid (Left - Default 22%) */}
          <Panel defaultSize={22} minSize={18} maxSize={30} className="h-full flex flex-col border-r border-slate-900/60 bg-slate-950/30 backdrop-blur-md">
            
            {/* Filter Tabs */}
            <div className="p-3 flex-shrink-0 border-b border-slate-900/60 flex items-center justify-between">
              <div className="flex bg-slate-900/50 p-0.5 rounded border border-slate-900/80 gap-0.5 w-full">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 py-1 text-[10px] font-mono rounded font-bold transition-all ${
                    activeTab === "all"
                      ? "bg-slate-800 text-cyan-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  ALL ({rooms.filter(r => r.floor === selectedFloor).length})
                </button>
                <button
                  onClick={() => setActiveTab("missing")}
                  className={`flex-1 py-1 text-[10px] font-mono rounded font-bold transition-all ${
                    activeTab === "missing"
                      ? "bg-rose-950/50 text-rose-400 border border-rose-900/30 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  MISSING ({rooms.filter(r => r.floor === selectedFloor && (r.status === "trapped" || r.status === "no_response")).length})
                </button>
                <button
                  onClick={() => setActiveTab("cleared")}
                  className={`flex-1 py-1 text-[10px] font-mono rounded font-bold transition-all ${
                    activeTab === "cleared"
                      ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/30 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  CLEARED ({rooms.filter(r => r.floor === selectedFloor && r.status === "evacuated").length})
                </button>
              </div>
            </div>

            {/* Room List scroll area */}
            <div className="flex-grow overflow-y-auto p-3 space-y-2">
              {filteredRooms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 py-10 font-mono text-[10px]">
                  <span>NO CORRESPONDING ROOMS FOUND</span>
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isSelected = selectedRoomId === room.roomId;
                  
                  // Style configurations based on status
                  let borderStyle = "border-slate-900 hover:border-slate-800 bg-slate-900/20";
                  let statusBadge = <span className="text-[8px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Checking</span>;
                  let signalDot = "bg-slate-600";

                  if (room.status === "evacuated") {
                    borderStyle = isSelected
                      ? "border-emerald-500 bg-emerald-950/10 shadow-[0_0_12px_rgba(16,185,129,0.08)]"
                      : "border-slate-900 hover:border-emerald-950/40 bg-slate-900/10";
                    statusBadge = <span className="text-[8px] bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Evacuated</span>;
                    signalDot = "bg-emerald-500";
                  } else if (room.status === "trapped") {
                    borderStyle = isSelected
                      ? "border-rose-500 bg-rose-950/10 shadow-[0_0_12px_rgba(244,63,94,0.08)]"
                      : "border-slate-900 hover:border-rose-950/40 bg-slate-900/10";
                    statusBadge = <span className="text-[8px] bg-rose-950/50 text-rose-400 border border-rose-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Trapped</span>;
                    signalDot = "bg-rose-500 animate-pulse";
                  } else if (room.status === "no_response") {
                    borderStyle = isSelected
                      ? "border-amber-500 bg-amber-950/10 shadow-[0_0_12px_rgba(245,158,11,0.08)]"
                      : "border-slate-900 hover:border-amber-950/40 bg-slate-900/10";
                    statusBadge = <span className="text-[8px] bg-amber-950/50 text-amber-500 border border-amber-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase">No Resp</span>;
                    signalDot = "bg-amber-500";
                  }

                  if (isSelected && room.status !== "evacuated" && room.status !== "trapped" && room.status !== "no_response") {
                    borderStyle = "border-cyan-500 bg-cyan-950/10";
                  }

                  return (
                    <div
                      key={room.roomId}
                      onClick={() => handleSelectRoom(room.roomId)}
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${borderStyle}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${signalDot}`} />
                          <span className="text-xs font-mono font-bold text-slate-100">ROOM {room.roomId}</span>
                          <span className="text-[9px] text-slate-500 font-mono">(L{room.floor})</span>
                        </div>
                        {statusBadge}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1 font-mono">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span>OCCUPANTS: <strong className="text-slate-200">{room.occupantCount}</strong></span>
                        </div>
                        <div className="font-mono text-[9px] text-slate-500">
                          SIG: {room.signalStrength.toUpperCase()}
                        </div>
                      </div>

                      {room.sos && (
                        <div className="mt-2 p-1.5 bg-slate-950 border border-slate-900 rounded text-[9.5px] text-slate-300 font-mono truncate leading-normal">
                          <span className="text-[8px] text-rose-500 font-bold uppercase mr-1">SOS:</span>
                          &quot;{room.sos.text}&quot;
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t border-slate-900 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRoom(room.roomId);
                          }}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[9px] font-mono font-bold text-cyan-400 tracking-wider transition uppercase"
                        >
                          Link Comms
                        </button>
                      </div>

                      {isSelected && (
                        <div className="mt-3 pt-2 border-t border-slate-900/60 flex flex-col gap-1.5 animate-fade-in">
                          <span className="text-[9px] text-slate-500 font-mono tracking-wider font-bold uppercase">
                            Set Status
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(room.roomId, "checking");
                              }}
                              className={`flex-1 py-1 rounded text-[9px] font-mono font-bold border transition-all duration-150 ${
                                room.status === "checking"
                                  ? "bg-slate-900 border-slate-700 text-slate-200"
                                  : "bg-slate-950 hover:bg-slate-900 border-slate-900 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              Check
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(room.roomId, "evacuated");
                              }}
                              className={`flex-1 py-1 rounded text-[9px] font-mono font-bold border transition-all duration-150 ${
                                room.status === "evacuated"
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-900"
                                  : "bg-slate-950 hover:bg-slate-900 border-slate-900 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              Evac
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateStatus(room.roomId, "trapped");
                              }}
                              className={`flex-1 py-1 rounded text-[9px] font-mono font-bold border transition-all duration-150 ${
                                room.status === "trapped"
                                  ? "bg-rose-950/80 text-rose-400 border-rose-900"
                                  : "bg-slate-950 hover:bg-slate-900 border-slate-900 text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              Trap
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Panel>

          {/* Panel Resizer 1 */}
          <PanelResizeHandle className="w-[3px] bg-slate-950 hover:bg-cyan-500/30 transition-colors duration-200 cursor-col-resize z-20" />

          {/* Panel 2: Tactical Hero Map (Center - Default 53%) */}
          <Panel defaultSize={53} minSize={40} maxSize={70} className="h-full flex flex-col relative bg-slate-950">
            
            {/* Main Map Container */}
            <div className="flex-grow w-full h-full relative">
              <DesktopResponderMap
                floor={selectedFloor}
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={handleSelectRoom}
                dangerZones={dangerZones}
                layerToggles={{
                  gas: mapLayers.gas,
                  water: mapLayers.water,
                  electrical: mapLayers.electrical,
                  hazardZones: mapLayers.hazardZones,
                  safePaths: mapLayers.safePaths,
                }}
              />

              {/* Top-Right: Floor Selection Pill Overlay */}
              <div className="absolute top-3 right-3 z-[400] flex bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-900 gap-1">
                {[2, 3, 4].map((fl) => (
                  <button
                    key={fl}
                    onClick={() => setSelectedFloor(fl)}
                    className={`h-7 w-8 text-[10px] font-mono font-black rounded transition-all ${
                      selectedFloor === fl
                        ? "bg-cyan-950 text-cyan-400 border border-cyan-800/80 shadow-md"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    L{fl}
                  </button>
                ))}
              </div>

              {/* Bottom-Left: Infrastructure Layers Overlay */}
              <div className="absolute bottom-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-md p-2 rounded-lg border border-slate-900 flex flex-col gap-1.5 min-w-[130px]">
                <span className="text-[9px] text-slate-500 font-mono tracking-wider font-bold mb-1 border-b border-slate-900 pb-1">
                  TACTICAL OVERLAYS
                </span>
                
                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={mapLayers.gas}
                    onChange={(e) => setMapLayers(p => ({ ...p, gas: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                  />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Gas Valves
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={mapLayers.water}
                    onChange={(e) => setMapLayers(p => ({ ...p, water: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                  />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    Water Hydrants
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={mapLayers.electrical}
                    onChange={(e) => setMapLayers(p => ({ ...p, electrical: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                  />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    Electric Vaults
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={mapLayers.hazardZones}
                    onChange={(e) => setMapLayers(p => ({ ...p, hazardZones: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                  />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Danger Zones
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={mapLayers.safePaths}
                    onChange={(e) => setMapLayers(p => ({ ...p, safePaths: e.target.checked }))}
                    className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3"
                  />
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Egress Paths
                  </span>
                </label>
              </div>
            </div>
          </Panel>

          {/* Panel Resizer 2 */}
          <PanelResizeHandle className="w-[3px] bg-slate-950 hover:bg-cyan-500/30 transition-colors duration-200 cursor-col-resize z-20" />

          {/* Panel 3: Live Translator Bridge (Right - Default 25%) */}
          <Panel defaultSize={25} minSize={20} maxSize={35} className="h-full flex flex-col border-l border-slate-900/60 bg-slate-950/30 backdrop-blur-md">
            
            {/* Header Title */}
            <div className="p-3 border-b border-slate-900/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[10px] font-mono tracking-wider font-black text-slate-200">
                  LIVE TRANSLATOR BRIDGE
                </span>
              </div>
              {selectedRoomId && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const currentRoom = rooms.find(r => r.roomId === selectedRoomId);
                    return (
                      <div className="flex items-center gap-1 bg-slate-900 p-0.5 border border-slate-800 rounded">
                        <button
                          onClick={() => handleUpdateStatus(selectedRoomId, "checking")}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all ${
                            currentRoom?.status === "checking"
                              ? "bg-slate-800 text-slate-300 border border-slate-700"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          CHK
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedRoomId, "evacuated")}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all ${
                            currentRoom?.status === "evacuated"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          EVAC
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedRoomId, "trapped")}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all ${
                            currentRoom?.status === "trapped"
                              ? "bg-rose-950 text-rose-400 border-rose-900"
                              : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          TRAP
                        </button>
                      </div>
                    );
                  })()}

                  <div className="px-2 py-0.5 bg-cyan-950 border border-cyan-850 rounded text-[9px] font-mono text-cyan-400 font-bold">
                    ROOM {selectedRoomId}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Transcript Stream Feed */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3.5">
              {!selectedRoomId ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600 font-mono text-[10px] leading-relaxed">
                  <VolumeX className="h-6 w-6 text-slate-700 mb-2 animate-pulse" />
                  <span>NO COM TARGET SECURED</span>
                  <p className="text-[9px] text-slate-700 mt-1 max-w-[180px]">
                    Select a room card in the triage grid or click a room node on the map to bind a translator bridge.
                  </p>
                </div>
              ) : !activeSession ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono text-[10px]">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-500 mb-2" />
                  <span>NEGOTIATING CRYPTO HANDSHAKE...</span>
                  <button
                    onClick={() => handleLinkComms(selectedRoomId)}
                    className="mt-4 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-bold text-[9px] text-cyan-400 uppercase tracking-wider transition"
                  >
                    Force Establish Link
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 text-[10px] font-mono" id="empty-prompt">
                  <span>CHANNEL ESTABLISHED // AWAITING COMMS</span>
                </div>
              ) : (
                messages.map((msg, index) => {
                  if (msg.speaker === "system" && !msg.translated) {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="inline-block px-2.5 py-1 bg-slate-900/50 border border-slate-900 text-[9px] font-mono text-slate-500 rounded-md">
                          {msg.text.toUpperCase()}
                        </span>
                      </div>
                    );
                  }

                  // If it is a translation message, skip rendering it as a top-level bubble.
                  // It will be rendered nested under the original message.
                  if (msg.translated) {
                    return null;
                  }

                  const isResponder = msg.speaker === "responder";
                  
                  // Look ahead to find the matching translation in the messages list
                  let translationMsg: BridgeMessage | undefined = undefined;
                  for (let i = index + 1; i < messages.length; i++) {
                    const nextMsg = messages[i];
                    if (!nextMsg.translated) break; // Stop if we hit a new original message
                    
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
                      <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider font-semibold">
                        {isResponder ? "COMMAND HUD" : `GUEST (${guestLanguage.toUpperCase()})`}
                      </span>
                      
                      <div
                        className={`px-3 py-2 rounded-lg border text-[11px] leading-relaxed transition-all duration-150 ${
                          isResponder
                            ? "bg-slate-900 border-slate-800 text-slate-200"
                            : "bg-slate-950 border-slate-900 text-slate-200"
                        }`}
                      >
                        <p className={isResponder ? "text-slate-200 font-sans" : "text-slate-300 font-mono italic"}>
                          {isResponder ? msg.text : `"${msg.text}"`}
                        </p>
                        
                        {/* Nested Translation display */}
                        {msg.translatedText ? (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-900/60 text-[10px]">
                            <span className="text-[9px] font-mono text-cyan-500 block uppercase font-bold tracking-tight mb-0.5">
                              {isResponder ? `[${guestLanguage.toUpperCase()} TRANSLATION]` : "[ENG TRANSLATION]"}
                            </span>
                            <p className="font-semibold text-slate-300">
                              {msg.translatedText}
                            </p>
                          </div>
                        ) : translationMsg ? (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-900/60 text-[10px]">
                            <span className="text-[9px] font-mono text-cyan-500 block uppercase font-bold tracking-tight mb-0.5">
                              {isResponder ? `[${guestLanguage.toUpperCase()} TRANSLATION]` : "[ENG TRANSLATION]"}
                            </span>
                            <p className="font-semibold text-slate-300">
                              {translationMsg.text.startsWith("[EN TRANSLATION] ")
                                ? translationMsg.text.substring(17)
                                : translationMsg.text}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <span className="text-[8px] text-slate-600 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* PTT Waveform Overlay */}
            {isHoldingPtt && (
              <div className="absolute inset-x-0 bottom-[145px] bg-slate-950/95 border-y border-slate-900/60 py-4 flex flex-col items-center justify-center gap-2 z-10 animate-fade-in backdrop-blur-md">
                <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-[0.2em] animate-pulse">
                  TRANSMITTING ENCRYPTED AUDIO...
                </span>
                
                {/* 5-Bar CSS Equalizer/Waveform Pulse Animation */}
                <div className="flex items-end gap-1.5 h-8 mt-2">
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s", height: "70%" }} />
                  <div className="w-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s", height: "100%" }} />
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s", height: "45%" }} />
                  <div className="w-1 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.5s", height: "85%" }} />
                  <div className="w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s", height: "60%" }} />
                </div>

                <span className="text-[9px] text-slate-500 font-mono mt-1">
                  Hold for transcript (Time active: {(pttHoldTime / 10).toFixed(1)}s)
                </span>
              </div>
            )}

            {/* Bottom Controls Area */}
            <div className="p-3 border-t border-slate-900/60 bg-slate-950/60 backdrop-blur-sm flex-shrink-0 space-y-3">
              
              {/* Language Settings Selector */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] text-slate-500 font-mono font-bold">GUEST LANG:</span>
                <select
                  disabled={!selectedRoomId}
                  value={guestLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setGuestLanguage(newLang);
                    if (selectedRoomId) {
                      // Restart session with new language immediately
                      handleLinkComms(selectedRoomId, newLang);
                    }
                  }}
                  className="flex-grow max-w-[150px] bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 rounded px-1.5 py-1 focus:ring-0 focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Text send input field */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  disabled={!activeSession || sendingMessage}
                  placeholder={
                    activeSession
                      ? "Send message (will translate to English)..."
                      : "Comms offline. Select room..."
                  }
                  value={responderText}
                  onChange={(e) => setResponderText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  className="w-full bg-slate-900/80 border border-slate-850 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700 disabled:opacity-40 font-sans"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!activeSession || !responderText.trim() || sendingMessage}
                  className="absolute right-1.5 p-1 rounded-md text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:hover:text-cyan-400 transition-colors"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Big push-to-talk button */}
              <button
                disabled={!activeSession}
                onMouseDown={handlePttStart}
                onMouseUp={handlePttEnd}
                onMouseLeave={isHoldingPtt ? handlePttEnd : undefined}
                onTouchStart={handlePttStart}
                onTouchEnd={handlePttEnd}
                className={`w-full py-2.5 rounded-lg font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 border transition-all duration-200 ${
                  isHoldingPtt
                    ? "bg-cyan-950/80 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-slate-100 disabled:opacity-40 disabled:hover:bg-slate-900"
                }`}
              >
                <Mic className={`h-4 w-4 ${isHoldingPtt ? "text-cyan-400" : "text-slate-400"}`} />
                {isHoldingPtt ? "RELEASE TO TRANSCRIPT & TRANSLATE" : "HOLD TO TALK (PTT COMMS)"}
              </button>
            </div>
          </Panel>

        </PanelGroup>
      </main>
    </div>
  );
}
