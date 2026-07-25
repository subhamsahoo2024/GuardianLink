"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Loader2,
  Tv,
  Megaphone,
  ShieldAlert,
  AlertTriangle,
  Video,
  Volume2,
  Activity,
  ArrowLeft,
  Radio,
  Flame,
  UserCheck,
  Trash2
} from "lucide-react";

// Import existing UI components from local workspace
import Badge from "@/app/_components/ui/Badge";
import Button from "@/app/_components/ui/Button";
import Card from "@/app/_components/ui/Card";

// Import Firebase Client SDK
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  orderBy
} from "firebase/firestore";

// Dynamically import client-only StaffMap to prevent SSR errors (Leaflet requires 'window')
const StaffMap = dynamic(() => import("../StaffMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400">
      <Loader2 className="mr-2 h-6 w-6 animate-spin text-cyan-400" />
      Loading Tactical Interface Map...
    </div>
  )
});

import { MapNode, MapGuest, MapDangerZone } from "../StaffMap";
import { Broadcast } from "@/lib/staff/types";
import { ExtendedIncident } from "../page";

// Passcode Gate Details
const demoBypassEnabled = process.env.NEXT_PUBLIC_STAFF_DEMO_BYPASS !== "false";
const demoPasscode = process.env.NEXT_PUBLIC_STAFF_DEMO_PASSCODE || "guardian-staff-demo";

export default function MobileStaffPage() {
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(demoBypassEnabled);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Common Realtime States (Synced from Firestore / Polling)
  const [guests, setGuests] = useState<MapGuest[]>([]);
  const [incidents, setIncidents] = useState<ExtendedIncident[]>([]);
  const [dangerZones, setDangerZones] = useState<MapDangerZone[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  // Floor settings
  const [activeFloor, setActiveFloor] = useState(4);
  const [floorPlans, setFloorPlans] = useState<Record<number, string>>({});
  const [floorNodes, setFloorNodes] = useState<Record<number, MapNode[]>>({});

  // Mobile modal overlay type
  const [activeModal, setActiveModal] = useState<
    "feed" | "heatmap" | "broadcast" | "danger" | "detail" | null
  >(null);

  // Card 5 specific selection state
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync data & load initial localStorage cache
  useEffect(() => {
    if (!authenticated) return;

    // Pre-populate floor plans & nodes from localStorage (safely wrapped)
    const initialPlans: Record<number, string> = {};
    const initialNodes: Record<number, MapNode[]> = {};
    try {
      [2, 3, 4].forEach((f) => {
        const p = localStorage.getItem(`floor_plan_${f}`);
        if (p) initialPlans[f] = p;
        const n = localStorage.getItem(`floor_nodes_${f}`);
        if (n) {
          try {
            initialNodes[f] = JSON.parse(n);
          } catch { }
        }
      });
    } catch (e) {
      console.warn("localStorage cache pre-populate blocked:", e);
    }
    setFloorPlans(initialPlans);
    setFloorNodes(initialNodes);

    // Listeners with Error callbacks (to trap permission rejections)
    const unsubGuests = onSnapshot(collection(db, "guests"), (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          roomId: data.roomId || "",
          floor: Number(data.floor) || 4,
          lat: Number(data.lat) || 40.7582,
          lng: Number(data.lng) || -73.9855,
          status: data.status || "no_response",
        } as MapGuest;
      });
      setGuests(items);
    }, (err) => console.warn("Firestore guests subscription failed:", err));

    const unsubIncidents = onSnapshot(collection(db, "incidents"), (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "Distress SOS Report",
          summary: data.summary || data.message || "Awaiting Gemini summary...",
          location: data.location || `Room ${data.roomId}`,
          severity: data.severity || "high",
          status: data.status || "new",
          trapped: Number(data.trapped) || 1,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          timeline: data.timeline || [],
          roomId: data.roomId || "",
          mediaUrl: data.mediaUrl || "",
          mediaType: data.mediaType || "",
        } as ExtendedIncident;
      });
      setIncidents(items);
    }, (err) => console.warn("Firestore incidents subscription failed:", err));

    const unsubZones = onSnapshot(collection(db, "danger_zones"), (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          floor: Number(data.floor) || 4,
          label: data.label || "Hazard Zone",
          severity: data.severity || "high",
          center: data.center || { lat: 40.7582, lng: -73.9855 },
          radiusMeters: Number(data.radiusMeters) || 15,
          active: data.active !== false,
        } as MapDangerZone;
      });
      setDangerZones(items);
    }, (err) => console.warn("Firestore danger zones subscription failed:", err));

    const unsubBroadcasts = onSnapshot(
      query(collection(db, "broadcasts"), orderBy("createdAt", "desc")),
      (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            message: data.message || "",
            priority: data.priority || "normal",
            target: data.target || "all",
            delivery: data.delivery || "sent",
            createdAt: data.createdAt || new Date().toISOString(),
          } as Broadcast;
        });
        setBroadcasts(items);
      },
      (err) => console.warn("Firestore broadcasts subscription failed:", err)
    );

    // API Polling Fallback loop (runs in parallel to ensure operational capability)
    const pollAll = async () => {
      try {
        const occRes = await fetch("/api/occupancy");
        if (occRes.ok) {
          const payload = await occRes.json();
          if (payload.guests) setGuests(payload.guests);
          if (payload.dangerZones) setDangerZones(payload.dangerZones);
        }
      } catch (err) {
        console.warn("Polling occupancy failed:", err);
      }

      try {
        const incRes = await fetch("/api/incidents");
        if (incRes.ok) {
          const payload = await incRes.json();
          if (payload.incidents) setIncidents(payload.incidents);
        }
      } catch (err) {
        console.warn("Polling incidents failed:", err);
      }

      try {
        const brRes = await fetch("/api/broadcast");
        if (brRes.ok) {
          const payload = await brRes.json();
          if (payload.broadcasts) setBroadcasts(payload.broadcasts);
        }
      } catch (err) {
        console.warn("Polling broadcasts failed:", err);
      }
    };

    pollAll();
    const pollTimer = setInterval(pollAll, 6000);

    return () => {
      unsubGuests();
      unsubIncidents();
      unsubZones();
      unsubBroadcasts();
      clearInterval(pollTimer);
    };
  }, [authenticated]);

  const handleAuthSubmit = () => {
    if (passcodeInput === demoPasscode) {
      setAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect system passcode. Access denied.");
    }
  };

  const seedMockCrisisData = async () => {
    try {
      const guestSeeds = [
        { id: "g-001", roomId: "402", floor: 4, lat: 40.75835, lng: -73.9856, status: "needs_help", updatedAt: new Date().toISOString() },
        { id: "g-002", roomId: "305", floor: 3, lat: 40.75812, lng: -73.98535, status: "no_response", updatedAt: new Date().toISOString() },
        { id: "g-003", roomId: "201", floor: 2, lat: 40.75795, lng: -73.9852, status: "safe", updatedAt: new Date().toISOString() },
        { id: "g-004", roomId: "412", floor: 4, lat: 40.75848, lng: -73.98572, status: "needs_help", updatedAt: new Date().toISOString() },
      ];
      for (const g of guestSeeds) {
        await setDoc(doc(db, "guests", g.id), g);
      }
      alert("Mock Crisis Data Seeded to Firestore successfully!");
    } catch (err: any) {
      alert(`Seeding failed: ${err.message}`);
    }
  };

  const criticalIncidentsCount = incidents.filter((i) => i.severity === "critical").length;
  const activeSOSReportsCount = guests.filter((g) => g.status === "needs_help").length;

  const selectedIncident = useMemo(() => {
    return (
      incidents.find((inc) => inc.id === selectedIncidentId) ||
      incidents[0] ||
      null
    );
  }, [incidents, selectedIncidentId]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white font-sans">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-white">GuardianLink Mobile Hub</h1>
            <p className="mt-1 text-xs text-slate-400">Authorize staff credentials for live response.</p>
          </div>
          <Card variant="glass" className="space-y-4 p-6 bg-slate-900/60 border-slate-800">
            <input
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              type="password"
              placeholder="Enter passcode"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
            />
            {authError && <p className="text-xs text-rose-500">{authError}</p>}
            <Button variant="primary" onClick={handleAuthSubmit} className="w-full text-sm">Unlock Hub</Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 font-sans bg-slate-950 text-white pb-20 select-none">
      {/* Top Banner Status */}
      <header className="flex items-center justify-between border-b border-slate-900 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
            TACTICAL COMS HUB
          </span>
        </div>
        <Badge variant={criticalIncidentsCount > 0 ? "danger" : "safe"}>
          {criticalIncidentsCount > 0 ? "CRISIS MODE ACTIVE" : "SYSTEM STABLE"}
        </Badge>
      </header>

      {/* Overview stats panel */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-[10px] uppercase font-bold text-slate-500">SOS Hazards</p>
          <p className="text-2xl font-extrabold text-red-500 mt-1">{criticalIncidentsCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-[10px] uppercase font-bold text-slate-500">Distress Pings</p>
          <p className="text-2xl font-extrabold text-amber-500 mt-1">{activeSOSReportsCount}</p>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-sm font-bold tracking-tight text-slate-100">Operation Cards</h1>
        <p className="text-[11px] text-slate-400">Tap a tactical grid node to deploy module</p>
      </div>

      {/* 2-column Grid of 5 Tactile cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Card 1: Pulse Incident Feed */}
        <button
          onClick={() => setActiveModal("feed")}
          className="flex flex-col justify-between items-start text-left min-h-[130px] rounded-2xl border border-red-500/20 bg-red-950/10 p-4 active:scale-95 transition-all duration-100 cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">Card 1</p>
            <h2 className="text-xs font-extrabold text-white">Pulse Incident Feed</h2>
          </div>
        </button>

        {/* Card 2: Occupancy Heatmap */}
        <button
          onClick={() => setActiveModal("heatmap")}
          className="flex flex-col justify-between items-start text-left min-h-[130px] rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-4 active:scale-95 transition-all duration-100 cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">Card 2</p>
            <h2 className="text-xs font-extrabold text-white">Safety Heatmap</h2>
          </div>
        </button>

        {/* Card 3: Broadcast message */}
        <button
          onClick={() => setActiveModal("broadcast")}
          className="flex flex-col justify-between items-start text-left min-h-[130px] rounded-2xl border border-orange-500/20 bg-orange-950/10 p-4 active:scale-95 transition-all duration-100 cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Megaphone size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">Card 3</p>
            <h2 className="text-xs font-extrabold text-white">Alert Broadcast</h2>
          </div>
        </button>

        {/* Card 4: Danger Zones */}
        <button
          onClick={() => setActiveModal("danger")}
          className="flex flex-col justify-between items-start text-left min-h-[130px] rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 active:scale-95 transition-all duration-100 cursor-pointer"
        >
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400">Card 4</p>
            <h2 className="text-xs font-extrabold text-white">Danger Zones</h2>
          </div>
        </button>

        {/* Card 5: Incident Detail */}
        <button
          onClick={() => {
            const targetId = incidents.find((i) => i.status !== "resolved")?.id || incidents[0]?.id || "";
            setSelectedIncidentId(targetId);
            setActiveModal("detail");
          }}
          className="col-span-2 flex justify-between items-center text-left min-h-[90px] rounded-2xl border border-purple-500/20 bg-purple-950/10 p-4 active:scale-95 transition-all duration-100 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Tv size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400">Card 5</p>
              <h2 className="text-xs font-extrabold text-white">Incident Details & Media</h2>
            </div>
          </div>
          {selectedIncident && (
            <Badge variant="danger" className="text-[9px]">
              Inspect Room {selectedIncident.roomId}
            </Badge>
          )}
        </button>
      </div>

      <div className="mt-8">
        <Button variant="ghost" size="sm" onClick={seedMockCrisisData} className="w-full text-xs">
          🔄 Reload Simulation Data (Firestore Seed)
        </Button>
      </div>

      {/* CARD 1 OVERLAY: Pulse Incident Feed */}
      {activeModal === "feed" && (
        <MobileModalOverlay title="Pulse Incident Feed" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Real-time incident updates sorted by severity.</p>
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No active incidents found.</div>
              ) : (
                [...incidents]
                  .sort((a, b) => {
                    const sevWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                    return (sevWeight[b.severity] || 0) - (sevWeight[a.severity] || 0);
                  })
                  .map((inc) => (
                    <div
                      key={inc.id}
                      onClick={() => {
                        setSelectedIncidentId(inc.id);
                        setActiveModal("detail");
                      }}
                      className="border border-slate-800 bg-slate-900/60 rounded-xl p-4 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-xs text-slate-200">{inc.title}</h3>
                        <Badge variant={inc.severity === "critical" ? "danger" : "warning"}>
                          {inc.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{inc.summary}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </MobileModalOverlay>
      )}

      {/* CARD 2 OVERLAY: Heatmap */}
      {activeModal === "heatmap" && (
        <MobileModalOverlay title="Safety Heatmap" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Crisis Heatmap</span>
              <div className="flex gap-1">
                {[2, 3, 4].map((floor) => (
                  <button
                    key={floor}
                    onClick={() => setActiveFloor(floor)}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded border ${activeFloor === floor ? "bg-cyan-500/15 border-cyan-500 text-cyan-400" : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                  >
                    F0{floor}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[300px] relative rounded-xl overflow-hidden">
              <StaffMap mode="geo" guests={guests} dangerZones={dangerZones} selectedFloor={activeFloor} />
            </div>
          </div>
        </MobileModalOverlay>
      )}

      {/* CARD 3 OVERLAY: Broadcast Form */}
      {activeModal === "broadcast" && (
        <MobileModalOverlay title="Broadcast alert" onClose={() => setActiveModal(null)}>
          <BroadcastForm broadcasts={broadcasts} onClose={() => setActiveModal(null)} />
        </MobileModalOverlay>
      )}

      {/* CARD 4 OVERLAY: Danger Zones */}
      {activeModal === "danger" && (
        <MobileModalOverlay title="Danger Zone Management" onClose={() => setActiveModal(null)}>
          <DangerZoneManager dangerZones={dangerZones} selectedFloor={activeFloor} setSelectedFloor={setActiveFloor} guests={guests} />
        </MobileModalOverlay>
      )}

      {/* CARD 5 OVERLAY: Detail view */}
      {activeModal === "detail" && (
        <MobileModalOverlay title="Incident detail" onClose={() => setActiveModal(null)}>
          <IncidentDetailInspector incident={selectedIncident} incidents={incidents} onSelectIncidentId={setSelectedIncidentId} guests={guests} />
        </MobileModalOverlay>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Broadcast alert form (Mobile Specific)
// -------------------------------------------------------------------------
function BroadcastForm({ broadcasts, onClose }: { broadcasts: Broadcast[]; onClose: () => void }) {
  const [msgText, setMsgText] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "critical">("high");
  const [audience, setAudience] = useState<"all" | "staff" | "guests">("all");
  const [loading, setLoading] = useState(false);

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "broadcasts"), {
        message: msgText,
        priority,
        target: audience,
        delivery: "sent",
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, "settings", "global_broadcast"), {
        broadcastMessage: msgText,
        updatedAt: new Date().toISOString(),
      });
      alert("Alert Broadcast message successfully transmitted.");
      setMsgText("");
      onClose();
    } catch (err: any) {
      alert(`Broadcast failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleBroadcastSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Instructions</label>
        <textarea
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          rows={3}
          placeholder="Evacuation steps..."
          className="w-full bg-slate-950 border border-slate-800 p-3 text-xs text-white rounded-lg outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <select value={priority} onChange={(e: any) => setPriority(e.target.value)} className="bg-slate-950 p-2 text-white border border-slate-800 rounded">
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select value={audience} onChange={(e: any) => setAudience(e.target.value)} className="bg-slate-950 p-2 text-white border border-slate-800 rounded">
          <option value="all">All</option>
          <option value="guests">Guests</option>
          <option value="staff">Staff</option>
        </select>
      </div>
      <Button type="submit" loading={loading} variant="danger" className="w-full text-xs">Send alert</Button>
    </form>
  );
}

// -------------------------------------------------------------------------
// Danger zone planner (Mobile Specific)
// -------------------------------------------------------------------------
interface DangerZoneProps {
  dangerZones: MapDangerZone[];
  selectedFloor: number;
  setSelectedFloor: (f: number) => void;
  guests: MapGuest[];
}
function DangerZoneManager({ dangerZones, selectedFloor, setSelectedFloor, guests }: DangerZoneProps) {
  const [clickedPt, setClickedPt] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("high");
  const [radius, setRadius] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const floorZones = dangerZones.filter((z) => z.floor === selectedFloor);

  const handleAddHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickedPt || !label.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "danger_zones"), {
        floor: selectedFloor,
        label: label.trim(),
        severity,
        center: clickedPt,
        radiusMeters: Number(radius),
        active: true,
        updatedAt: new Date().toISOString(),
      });
      alert("Hazard zone uploaded.");
      setLabel("");
      setClickedPt(null);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveZone = async (id: string) => {
    if (confirm("Remove this hazard block?")) {
      try {
        await deleteDoc(doc(db, "danger_zones", id));
      } catch { }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>Corridor Hazard Pinner</span>
        <div className="flex gap-1">
          {[2, 3, 4].map((f) => (
            <button key={f} onClick={() => setSelectedFloor(f)} className={`px-2 py-0.5 rounded border text-[9px] ${selectedFloor === f ? "border-cyan-500 text-cyan-400" : "border-slate-800"}`}>
              F0{f}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56 relative rounded-xl overflow-hidden border border-slate-900 bg-slate-950">
        <StaffMap mode="geo" guests={guests} dangerZones={dangerZones} selectedFloor={selectedFloor} onDangerZoneSelectPoint={(lat, lng) => setClickedPt({ lat, lng })} selectedPoint={clickedPt} />
      </div>

      {clickedPt ? (
        <form onSubmit={handleAddHazard} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Hazard label..." className="w-full bg-slate-950 text-xs p-2 text-white border border-slate-800 rounded" required />
          <Button type="submit" variant="danger" loading={submitting} className="w-full text-xs">Drop hazard pin</Button>
        </form>
      ) : (
        <div className="p-3 bg-slate-950 text-center text-[10px] text-slate-500 rounded border border-slate-900">
          👉 Click coordinates on map above to position hazard blocks.
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400">Active Hazards</h3>
        <div className="space-y-2 max-h-36 overflow-y-auto">
          {floorZones.map((z) => (
            <div key={z.id} className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-xs font-bold text-slate-300">{z.label}</span>
              <button onClick={() => handleRemoveZone(z.id)} className="text-slate-500 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Incident detail inspector (Mobile Specific)
// -------------------------------------------------------------------------
interface IncidentDetailProps {
  incident: ExtendedIncident | null;
  incidents: ExtendedIncident[];
  onSelectIncidentId: (id: string) => void;
  guests: MapGuest[];
}
function IncidentDetailInspector({ incident, incidents, onSelectIncidentId, guests }: IncidentDetailProps) {
  const [updating, setUpdating] = useState(false);

  const associatedGuest = useMemo(() => {
    if (!incident) return null;
    return guests.find((g) => g.roomId === incident.roomId) || null;
  }, [incident, guests]);

  const handleUpdateStatus = async (status: "safe" | "needs_help" | "no_response") => {
    if (!associatedGuest) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "guests", associatedGuest.id), { status, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, "rooms", `room_${associatedGuest.roomId}`), { status: status === "safe" ? "evacuated" : status, updatedAt: new Date().toISOString() }, { merge: true });
      alert("Evacuation state updated.");
    } catch { } finally {
      setUpdating(false);
    }
  };

  if (!incident) return <div className="text-xs text-slate-500 text-center py-10">No incident selected.</div>;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
        <h3 className="text-xs font-extrabold text-slate-200">Room {incident.roomId} - {incident.title}</h3>
        <p className="text-[10px] text-slate-400">{incident.summary}</p>
      </div>

      {incident.mediaUrl ? (
        <div className="relative rounded-xl overflow-hidden bg-black max-h-52 flex items-center justify-center border border-slate-900 p-2">
          {incident.mediaUrl.endsWith(".mp4") ? (
            <video src={incident.mediaUrl} controls className="w-full max-h-48" />
          ) : incident.mediaUrl.endsWith(".webm") || incident.mediaUrl.includes("/audio/") ? (
            <audio src={incident.mediaUrl} controls className="w-full mt-2" />
          ) : (
            <img src={incident.mediaUrl} className="w-full max-h-48 object-contain" alt="SOS report" />
          )}
        </div>
      ) : null}

      {associatedGuest && (
        <div className="flex gap-2">
          <button type="button" onClick={() => handleUpdateStatus("safe")} className="flex-1 py-3 text-xs bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-lg">
            MARK RESCUED
          </button>
          <button type="button" onClick={() => handleUpdateStatus("needs_help")} className="flex-1 py-3 text-xs bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg">
            NEEDS HELP
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Native overlay modal wrapper (Mobile Specific)
// -------------------------------------------------------------------------
function MobileModalOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white p-4 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-950 pb-3 mb-4">
        <button onClick={onClose} className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/20 px-2.5 py-1.5 border border-cyan-500/20 rounded-lg">
          <ArrowLeft size={10} /> Back
        </button>
        <span className="text-xs font-extrabold uppercase">{title}</span>
        <button onClick={onClose} className="text-slate-500 font-bold">Close</button>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
