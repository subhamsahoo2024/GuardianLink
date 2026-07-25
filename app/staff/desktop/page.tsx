"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  UploadCloud,
  Map,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Activity
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
  onSnapshot,
} from "firebase/firestore";

// Dynamically import client-only StaffMap to prevent SSR errors (Leaflet requires 'window')
const StaffMap = dynamic(() => import("../StaffMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400">
      <Loader2 className="mr-2 h-6 w-6 animate-spin text-cyan-400" />
      Loading Tactical Interface Map...
    </div>
  )
});

import { MapNode, MapGuest, MapDangerZone } from "../StaffMap";
import { Incident, Broadcast } from "@/lib/staff/types";
import { ExtendedIncident } from "../page";

// Passcode Gate Details
const demoBypassEnabled = process.env.NEXT_PUBLIC_STAFF_DEMO_BYPASS !== "false";
const demoPasscode = process.env.NEXT_PUBLIC_STAFF_DEMO_PASSCODE || "guardian-staff-demo";

export default function DesktopStaffPage() {
  const [mounted, setMounted] = useState(false);
  const [authenticated, setAuthenticated] = useState(demoBypassEnabled);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Sync states
  const [guests, setGuests] = useState<MapGuest[]>([]);
  const [incidents, setIncidents] = useState<ExtendedIncident[]>([]);
  const [dangerZones, setDangerZones] = useState<MapDangerZone[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  // Floor settings
  const [activeFloor, setActiveFloor] = useState(4);
  const [floorPlans, setFloorPlans] = useState<Record<number, string>>({});
  const [floorNodes, setFloorNodes] = useState<Record<number, MapNode[]>>({});

  const [nodeType, setNodeType] = useState<"walkable" | "portal">("walkable");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingNodes, setSavingNodes] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync data & load initial localStorage cache
  useEffect(() => {
    if (!authenticated) return;

    // LocalStorage initial pre-population (safely wrapped)
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
          } catch {}
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
          label: data.label || "Hazard",
          severity: data.severity || "high",
          center: data.center || { lat: 40.7582, lng: -73.9855 },
          radiusMeters: Number(data.radiusMeters) || 15,
          active: data.active !== false,
        } as MapDangerZone;
      });
      setDangerZones(items);
    }, (err) => console.warn("Firestore danger zones subscription failed:", err));

    const unsubFloorPlans = onSnapshot(collection(db, "floor_plans"), (snap) => {
      const plansMap: Record<number, string> = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        plansMap[Number(data.floor)] = data.secureUrl || "";
      });
      setFloorPlans((prev) => ({ ...prev, ...plansMap }));
    }, (err) => {
      console.warn("Firestore plans subscription failed, using local fallback.", err);
      const plansMap: Record<number, string> = {};
      try {
        [2, 3, 4].forEach((f) => {
          const p = localStorage.getItem(`floor_plan_${f}`);
          if (p) plansMap[f] = p;
        });
      } catch {}
      setFloorPlans((prev) => ({ ...prev, ...plansMap }));
    });

    const unsubFloorNodes = onSnapshot(collection(db, "floor_nodes"), (snap) => {
      const nodesMap: Record<number, MapNode[]> = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        nodesMap[Number(data.floor)] = data.nodes || [];
      });
      setFloorNodes((prev) => ({ ...prev, ...nodesMap }));
    }, (err) => {
      console.warn("Firestore nodes subscription failed, using local fallback.", err);
      const nodesMap: Record<number, MapNode[]> = {};
      try {
        [2, 3, 4].forEach((f) => {
          const n = localStorage.getItem(`floor_nodes_${f}`);
          if (n) {
            try {
              nodesMap[f] = JSON.parse(n);
            } catch {}
          }
        });
      } catch {}
      setFloorNodes((prev) => ({ ...prev, ...nodesMap }));
    });

    // REST API Polling Fallback loop
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
    };

    pollAll();
    const pollTimer = setInterval(pollAll, 6000);

    return () => {
      unsubGuests();
      unsubIncidents();
      unsubZones();
      unsubFloorPlans();
      unsubFloorNodes();
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

  // Cloudinary Map Uploader
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      alert("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET variables.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", "guardianlink/maps");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload to Cloudinary.");
      const payload = await response.json();

      try {
        await setDoc(doc(db, "floor_plans", `floor_${activeFloor}`), {
          floor: activeFloor,
          secureUrl: payload.secure_url,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn("Firestore upload floor_plans failed, using local cache:", error);
      }
      try {
        localStorage.setItem(`floor_plan_${activeFloor}`, payload.secure_url);
      } catch {}
      setFloorPlans((prev) => ({ ...prev, [activeFloor]: payload.secure_url }));
      alert(`Floor ${activeFloor} map successfully uploaded and saved.`);
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      await uploadToCloudinary(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadToCloudinary(file);
  };

  // Node Canvas operations
  const currentFloorUrl = floorPlans[activeFloor] || "";
  const currentNodes = floorNodes[activeFloor] || [];

  const handleNodeAdd = async (x: number, y: number) => {
    const newNode: MapNode = {
      id: `node-${Date.now()}`,
      x,
      y,
      type: nodeType,
    };
    const updated = [...currentNodes, newNode];
    await saveNodes(updated);
  };

  const handleNodeRemove = async (id: string) => {
    const updated = currentNodes.filter((n) => n.id !== id);
    await saveNodes(updated);
  };

  const handleClearNodes = async () => {
    if (confirm("Clear all nodes on this floor plan?")) {
      await saveNodes([]);
    }
  };

  const saveNodes = async (nodesToSave: MapNode[]) => {
    setSavingNodes(true);
    try {
      await setDoc(doc(db, "floor_nodes", `floor_${activeFloor}`), {
        floor: activeFloor,
        nodes: nodesToSave,
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.warn("Firestore save floor_nodes failed:", error);
    } finally {
      try {
        localStorage.setItem(`floor_nodes_${activeFloor}`, JSON.stringify(nodesToSave));
      } catch {}
      setFloorNodes((prev) => ({ ...prev, [activeFloor]: nodesToSave }));
      setSavingNodes(false);
    }
  };

  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const needsHelpCount = guests.filter((g) => g.status === "needs_help").length;

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
            <h1 className="text-2xl font-extrabold text-white">GuardianLink Desktop Portal</h1>
            <p className="mt-1 text-sm text-slate-400">Authorize staff credentials for layout control.</p>
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
            <Button variant="primary" onClick={handleAuthSubmit} className="w-full">Unlock Dashboard</Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-6 font-sans bg-slate-950 text-white">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-950 p-2 border border-cyan-500/20 text-cyan-400">
            <Activity size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">GuardianLink Desktop Setup</h1>
            <p className="text-xs text-slate-400">Infrastructure Setup & Configuration Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <Badge variant={criticalCount > 0 ? "danger" : "safe"} dot pulse>
            SOS Incidents: {criticalCount}
          </Badge>
          <Badge variant={needsHelpCount > 0 ? "danger" : "neutral"} dot>
            Trapped Guests: {needsHelpCount}
          </Badge>
          <Button variant="ghost" size="sm" onClick={seedMockCrisisData}>
            Seed Simulation
          </Button>
          <Link href="/">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
              PWA Interface
            </Button>
          </Link>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Floor Selection */}
          <Card variant="glass" className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Floor Selection</h2>
            <div className="flex gap-2">
              {[2, 3, 4].map((floor) => (
                <button
                  key={floor}
                  onClick={() => setActiveFloor(floor)}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl border transition-all ${
                    activeFloor === floor
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Floor 0{floor}
                </button>
              ))}
            </div>
          </Card>

          {/* Drag & Drop Map Zone */}
          <Card variant="glass" className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Feature A: Drag & Drop</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragging ? "border-cyan-400 bg-cyan-500/5" : "border-slate-800 bg-slate-900/40"
              }`}
            >
              {uploading ? (
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="mx-auto text-slate-500 h-10 w-10" />
                  <p className="text-sm font-semibold">Drop Map JPG/PNG</p>
                  <label className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 cursor-pointer inline-block">
                    Select File
                    <input type="file" onChange={handleFileSelect} className="hidden" accept="image/*" />
                  </label>
                </div>
              )}
            </div>
          </Card>

          {/* Node Plotting Controls */}
          <Card variant="glass" className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Feature B: Plotter Controls</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setNodeType("walkable")}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all ${
                  nodeType === "walkable" ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                Walkable Node
              </button>
              <button
                onClick={() => setNodeType("portal")}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all ${
                  nodeType === "portal" ? "bg-orange-500/10 border-orange-500 text-orange-400" : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                Portal Node
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={handleClearNodes} className="flex-1 text-xs" disabled={currentNodes.length === 0}>
                Clear
              </Button>
              <Button variant="primary" onClick={() => saveNodes(currentNodes)} className="flex-1 text-xs" loading={savingNodes}>
                Save Canvas
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Canvas overlay */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          <Card variant="glass" className="p-4 flex-1 flex flex-col space-y-4 h-full">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Canvas Overlay Plotting</h2>
              <span className="text-[10px] text-slate-500">L.CRS.Simple</span>
            </div>
            <div className="flex-1 relative rounded-xl overflow-hidden min-h-[450px]">
              <StaffMap
                mode="crs-simple"
                imageUrl={currentFloorUrl}
                nodes={currentNodes}
                onNodeAdd={handleNodeAdd}
                onNodeRemove={handleNodeRemove}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
