"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Polygon,
  CircleMarker,
  Circle,
  Tooltip,
  Popup,
  Polyline,
  ImageOverlay,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { RoomRecord } from "@/lib/responder/types";
import { DangerZone } from "@/lib/staff/types";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Configure Leaflet default icons
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

export interface MobileResponderMapProps {
  floor: number;
  rooms: RoomRecord[];
  selectedRoomId?: string;
  onSelectRoom?: (roomId: string) => void;
  dangerZones: DangerZone[];
  layerToggles: {
    gas: boolean;
    water: boolean;
    electrical: boolean;
    hazardZones: boolean;
    safePaths: boolean;
  };
}

// Generate Cartesian grid coordinates [y, x] matching the floor layout
function getRoomMapCoords(roomId: string): [number, number] {
  const roomNum = Number(roomId.slice(1)) || 1;
  const col = (roomNum - 1) % 6;
  const row = Math.floor((roomNum - 1) / 6);
  const x = 150 + col * 130;
  const y = 700 - row * 300;
  return [y, x];
}

// Floor base offsets
function offsetForFloor(floor: number) {
  return {
    lat: 40.75805 + (floor - 2) * 0.00017,
    lng: -73.98575 + (floor - 2) * 0.00008,
  };
}

// Translate geographical coordinates to Cartesian grid points [y, x]
function geoToCartesian(lat: number, lng: number, floor: number): [number, number] {
  const floorOffset = offsetForFloor(floor);
  
  const deltaLat = lat - floorOffset.lat;
  const deltaLng = lng - floorOffset.lng;

  const scaleX = -3500000;
  const scaleY = -3000000;
  
  const y = 450 + deltaLat * scaleY;
  const x = 500 + deltaLng * scaleX;
  
  return [
    Math.max(80, Math.min(820, y)),
    Math.max(80, Math.min(920, x))
  ];
}

export default function MobileResponderMap({
  floor,
  rooms,
  selectedRoomId,
  onSelectRoom,
  dangerZones,
  layerToggles,
}: MobileResponderMapProps) {
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

  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [900, 1000],
  ];

  // Filter rooms for active floor
  const floorRooms = useMemo(
    () => rooms.filter((r) => r.floor === floor),
    [rooms, floor]
  );

  // Filter danger zones for active floor
  const floorDangerZones = useMemo(
    () => dangerZones.filter((z) => z.floor === floor && z.active),
    [dangerZones, floor]
  );

  const safeEgressPath: [number, number][] = [
    [700, 800],
    [500, 800],
    [500, 650],
    [250, 650],
    [100, 650],
  ];

  return (
    <div className="w-full h-full bg-slate-950 relative overflow-hidden">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxZoom={2.0}
        minZoom={-1.2}
        zoom={-0.4}
        center={[450, 500]}
        className="w-full h-full bg-slate-950 text-slate-100 animate-fade-in"
        style={{ background: "#020617" }}
      >
        {imageUrl ? (
          <ImageOverlay url={imageUrl} bounds={bounds} />
        ) : (
          <>
            {/* Structural Building Outline */}
            <Polygon
              positions={[
                [50, 50],
                [850, 50],
                [850, 950],
                [50, 950],
              ]}
              pathOptions={{
                color: "#1e293b",
                weight: 2,
                fillColor: "#090d16",
                fillOpacity: 0.95,
              }}
            />

            {/* Central Corridor */}
            <Polygon
              positions={[
                [100, 440],
                [800, 440],
                [800, 560],
                [100, 560],
              ]}
              pathOptions={{
                color: "#0f172a",
                weight: 1,
                fillColor: "#0f172a",
                fillOpacity: 0.5,
              }}
            />
          </>
        )}

        {/* Egress Path Overlay */}
        {layerToggles.safePaths && (
          <>
            <Polyline
              positions={safeEgressPath}
              pathOptions={{
                color: "#10b981",
                weight: 4,
                dashArray: "6, 6",
                opacity: 0.75,
              }}
            />
            <CircleMarker
              center={[100, 650]}
              radius={8}
              pathOptions={{
                color: "#10b981",
                fillColor: "#065f46",
                fillOpacity: 0.9,
              }}
            >
              <Tooltip permanent direction="bottom" className="bg-slate-900/90 text-emerald-400 font-mono text-[8px] border border-slate-800 px-1 py-0.5 rounded">
                EXIT A
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Flat Infrastructure: Gas Valve */}
        {layerToggles.gas && (
          <CircleMarker
            center={[780, 200]}
            radius={14}
            pathOptions={{
              color: "#f97316",
              fillColor: "#431407",
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          >
            <Tooltip permanent direction="right" className="bg-slate-900/90 text-orange-500 font-mono text-[8px] border border-slate-800 px-1 py-0.5 rounded">
              GAS VALVE
            </Tooltip>
            <Popup>
              <div className="p-2 text-xs">
                <span className="font-bold text-amber-500 block">GAS MAIN 4A</span>
                <span className="text-slate-400 block mt-1">Status: Active</span>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Flat Infrastructure: Water Hydrant */}
        {layerToggles.water && (
          <CircleMarker
            center={[150, 200]}
            radius={14}
            pathOptions={{
              color: "#06b6d4",
              fillColor: "#083344",
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          >
            <Tooltip permanent direction="right" className="bg-slate-900/90 text-cyan-400 font-mono text-[8px] border border-slate-800 px-1 py-0.5 rounded">
              WATER
            </Tooltip>
            <Popup>
              <div className="p-2 text-xs">
                <span className="font-bold text-cyan-400 block">STANDPIPE B</span>
                <span className="text-slate-400 block mt-1">Pressure normal.</span>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Flat Infrastructure: Electrical Panel */}
        {layerToggles.electrical && (
          <CircleMarker
            center={[780, 800]}
            radius={14}
            pathOptions={{
              color: "#a855f7",
              fillColor: "#3b0764",
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          >
            <Tooltip permanent direction="left" className="bg-slate-900/90 text-purple-400 font-mono text-[8px] border border-slate-800 px-1 py-0.5 rounded">
              ELEC
            </Tooltip>
            <Popup>
              <div className="p-2 text-xs">
                <span className="font-bold text-purple-400 block">MAIN PANEL C</span>
                <span className="text-slate-400 block mt-1">Control active.</span>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Hazard Circles: Danger Zones */}
        {layerToggles.hazardZones &&
          floorDangerZones.map((zone) => {
            const coords = geoToCartesian(zone.center.lat, zone.center.lng, floor);
            
            let color = "#ef4444";
            let fillColor = "#7f1d1d";
            if (zone.severity === "critical") {
              color = "#f43f5e";
              fillColor = "#881337";
            } else if (zone.severity === "medium") {
              color = "#f97316";
              fillColor = "#7c2d12";
            } else if (zone.severity === "low") {
              color = "#eab308";
              fillColor = "#713f12";
            }

            const gridRadius = zone.radiusMeters * 2.5;

            return (
              <Circle
                key={zone.id}
                center={coords}
                radius={gridRadius}
                pathOptions={{
                  color,
                  weight: 1.5,
                  dashArray: "3, 3",
                  fillColor,
                  fillOpacity: 0.18,
                }}
              >
                <Tooltip permanent direction="top" className="bg-slate-900/90 text-red-400 font-mono text-[8px] border border-slate-800 px-1 py-0.5 rounded">
                  ⚠️ {zone.label.substring(0, 12).toUpperCase()}...
                </Tooltip>
              </Circle>
            );
          })}

        {/* Touch-optimized Room Nodes (Larger radius 18 for easy tapping on mobile screen) */}
        {floorRooms.map((room) => {
          const coords = getRoomMapCoords(room.roomId);
          const isSelected = selectedRoomId === room.roomId;
          
          let color = "#475569";
          let fillColor = "#1e293b";
          let labelColor = "text-slate-400";
          let badgeBg = "bg-slate-800 text-slate-300";

          if (room.status === "evacuated") {
            color = "#10b981";
            fillColor = "#064e3b";
            labelColor = "text-emerald-400";
            badgeBg = "bg-emerald-950/80 text-emerald-300 border border-emerald-900";
          } else if (room.status === "trapped") {
            color = "#f43f5e";
            fillColor = "#9f1239";
            labelColor = "text-rose-400";
            badgeBg = "bg-rose-950/80 text-rose-300 border border-rose-900";
          } else if (room.status === "no_response") {
            color = "#f97316";
            fillColor = "#7c2d12";
            labelColor = "text-amber-400";
            badgeBg = "bg-amber-950/80 text-amber-300 border border-amber-900";
          }

          if (isSelected) {
            color = "#06b6d4";
            fillColor = "#164e63";
            labelColor = "text-cyan-400";
          }

          return (
            <CircleMarker
              key={room.roomId}
              center={coords}
              radius={isSelected ? 22 : 18}
              pathOptions={{
                color,
                weight: isSelected ? 4 : 2,
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
                offset={[0, -10]}
                className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg border-none ${
                  room.status === "trapped"
                    ? "bg-rose-950/90 text-rose-300 animate-pulse border border-rose-800"
                    : room.status === "evacuated"
                    ? "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
                    : "bg-slate-900/90 text-slate-300 border border-slate-800"
                }`}
              >
                RM {room.roomId}
              </Tooltip>
              <Popup>
                <div className="p-2.5 bg-slate-950 text-slate-100 rounded-lg min-w-[160px] border border-slate-900 select-none">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1">
                    <span className={`text-[10px] font-mono font-bold ${labelColor}`}>ROOM {room.roomId}</span>
                    <span className={`text-[8px] uppercase px-1 py-0.5 rounded font-bold ${badgeBg}`}>
                      {room.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 space-y-0.5">
                    <p>Occupants: {room.occupantCount}</p>
                    {room.sos && (
                      <p className="text-rose-400 font-semibold truncate">SOS: {room.sos.text}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectRoom?.(room.roomId)}
                    className="mt-2 w-full py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800/60 font-bold text-[9px] rounded uppercase transition"
                  >
                    Open Translator
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
