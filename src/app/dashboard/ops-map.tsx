"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as LeafletMap } from "leaflet";
import { divIcon } from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
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
type FenceKind = "restricted" | "silent" | "safe";

type Fence = {
  id: string;
  points: [number, number][];
  kind: FenceKind;
};

const FENCE_KINDS: { id: FenceKind; label: string; color: string }[] = [
  { id: "restricted", label: "Restricted zone", color: "#f87171" },
  { id: "silent", label: "Silent zone", color: "#a78bfa" },
  { id: "safe", label: "Safe zone", color: "#4ade80" },
];

type LayerView = "group" | "weapons";

const LAYER_VIEWS: { id: LayerView; label: string }[] = [
  { id: "group", label: "Group" },
  { id: "weapons", label: "Weapons" },
];

function kindColor(kind: FenceKind) {
  return FENCE_KINDS.find((item) => item.id === kind)?.color ?? FENCE_KINDS[0].color;
}

const TILES: Record<Basemap, string> = {
  map: OSM_TILES,
  satellite: SATELLITE_TILES,
  night: NIGHT_TILES,
};

type MapMarker = {
  id: string;
  label: string;
  position: [number, number];
  tone: "ok" | "warn" | "critical" | "info" | "idle";
  kind: "person" | "vehicle" | "ship" | "weapon";
  group?: "Alpha" | "Bravo";
  status?: string;
  role?: "danru";
};

type OpsMapProps = {
  markers: MapMarker[];
  showTracks: boolean;
  selected: string;
  cardOpen: boolean;
  focus?: {
    nonce: number;
    id: string;
    position: [number, number];
    kind: MapMarker["kind"] | "place";
    zoom?: number;
  } | null;
  onSelect: (id: string) => void;
  onViewChange?: (view: LayerView) => void;
};

const personGlyph = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.1" fill="#fff"/><path d="M6.2 19.2c.7-3.1 2.9-4.7 5.8-4.7s5.1 1.6 5.8 4.7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const weaponGlyph = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 13.2h8.2l.8-2.2h4.4L18 13.2h3v1.6h-1.1l-.9 2.6h-2.3L16.1 14.8H9.4L8.2 17H6.4l1.1-2.2H3v-1.6Z" fill="#fff"/><path d="M14.2 11V8.2h2.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function pinIcon(marker: MapMarker, selected: boolean) {
  if (marker.kind === "person") {
    const code = marker.label.startsWith("S-") ? marker.label : `S-${marker.label}`;
    const danru = marker.role === "danru";
    return divIcon({
      className: "cmd-person-wrap",
      html: `<span class="cmd-person${selected ? " is-selected" : ""}${danru ? " is-danru" : ""}"><span class="cmd-person-ring">${personGlyph}</span><span class="cmd-person-label">${code}</span>${danru ? '<span class="cmd-person-role">DANRU</span>' : ""}</span>`,
      iconSize: danru ? [76, 70] : [68, 54],
      iconAnchor: danru ? [38, 19] : [34, 17],
    });
  }

  if (marker.kind === "weapon") {
    const note = marker.status ? `<span class="cmd-weapon-status">${marker.status}</span>` : "";
    return divIcon({
      className: "cmd-weapon-wrap",
      html: `<span class="cmd-weapon is-${marker.tone}${selected ? " is-selected" : ""}"><span class="cmd-weapon-ring">${weaponGlyph}</span><span class="cmd-weapon-label">${marker.label}</span>${note}</span>`,
      iconSize: [92, 72],
      iconAnchor: [46, 20],
    });
  }

  const glyph = marker.kind === "ship" ? "⌁" : "▣";
  const label = marker.label ? `<span>${marker.label}</span>` : "";
  return divIcon({
    className: `cmd-marker is-${marker.tone}${selected ? " is-selected" : ""}`,
    html: `${glyph}${label}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function groupLinks(people: MapMarker[]) {
  const lines: { key: string; positions: [number, number][]; color: string }[] = [];
  const hubs = people.filter((person) => person.role === "danru");

  for (const hub of hubs) {
    const members = people.filter((person) => person.group === hub.group && person.id !== hub.id);
    const color = hub.group === "Bravo" ? "#38bdf8" : "#f59e0b";
    for (const member of members) {
      lines.push({
        key: `spoke-${hub.id}-${member.id}`,
        positions: [hub.position, member.position],
        color,
      });
    }
    const ordered = [...members].sort((a, b) => {
      const aa = Math.atan2(a.position[0] - hub.position[0], a.position[1] - hub.position[1]);
      const bb = Math.atan2(b.position[0] - hub.position[0], b.position[1] - hub.position[1]);
      return aa - bb;
    });
    for (let index = 0; index < ordered.length; index += 1) {
      const next = ordered[(index + 1) % ordered.length];
      if (!next || ordered.length < 2) continue;
      lines.push({
        key: `ring-${hub.id}-${ordered[index].id}-${next.id}`,
        positions: [ordered[index].position, next.position],
        color,
      });
    }
  }

  return lines;
}

function FlyToFocus({
  focus,
}: {
  focus: OpsMapProps["focus"];
}) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    map.flyTo(focus.position, focus.zoom ?? Math.max(map.getZoom(), 15), { duration: 0.7 });
  }, [map, focus]);
  return null;
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
  onClearSelect,
}: {
  enabled: boolean;
  onAdd: (position: [number, number]) => void;
  onFinish: () => void;
  onClearSelect: () => void;
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
      const target = event.originalEvent.target as HTMLElement | null;
      if (target?.closest(".leaflet-marker-icon, .cmd-person, .cmd-weapon, .cmd-fence")) return;
      if (!enabled) {
        onClearSelect();
        return;
      }
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
  focus,
  onSelect,
  onViewChange,
}: OpsMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [zoom, setZoom] = useState(MAP_ZOOM);
  const [basemap, setBasemap] = useState<Basemap>("night");
  const [drawing, setDrawing] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layer, setLayer] = useState<LayerView>("group");
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [fences, setFences] = useState<Fence[]>([]);
  const [selectedFence, setSelectedFence] = useState<string | null>(null);
  const [kind, setKind] = useState<FenceKind>("restricted");
  const color = kindColor(kind);
  const draftRef = useRef(draft);
  const fenceSeq = useRef(0);
  const finishing = useRef(false);
  draftRef.current = draft;

  const focusNonce = focus?.nonce;
  const focusKind = focus?.kind;
  useEffect(() => {
    if (focusKind === "weapon") {
      setLayer("weapons");
      setLayersOpen(false);
      onViewChange?.("weapons");
      return;
    }
    if (focusKind === "person") {
      setLayer("group");
      setLayersOpen(false);
      onViewChange?.("group");
    }
  }, [focusNonce, focusKind, onViewChange]);

  function finishFence() {
    if (finishing.current) return;
    const points = draftRef.current;
    if (points.length < 3) {
      setDraft([]);
      setDrawing(false);
      return;
    }
    finishing.current = true;
    const id = `fence-${++fenceSeq.current}`;
    setFences((items) => [...items, { id, points, kind }]);
    setDraft([]);
    setDrawing(false);
  }

  function applyFence() {
    if (drawing) {
      finishFence();
      return;
    }
    if (selectedFence) {
      setFences((items) =>
        items.map((fence) => (fence.id === selectedFence ? { ...fence, kind } : fence)),
      );
      return;
    }
    finishing.current = false;
    setDrawing(true);
    setGeoOpen(true);
  }

  function deleteFence() {
    if (drawing) {
      finishing.current = false;
      setDraft([]);
      setDrawing(false);
      return;
    }
    setFences((items) => {
      if (!items.length) return items;
      const target = selectedFence ?? items[items.length - 1].id;
      return items.filter((fence) => fence.id !== target);
    });
    setSelectedFence(null);
  }

  const shown = markers.filter((marker) =>
    layer === "weapons" ? marker.kind === "weapon" : marker.kind === "person",
  );
  const people = shown.filter((marker) => marker.kind === "person");
  const links = showTracks ? groupLinks(people) : [];

  return (
    <div
      className={`cmd-map${cardOpen ? " is-card-open" : ""}${drawing ? " is-placing" : ""}${layer === "weapons" ? " is-weapons" : ""}`}
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
        <ZoomSync onZoom={setZoom} />
        <FlyToFocus focus={focus} />
        <DrawGeofence
          enabled={drawing}
          onAdd={(position) => setDraft((current) => [...current, position])}
          onFinish={finishFence}
          onClearSelect={() => setSelectedFence(null)}
        />
        {layer !== "weapons"
          ? links.map((link) => (
              <Polyline
                key={link.key}
                positions={link.positions}
                pathOptions={{ color: link.color, weight: 2, dashArray: "2 8" }}
              />
            ))
          : null}
        {fences.map((fence) => {
          const active = selectedFence === fence.id;
          const preset = FENCE_KINDS.find((item) => item.id === fence.kind);
          const tone = kindColor(fence.kind);
          return (
            <Polygon
              key={fence.id}
              positions={fence.points}
              pathOptions={{
                className: "cmd-fence",
                color: tone,
                weight: active ? 3 : 2,
                fillColor: tone,
                fillOpacity: active ? 0.28 : 0.16,
                dashArray: fence.kind === "restricted" ? "6 6" : undefined,
              }}
              eventHandlers={{
                click: () => {
                  setSelectedFence(fence.id);
                  setKind(fence.kind);
                  setGeoOpen(true);
                },
              }}
            >
              <Tooltip direction="center" permanent className="cmd-zone-tip">
                {preset?.label ?? fence.kind}
              </Tooltip>
            </Polygon>
          );
        })}
        {draft.length > 1 ? (
          <Polyline positions={draft} pathOptions={{ color, weight: 2, dashArray: "6 6" }} />
        ) : null}
        {shown.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={pinIcon(marker, selected === marker.id)}
            eventHandlers={{ click: () => onSelect(marker.id) }}
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
        <div className="cmd-geo">
          <button
            type="button"
            className={drawing || geoOpen ? "is-active" : undefined}
            aria-label="Geofence tools"
            aria-haspopup="dialog"
            aria-expanded={geoOpen}
            onClick={() => {
              setGeoOpen((open) => !open);
              setLayersOpen(false);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4.2L19.4 8.8a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L4 15.8V20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="m13.6 6.2 4.2 4.2" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </button>
          {geoOpen ? (
            <div className="cmd-geo-menu" role="dialog" aria-label="Geofence settings">
              <p>Apply as</p>
              <div className="cmd-geo-kinds">
                {FENCE_KINDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={kind === item.id ? "is-active" : undefined}
                    onClick={() => setKind(item.id)}
                  >
                    <i style={{ background: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="cmd-geo-actions">
                <button type="button" className="is-apply" onClick={applyFence}>
                  Apply
                </button>
                <button
                  type="button"
                  className="is-delete"
                  disabled={!drawing && fences.length === 0}
                  onClick={deleteFence}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="cmd-layer">
          <button
            type="button"
            className={layersOpen || layer === "weapons" ? "is-active" : undefined}
            aria-label="Map layers"
            aria-haspopup="dialog"
            aria-expanded={layersOpen}
            onClick={() => {
              setLayersOpen((open) => !open);
              setGeoOpen(false);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 8.2 12 4l8 4.2-8 4.2L4 8.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="m6.2 12.2 5.8 3 5.8-3M6.2 16.2 12 19.2l5.8-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {layersOpen ? (
            <div className="cmd-geo-menu" role="dialog" aria-label="Show on map">
              <p>Show</p>
              <div className="cmd-geo-kinds">
                {LAYER_VIEWS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={layer === item.id ? "is-active" : undefined}
                    onClick={() => {
                      setLayer(item.id);
                      setLayersOpen(false);
                      onViewChange?.(item.id);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <Link href="/explorer" aria-label="Search explorer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M8.2 11h5.6M11 8.2v5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
