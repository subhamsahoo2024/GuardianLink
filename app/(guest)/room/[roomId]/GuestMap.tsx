"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  ImageOverlay,
  CircleMarker,
  Circle,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapNode } from "@/app/staff/StaffMap";

// Configure default Leaflet icons
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

export interface GuestMapProps {
  floorPlanUrl: string;
  nodes: MapNode[];
  roomId: string;
}

function getRoomMapCoords(roomId: string): [number, number] {
  const roomNum = Number(roomId.slice(1)) || 1;
  const col = (roomNum - 1) % 6;
  const row = Math.floor((roomNum - 1) / 6);
  // Matches responder coordinate formulas
  const x = 150 + col * 130;
  const y = 700 - row * 300;
  return [y, x];
}

export default function GuestMap({ floorPlanUrl, nodes, roomId }: GuestMapProps) {
  useEffect(() => {
    configureLeafletIcons();
  }, []);

  const bounds: L.LatLngBoundsExpression = [
    [0, 0],
    [900, 1000],
  ];

  const coords = getRoomMapCoords(roomId);

  return (
    <div className="relative w-full h-full bg-slate-950 font-sans border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxBounds={bounds}
        maxZoom={2.5}
        minZoom={-0.8}
        zoom={0}
        center={[450, 500]}
        className="w-full h-full bg-slate-950 text-slate-100"
        style={{ background: "#090d16" }}
      >
        <ImageOverlay url={floorPlanUrl} bounds={bounds} />

        {/* Walkable and portal nodes plotted by staff */}
        {nodes.map((node) => {
          const isWalkable = node.type === "walkable";
          return (
            <CircleMarker
              key={node.id}
              center={[node.y, node.x]}
              radius={isWalkable ? 5 : 7}
              pathOptions={{
                color: isWalkable ? "#06b6d4" : "#f97316", // Cyan for Walkable, Orange for Portal
                fillColor: isWalkable ? "#0891b2" : "#ea580c",
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" className="bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-200 px-1.5 py-0.5 rounded shadow">
                {isWalkable ? "Walkway / Corridor" : "Exit Portal (Stairs/Elevator)"}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Pulsing red halo under Guest Room */}
        <Circle
          center={coords}
          radius={45}
          pathOptions={{
            color: "#ef4444",
            weight: 0,
            fillColor: "#ef4444",
            fillOpacity: 0.15,
          }}
        />
        <Circle
          center={coords}
          radius={22}
          pathOptions={{
            color: "#ef4444",
            weight: 0,
            fillColor: "#ef4444",
            fillOpacity: 0.35,
          }}
        />

        {/* Primary Guest Room marker */}
        <CircleMarker
          center={coords}
          radius={12}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 1,
          }}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -10]}
            className="bg-red-950 border border-red-700 text-red-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg animate-pulse"
          >
            YOU ARE HERE (RM {roomId})
          </Tooltip>
        </CircleMarker>
      </MapContainer>

      {/* Coordinate watermark */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] pointer-events-none px-2 py-0.5 bg-slate-950/90 rounded border border-slate-900 text-[9px] font-mono text-cyan-400">
        SYS: L.CRS.Simple // YOUR ROOM: {roomId}
      </div>
    </div>
  );
}
