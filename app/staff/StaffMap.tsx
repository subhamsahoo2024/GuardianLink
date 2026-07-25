"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  Circle,
  CircleMarker,
  Popup,
  useMapEvents,
  Marker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Configure Leaflet default icons for markers
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

// Subcomponent to handle map clicks
function MapClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export type MapNode = {
  id: string;
  x: number;
  y: number;
  type: "walkable" | "portal";
  label?: string;
};

export type MapGuest = {
  id: string;
  roomId: string;
  floor: number;
  lat: number;
  lng: number;
  status: "safe" | "needs_help" | "no_response";
};

export type MapDangerZone = {
  id: string;
  floor: number;
  label: string;
  severity: "low" | "medium" | "high" | "critical";
  center: { lat: number; lng: number };
  radiusMeters: number;
  active: boolean;
};

interface StaffMapProps {
  mode: "crs-simple" | "geo";
  // CRS.Simple props
  imageUrl?: string;
  nodes?: MapNode[];
  onNodeAdd?: (x: number, y: number) => void;
  onNodeRemove?: (id: string) => void;
  // Geo props
  guests?: MapGuest[];
  dangerZones?: MapDangerZone[];
  selectedFloor?: number;
  onDangerZoneSelectPoint?: (lat: number, lng: number) => void;
  selectedPoint?: { lat: number; lng: number } | null;
}

export default function StaffMap({
  mode,
  imageUrl,
  nodes = [],
  onNodeAdd,
  onNodeRemove,
  guests = [],
  dangerZones = [],
  selectedFloor = 4,
  onDangerZoneSelectPoint,
  selectedPoint,
}: StaffMapProps) {
  const [iconsConfigured, setIconsConfigured] = useState(false);

  useEffect(() => {
    configureLeafletIcons();
    setIconsConfigured(true);
  }, []);

  if (!iconsConfigured) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
        Initializing Canvas Map...
      </div>
    );
  }

  // CRS Simple Map rendering
  if (mode === "crs-simple") {
    // We define a standard coordinate grid boundary (e.g. 0 to 1000) for local coordinates
    const bounds: L.LatLngBoundsExpression = [
      [0, 0],
      [800, 1000],
    ];

    return (
      <div className="relative h-full w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
        {imageUrl ? (
          <MapContainer
            crs={L.CRS.Simple}
            bounds={bounds}
            maxZoom={4}
            minZoom={-2}
            scrollWheelZoom={true}
            className="h-full w-full bg-slate-950"
            style={{ height: "100%", width: "100%" }}
          >
            <ImageOverlay url={imageUrl} bounds={bounds} />
            
            {onNodeAdd && (
              <MapClickHandler
                onClick={(latlng) => {
                  // Y is lat, X is lng
                  onNodeAdd(latlng.lng, latlng.lat);
                }}
              />
            )}

            {/* Render walkable nodes */}
            {nodes.map((node) => {
              const isWalkable = node.type === "walkable";
              return (
                <CircleMarker
                  key={node.id}
                  center={[node.y, node.x]}
                  radius={isWalkable ? 6 : 8}
                  pathOptions={{
                    color: isWalkable ? "#06b6d4" : "#f97316", // Cyan for Walkable, Orange for Portal
                    fillColor: isWalkable ? "#0891b2" : "#ea580c",
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-slate-900 text-xs">
                      <p className="font-bold">
                        {isWalkable ? "Walkable Node" : "Portal Node (Stair/Elevator)"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        X: {node.x.toFixed(1)}, Y: {node.y.toFixed(1)}
                      </p>
                      {onNodeRemove && (
                        <button
                          type="button"
                          onClick={() => onNodeRemove(node.id)}
                          className="mt-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-red-700"
                        >
                          Delete Node
                        </button>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400 text-sm">
            Drag and upload a floor plan to visualize the node plotting canvas.
          </div>
        )}
      </div>
    );
  }

  // Geographic Heatmap & Danger Zone pinning map
  const defaultCenter: L.LatLngExpression = [40.7582, -73.9855];
  const cartoTileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const cartoAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const floorGuests = guests.filter((g) => g.floor === selectedFloor);
  const floorZones = dangerZones.filter((z) => z.floor === selectedFloor && z.active);

  const getGuestColor = (status: MapGuest["status"]) => {
    if (status === "needs_help") return "#ef4444"; // Red Danger
    if (status === "safe") return "#10b981"; // Green Rescued/Safe
    return "#6b7280"; // Gray No response
  };

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
      <MapContainer
        center={defaultCenter}
        zoom={19}
        maxZoom={21}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer attribution={cartoAttribution} url={cartoTileUrl} />

        {onDangerZoneSelectPoint && (
          <MapClickHandler
            onClick={(latlng) => {
              onDangerZoneSelectPoint(latlng.lat, latlng.lng);
            }}
          />
        )}

        {/* Selected Danger Zone center point marker */}
        {selectedPoint && (
          <Marker position={[selectedPoint.lat, selectedPoint.lng]}>
            <Popup>
              <span className="text-xs text-slate-800 font-bold">New Hazard Anchor Pin</span>
            </Popup>
          </Marker>
        )}

        {/* Heatmap/Blurred circle markers for guests */}
        {floorGuests.map((guest) => {
          const color = getGuestColor(guest.status);
          const isDanger = guest.status === "needs_help";
          return (
            <div key={guest.id}>
              {/* Core solid marker */}
              <CircleMarker
                center={[guest.lat, guest.lng]}
                radius={6}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: color,
                  fillOpacity: 1,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs font-semibold">
                    Room {guest.roomId} (Floor {guest.floor})
                    <p className="text-[10px] text-slate-500 font-normal">
                      Status: <span className="capitalize">{guest.status.replace("_", " ")}</span>
                    </p>
                  </div>
                </Popup>
              </CircleMarker>

              {/* Heavy blurred heatmap halo using multiple fading transparent circles */}
              <Circle
                center={[guest.lat, guest.lng]}
                radius={isDanger ? 18 : 12}
                pathOptions={{
                  color: color,
                  weight: 0,
                  fillColor: color,
                  fillOpacity: 0.22,
                }}
              />
              <Circle
                center={[guest.lat, guest.lng]}
                radius={isDanger ? 32 : 22}
                pathOptions={{
                  color: color,
                  weight: 0,
                  fillColor: color,
                  fillOpacity: 0.08,
                }}
              />
            </div>
          );
        })}

        {/* Danger Zones */}
        {floorZones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.center.lat, zone.center.lng]}
            radius={zone.radiusMeters}
            pathOptions={{
              color: zone.severity === "critical" ? "#dc2626" : "#f87171",
              weight: 1.5,
              fillColor: zone.severity === "critical" ? "#ef4444" : "#fca5a5",
              fillOpacity: 0.25,
            }}
          >
            <Popup>
              <div className="text-slate-900 text-xs">
                <span className="font-bold">{zone.label}</span>
                <p className="text-[10px] text-slate-500">
                  Floor {zone.floor} • Severity: {zone.severity}
                </p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
