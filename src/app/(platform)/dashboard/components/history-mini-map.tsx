"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const NIGHT_TILES = "/tiles/{z}/{x}/{y}.png";

type HistoryMiniMapProps = {
  path: [number, number][];
  index: number;
  compact?: boolean;
};

function pointIcon(kind: "past" | "active" | "next" | "event", compact: boolean) {
  const size = kind === "active" ? (compact ? 12 : 14) : compact ? 8 : 10;
  return divIcon({
    className: "cmd-history-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="cmd-history-pin-dot is-${kind}"></span>`,
  });
}

function SyncView({ path }: { path: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(id);
  }, [map]);

  useEffect(() => {
    if (!path.length) return;
    if (path.length === 1) {
      map.setView(path[0], map.getZoom(), { animate: false });
      return;
    }
    map.fitBounds(path, { padding: [18, 18], maxZoom: 16, animate: false });
  }, [map, path]);

  return null;
}

export default function HistoryMiniMap({ path, index, compact = false }: HistoryMiniMapProps) {
  const safeIndex = Math.min(Math.max(index, 0), Math.max(path.length - 1, 0));
  const center = path[0];
  if (!center) return null;
  const zoom = compact ? 15 : 14;
  const passed = path.slice(0, safeIndex + 1);

  return (
    <div
      className={`cmd-history-map-shell${compact ? " is-compact" : ""}`}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <MapContainer
        className={`cmd-history-leaflet${compact ? " is-compact" : ""}`}
        center={center}
        zoom={zoom}
        minZoom={compact ? 13 : 12}
        maxZoom={18}
        zoomControl={false}
        attributionControl={false}
        dragging
        doubleClickZoom
        scrollWheelZoom
        boxZoom={false}
        keyboard={false}
        touchZoom
      >
        <TileLayer url={NIGHT_TILES} className="cmd-tiles-night" maxZoom={19} />
        <SyncView path={path} />
        {path.length > 1 ? (
          <Polyline positions={path} pathOptions={{ color: "rgba(96,165,250,0.35)", weight: compact ? 2 : 3 }} />
        ) : null}
        {passed.length > 1 ? (
          <Polyline positions={passed} pathOptions={{ color: "#60a5fa", weight: compact ? 2 : 3 }} />
        ) : null}
        {path.map((position, pointIndex) => {
          const kind =
            pointIndex === safeIndex
              ? "active"
              : pointIndex < safeIndex
                ? "past"
                : pointIndex === path.length - 1
                  ? "event"
                  : "next";
          return <Marker key={`${position[0]}-${position[1]}-${pointIndex}`} position={position} icon={pointIcon(kind, compact)} />;
        })}
      </MapContainer>
    </div>
  );
}
