"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  CircleMarker,
  Tooltip,
  ImageOverlay,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { RoomRecord } from "@/lib/responder/types";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Configure default Leaflet icons cleanly for modern browsers
let leafletIconsConfigured = false;
function configureLeafletIcons() {
  if (leafletIconsConfigured) return;
  const defaultPrototype = L.Icon.Default.prototype as any;
  delete defaultPrototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
  leafletIconsConfigured = true;
}

export interface ResponderMapProps {
  floor: number;
  rooms: RoomRecord[];
  selectedRoomId?: string;
  onSelectRoom?: (roomId: string) => void;
  layerToggles: {
    gas: boolean;
    water: boolean;
    electrical: boolean;
    hazardRoutes: boolean;
    safePaths: boolean;
  };
  compact?: boolean;
}

// Generate simple coordinates on an indoor Cartesian grid (0 to 1000) for L.CRS.Simple
function getRoomMapCoords(roomId: string): [number, number] {
  const roomNum = Number(roomId.slice(1)) || 1;
  const col = (roomNum - 1) % 6;
  const row = Math.floor((roomNum - 1) / 6);
  // Y from top to bottom (800 down to 200), X from left to right (150 to 850)
  const x = 150 + col * 130;
  const y = 700 - row * 300;
  return [y, x];
}

export default function ResponderMap({
  floor,
  rooms,
  selectedRoomId,
  onSelectRoom,
  layerToggles,
  compact = false,
}: ResponderMapProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    configureLeafletIcons();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "floor_plans", `floor_${floor}`), (docSnap) => {
      if (docSnap.exists()) {
        setImageUrl(docSnap.data().secureUrl || null);
      } else {
        setImageUrl(null);
      }
    }, (err) => {
      console.warn("Firestore error fetching floor plan:", err);
      setImageUrl(null);
    });
    return () => unsub();
  }, [floor]);

  // Filter rooms for the active floor
  const floorRooms = useMemo(
    () => rooms.filter((r) => r.floor === floor),
    [rooms, floor]
  );

  // Define floor plan boundaries in L.CRS.Simple ([Y, X])
  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [900, 1000],
  ];

  // Simulated hazard zones (blocked corridors)
  const blockedCorridor: [number, number][] = [
    [450, 250],
    [550, 250],
    [550, 480],
    [450, 480],
  ];

  // Dynamic safe evacuation egress route
  const safeEgressPath: [number, number][] = [
    [700, 800],
    [500, 800],
    [500, 650],
    [250, 650],
    [100, 650], // Emergency Assembly Exit Alpha
  ];

  return (
    <div className="relative w-full h-full min-h-[340px] bg-slate-950 font-sans">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxZoom={2}
        minZoom={-1}
        zoom={compact ? -0.3 : 0.2}
        center={[450, 500]}
        className="w-full h-full bg-slate-950 text-slate-900"
        style={{ background: "#020617" }}
      >
        {imageUrl ? (
          <ImageOverlay url={imageUrl} bounds={bounds} />
        ) : (
          <>
            {/* Outer Building Structural Wall Outline */}
            <Polygon
              positions={[
                [50, 50],
                [850, 50],
                [850, 950],
                [50, 950],
              ]}
              pathOptions={{
                color: "#334155",
                weight: 6,
                fillColor: "#0f172a",
                fillOpacity: 0.9,
              }}
            />

            {/* Central North-South Main Corridor */}
            <Polygon
              positions={[
                [100, 440],
                [800, 440],
                [800, 560],
                [100, 560],
              ]}
              pathOptions={{
                color: "#1e293b",
                weight: 2,
                fillColor: "#1e293b",
                fillOpacity: 0.5,
              }}
            />
          </>
        )}

        {/* Blocked Routes / Hazard Barrier Overlay */}
        {layerToggles.hazardRoutes && (
          <Polygon
            positions={blockedCorridor}
            pathOptions={{
              color: "#f43f5e",
              weight: 2,
              dashArray: "8, 8",
              fillColor: "#ef4444",
              fillOpacity: 0.4,
            }}
          >
            <Tooltip permanent direction="top" className="bg-rose-900 text-white font-bold text-xs border-none">
              🔥 HAZARD AREA: SMOKE & FIRE
            </Tooltip>
          </Polygon>
        )}

        {/* Dynamic Safe Egress Path */}
        {layerToggles.safePaths && (
          <>
            <Polyline
              positions={safeEgressPath}
              pathOptions={{
                color: "#10b981",
                weight: 6,
                dashArray: "12, 10",
                opacity: 0.95,
              }}
            />
            <CircleMarker
              center={[100, 650]}
              radius={12}
              pathOptions={{ color: "#10b981", fillColor: "#059669", fillOpacity: 1 }}
            >
              <Tooltip permanent direction="bottom" className="bg-emerald-800 text-white font-bold text-xs">
                🚨 EXIT ALPHA (SAFE EGRESS)
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Geo-Infrastructure: Gas Shutoffs */}
        {layerToggles.gas && (
          <CircleMarker
            center={[780, 200]}
            radius={14}
            pathOptions={{ color: "#f97316", fillColor: "#c2410c", fillOpacity: 0.9, weight: 3 }}
          >
            <Tooltip permanent direction="right" className="bg-amber-900 text-amber-100 font-bold text-xs">
              ⚡ GAS SHUTOFF VALVE 4A
            </Tooltip>
            <Popup>
              <div className="p-2 min-w-[180px]">
                <h4 className="font-bold text-amber-500 uppercase text-sm">Gas Main Valve 4A</h4>
                <p className="text-xs text-slate-600 mt-1">Status: ACTIVE // Requires manual key cutoff in case of fire progression.</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Geo-Infrastructure: Water Shutoffs */}
        {layerToggles.water && (
          <CircleMarker
            center={[150, 200]}
            radius={14}
            pathOptions={{ color: "#06b6d4", fillColor: "#0e7490", fillOpacity: 0.9, weight: 3 }}
          >
            <Tooltip permanent direction="right" className="bg-cyan-900 text-cyan-100 font-bold text-xs">
              💧 WATER RISER / HYDRANT B
            </Tooltip>
            <Popup>
              <div className="p-2 min-w-[180px]">
                <h4 className="font-bold text-cyan-500 uppercase text-sm">Standpipe & Hydrant B</h4>
                <p className="text-xs text-slate-600 mt-1">Status: OPTIMAL PRESSURE (145 PSI). Hose connectivity active for Engine 4.</p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Geo-Infrastructure: Electrical Vaults */}
        {layerToggles.electrical && (
          <CircleMarker
            center={[780, 800]}
            radius={14}
            pathOptions={{ color: "#a855f7", fillColor: "#6b21a8", fillOpacity: 0.9, weight: 3 }}
          >
            <Tooltip permanent direction="left" className="bg-purple-900 text-purple-100 font-bold text-xs">
              ⚡ ELEC VAULT C
            </Tooltip>
          </CircleMarker>
        )}

        {/* Room Markers & Occupant Status */}
        {floorRooms.map((room) => {
          const coords = getRoomMapCoords(room.roomId);
          const isSelected = selectedRoomId === room.roomId;
          let color = "#64748b"; // checking / neutral
          let fillColor = "#334155";
          let label = `RM ${room.roomId}`;

          if (room.status === "evacuated") {
            color = "#10b981";
            fillColor = "#059669";
          } else if (room.status === "trapped") {
            color = "#f43f5e";
            fillColor = "#e11d48";
          } else if (room.status === "no_response") {
            color = "#f97316";
            fillColor = "#d97706";
          }

          if (isSelected) {
            color = "#38bdf8";
            fillColor = "#0284c7";
          }

          return (
            <CircleMarker
              key={room.roomId}
              center={coords}
              radius={isSelected ? 22 : 18}
              pathOptions={{
                color: isSelected ? "#38bdf8" : color,
                weight: isSelected ? 4 : 3,
                fillColor,
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => onSelectRoom?.(room.roomId),
              }}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -14]}
                className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded shadow border-none ${
                  room.status === "trapped"
                    ? "bg-rose-600 text-white animate-pulse"
                    : room.status === "evacuated"
                    ? "bg-emerald-700 text-emerald-100"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                {label}
              </Tooltip>
              <Popup className="tactical-popup">
                <div className="p-3 bg-slate-900 text-slate-100 rounded-lg min-w-[220px] shadow-xl border border-slate-700">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <span className="text-sm font-black text-cyan-400 font-mono">ROOM {room.roomId}</span>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                      room.status === "trapped" ? "bg-rose-500 text-white" : room.status === "evacuated" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                    }`}>
                      {room.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-1">
                    <strong className="text-slate-400">Floor:</strong> Level {room.floor}
                  </p>
                  <p className="text-xs text-slate-300 mb-1">
                    <strong className="text-slate-400">Occupants:</strong> {room.occupantCount || 1} Registered
                  </p>
                  <p className="text-xs text-slate-300 mb-2">
                    <strong className="text-slate-400">Signal:</strong> {room.signalStrength.toUpperCase()}
                  </p>
                  {room.sos && (
                    <div className="p-2 bg-rose-950 border border-rose-700 rounded text-rose-200 text-xs mt-2">
                      <div className="font-bold uppercase text-[10px] text-rose-400 mb-0.5">🚨 SOS ALERT LOGGED:</div>
                      &quot;{room.sos.text}&quot;
                    </div>
                  )}
                  <button
                    onClick={() => onSelectRoom?.(room.roomId)}
                    className="mt-3 w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition uppercase tracking-wider"
                  >
                    Select Target in Comms
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Coordinate reference grid overlay watermark */}
      <div className="absolute bottom-3 left-3 z-[400] pointer-events-none px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded border border-slate-800 text-[10px] font-mono text-cyan-400 tracking-wider">
        SYS: L.CRS.Simple // SECTOR: NY-GRID-ALPHA // FL-{floor}
      </div>
    </div>
  );
}
