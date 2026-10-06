"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const NIGHT_TILES = "/tiles/{z}/{x}/{y}.png";

export type TrackSource = "GNSS" | "Dead Reckoning" | "Trilateration" | "Stale";

export type TrackPoint = {
  position: [number, number];
  time: string;
  source: TrackSource;
  label?: string;
};

const SOURCE_COLOR: Record<TrackSource, string> = {
  GNSS: "#4ade80",
  "Dead Reckoning": "#60a5fa",
  Trilateration: "#f59e0b",
  Stale: "#94a3b8",
};

function sourceIcon(source: TrackSource, active: boolean, event = false) {
  const color = event ? "#ef4444" : SOURCE_COLOR[source];
  const size = active ? 16 : event ? 14 : 10;
  return divIcon({
    className: "hs-track-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="hs-track-dot${active ? " is-active" : ""}${event ? " is-event" : ""}" style="background:${color}"></span>`,
  });
}

function SyncView({ center, zoom, follow }: { center: [number, number]; zoom: number; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(id);
  }, [map]);
  useEffect(() => {
    if (!follow) return;
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom, follow]);
  return null;
}

function ZoomButtons() {
  const map = useMap();
  return (
    <div className="hs-zoom">
      <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()}>+</button>
      <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()}>−</button>
    </div>
  );
}

export default function HistoryTrackMap({
  points,
  index,
}: {
  points: TrackPoint[];
  index: number;
}) {
  const safeIndex = Math.min(Math.max(index, 0), Math.max(points.length - 1, 0));
  const active = points[safeIndex];
  if (!active) return null;
  const path = points.map((point) => point.position);
  const passed = path.slice(0, safeIndex + 1);

  return (
    <div className="hs-map-shell">
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
          <feColorMatrix in="SourceGraphic" type="matrix" result="rawMask" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -8 0 8 0 0" />
          <feComponentTransfer in="rawMask" result="mask">
            <feFuncA type="linear" slope="1" intercept="0" />
          </feComponentTransfer>
          <feFlood floodColor="#08111e" result="ocean" />
          <feComposite in="ocean" in2="mask" operator="in" result="oceanOnly" />
          <feComposite in="oceanOnly" in2="land" operator="over" />
        </filter>
      </svg>
      <MapContainer
        className="hs-leaflet"
        center={active.position}
        zoom={15}
        minZoom={11}
        maxZoom={18}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={NIGHT_TILES} className="cmd-tiles-night" maxZoom={19} />
        <SyncView center={active.position} zoom={15} follow />
        <ZoomButtons />
        {path.length > 1 ? (
          <Polyline positions={path} pathOptions={{ color: "rgba(96,165,250,0.35)", weight: 3 }} />
        ) : null}
        {passed.length > 1 ? (
          <Polyline positions={passed} pathOptions={{ color: "#60a5fa", weight: 3 }} />
        ) : null}
        {points.map((point, pointIndex) => (
          <Marker
            key={`${point.position[0]}-${point.position[1]}-${pointIndex}`}
            position={point.position}
            icon={sourceIcon(point.source, pointIndex === safeIndex, pointIndex === points.length - 1 && pointIndex !== safeIndex)}
          >
            {pointIndex === safeIndex ? (
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                <div className="hs-tip">
                  <strong>{point.time}</strong>
                  <span>{point.label ?? point.source}</span>
                </div>
              </Tooltip>
            ) : null}
          </Marker>
        ))}
      </MapContainer>
      <div className="hs-legend">
        <strong>Track Path</strong>
        {(Object.keys(SOURCE_COLOR) as TrackSource[]).map((source) => (
          <span key={source}>
            <i style={{ background: SOURCE_COLOR[source] }} />
            {source}
          </span>
        ))}
        <span>
          <i className="is-event" />
          Event Marker
        </span>
      </div>
    </div>
  );
}
