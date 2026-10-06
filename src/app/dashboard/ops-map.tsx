"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { divIcon } from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

export const MAP_CENTER: [number, number] = [-6.175421, 106.827312];
export const MAP_ZOOM = 13;

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const NIGHT_TILES = "/tiles/{z}/{x}/{y}.png";
const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
type Basemap = "map" | "satellite" | "night";

const TILES: Record<Basemap, string> = {
  map: OSM_TILES,
  satellite: SATELLITE_TILES,
  night: NIGHT_TILES,
};

const tracks = {
  green: [
    [-6.178, 106.808],
    [-6.182, 106.812],
    [-6.1754, 106.8273],
  ] as [number, number][],
  blue: [
    [-6.1754, 106.8273],
    [-6.181, 106.845],
    [-6.168, 106.852],
    [-6.188, 106.858],
  ] as [number, number][],
  red: [
    [-6.1754, 106.8273],
    [-6.184, 106.822],
    [-6.192, 106.821],
  ] as [number, number][],
};

type MapMarker = {
  id: string;
  label: string;
  position: [number, number];
  tone: "ok" | "warn" | "critical" | "info";
  kind: "person" | "vehicle" | "ship" | "weapon";
};

type OpsMapProps = {
  markers: MapMarker[];
  showTracks: boolean;
  selected: string;
  cardOpen: boolean;
  onSelect: (id: string) => void;
};

const personGlyph = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.1" fill="#fff"/><path d="M6.2 19.2c.7-3.1 2.9-4.7 5.8-4.7s5.1 1.6 5.8 4.7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`;

function pinIcon(marker: MapMarker, selected: boolean) {
  if (marker.kind === "person") {
    const code = marker.label.startsWith("S-") ? marker.label : `S-${marker.label}`;
    return divIcon({
      className: "cmd-person-wrap",
      html: `<span class="cmd-person${selected ? " is-selected" : ""}"><span class="cmd-person-ring">${personGlyph}</span><span class="cmd-person-label">${code}</span></span>`,
      iconSize: [68, 54],
      iconAnchor: [34, 17],
    });
  }

  const glyph = marker.kind === "ship" ? "⌁" : marker.kind === "weapon" ? "⌖" : "▣";
  const label = marker.label ? `<span>${marker.label}</span>` : "";
  return divIcon({
    className: `cmd-marker is-${marker.tone}${selected ? " is-selected" : ""}`,
    html: `${glyph}${label}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function ZoomSync({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMap();
  useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}

function DrawGeofence({
  enabled,
  onAdd,
  onFinish,
}: {
  enabled: boolean;
  onAdd: (position: [number, number]) => void;
  onFinish: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (enabled) map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    return () => {
      map.doubleClickZoom.enable();
    };
  }, [enabled, map]);

  useMapEvents({
    click: (event) => {
      if (!enabled) return;
      const target = event.originalEvent.target as HTMLElement | null;
      if (target?.closest(".leaflet-marker-icon, .cmd-person")) return;
      if (event.originalEvent.detail > 1) {
        onFinish();
        return;
      }
      onAdd([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

export default function OpsMap({
  markers,
  showTracks,
  selected,
  cardOpen,
  onSelect,
}: OpsMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [zoom, setZoom] = useState(MAP_ZOOM);
  const [basemap, setBasemap] = useState<Basemap>("night");
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [fences, setFences] = useState<[number, number][][]>([]);

  function finishFence() {
    setDraft((current) => {
      if (current.length >= 3) setFences((items) => [...items, current]);
      return [];
    });
    setDrawing(false);
  }

  function toggleDraw() {
    if (drawing) finishFence();
    else setDrawing(true);
  }

  return (
    <div
      className={`cmd-map${cardOpen ? " is-card-open" : ""}${drawing ? " is-placing" : ""}`}
      data-basemap={basemap}
    >
      <svg className="cmd-night-filter" aria-hidden="true">
        <filter id="cmd-night" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            result="tinted"
            values="-0.0883 -0.9053 -0.0064 0 1 -0.2395 -0.6517 -0.1088 0 1 -0.3181 -0.7844 0.1025 0 1 0 0 0 1 0"
          />
          <feComponentTransfer in="tinted" result="land">
            <feFuncR type="linear" slope="0.62" intercept="0.19" />
            <feFuncG type="linear" slope="0.62" intercept="0.19" />
            <feFuncB type="linear" slope="0.62" intercept="0.19" />
          </feComponentTransfer>
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            result="rawMask"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -8 0 8 0 0"
          />
          <feComponentTransfer in="rawMask" result="mask">
            <feFuncA type="linear" slope="1" intercept="0" />
          </feComponentTransfer>
          <feFlood floodColor="#08111e" result="ocean" />
          <feComposite in="ocean" in2="mask" operator="in" result="oceanOnly" />
          <feComposite in="oceanOnly" in2="land" operator="over" />
        </filter>
      </svg>
      <MapContainer
        ref={mapRef}
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          key={basemap}
          url={TILES[basemap]}
          className={basemap === "night" ? "cmd-tiles-night" : ""}
          maxZoom={19}
        />
        <ScaleControl imperial={false} position="bottomleft" />
        <ZoomSync onZoom={setZoom} />
        <DrawGeofence
          enabled={drawing}
          onAdd={(position) => setDraft((current) => [...current, position])}
          onFinish={finishFence}
        />
        {showTracks ? (
          <>
            <Polyline positions={tracks.green} pathOptions={{ color: "#4ade80", weight: 2, dashArray: "2 8" }} />
            <Polyline positions={tracks.blue} pathOptions={{ color: "#38bdf8", weight: 2, dashArray: "2 8" }} />
            <Polyline positions={tracks.red} pathOptions={{ color: "#fb7185", weight: 2, dashArray: "2 8" }} />
          </>
        ) : null}
        {fences.map((fence, index) => (
          <Polygon
            key={`fence-${index}`}
            positions={fence}
            pathOptions={{ color: "#22d3ee", weight: 2, fillColor: "#22d3ee", fillOpacity: 0.16 }}
          />
        ))}
        {draft.length > 1 ? (
          <Polyline positions={draft} pathOptions={{ color: "#22d3ee", weight: 2, dashArray: "6 6" }} />
        ) : null}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={pinIcon(marker, selected === marker.id || selected === marker.id.replace("b", ""))}
            eventHandlers={{ click: () => onSelect(marker.id.replace("b", "")) }}
          />
        ))}
      </MapContainer>
      <div className="cmd-basemap" role="group" aria-label="Map style">
        <button
          type="button"
          className={basemap === "satellite" ? "is-active" : undefined}
          onClick={() => setBasemap("satellite")}
        >
          Satellite
        </button>
        <button
          type="button"
          className={basemap === "night" ? "is-active" : undefined}
          onClick={() => setBasemap("night")}
        >
          Night
        </button>
      </div>
      <div className="cmd-rail">
        <button type="button" aria-label="Zoom in" disabled={zoom >= 19} onClick={() => mapRef.current?.zoomIn()}>+</button>
        <button type="button" aria-label="Zoom out" disabled={zoom <= 3} onClick={() => mapRef.current?.zoomOut()}>−</button>
        <button
          type="button"
          className={drawing ? "is-active" : undefined}
          aria-label="Draw geofence"
          aria-pressed={drawing}
          onClick={toggleDraw}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 20h4.2L19.4 8.8a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L4 15.8V20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="m13.6 6.2 4.2 4.2" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
