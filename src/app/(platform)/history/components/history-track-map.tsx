"use client";

import { useEffect, useRef, useState } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { positionSourceColor } from "@/lib/history";
import "leaflet/dist/leaflet.css";

const NIGHT_TILES = "/tiles/{z}/{x}/{y}.png";

export type TrackPoint = {
  position: [number, number];
  time: string;
  source: string | null;
  label?: string;
};

function sourceIcon(source: string | null, active: boolean) {
  const color = positionSourceColor(source);
  const size = active ? 16 : 10;
  return divIcon({
    className: "hs-track-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="hs-track-dot${active ? " is-active" : ""}" style="background:${color}"></span>`,
  });
}

function SyncView({
  center,
  follow,
  pointCount,
}: {
  center: [number, number];
  follow: boolean;
  pointCount: number;
}) {
  const map = useMap();

  useEffect(() => {
    const refresh = () => map.invalidateSize({ animate: false });
    const id = window.setTimeout(refresh, 80);
    const id2 = window.setTimeout(refresh, 320);
    window.addEventListener("resize", refresh);
    const root = map.getContainer().parentElement;
    const observer =
      root && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => refresh()) : null;
    if (root) observer?.observe(root);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(id2);
      window.removeEventListener("resize", refresh);
      observer?.disconnect();
    };
  }, [map, pointCount]);

  useEffect(() => {
    if (!follow) return;
    // panTo keeps the user's zoom level; only camera center follows the track.
    map.panTo(center, { animate: true });
  }, [map, center, follow]);

  return null;
}

function UnlockFollow({ onUserMove }: { onUserMove: () => void }) {
  useMapEvents({
    dragstart() {
      onUserMove();
    },
    zoomstart() {
      onUserMove();
    },
  });
  return null;
}

function ZoomButtons({ onUserZoom }: { onUserZoom: () => void }) {
  const map = useMap();
  return (
    <div className="hs-zoom">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => {
          onUserZoom();
          map.zoomIn();
        }}
      >
        +
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => {
          onUserZoom();
          map.zoomOut();
        }}
      >
        −
      </button>
    </div>
  );
}

export default function HistoryTrackMap({
  points,
  index,
  playing = false,
}: {
  points: TrackPoint[];
  index: number;
  playing?: boolean;
}) {
  const safeIndex = Math.min(Math.max(index, 0), Math.max(points.length - 1, 0));
  const active = points[safeIndex];
  const [follow, setFollow] = useState(true);
  const wasPlaying = useRef(playing);

  useEffect(() => {
    if (playing && !wasPlaying.current) setFollow(true);
    wasPlaying.current = playing;
  }, [playing]);

  useEffect(() => {
    setFollow(true);
  }, [points.length]);

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
        className="hs-leaflet"
        center={active.position}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={NIGHT_TILES} className="cmd-tiles-night" maxZoom={19} />
        <SyncView center={active.position} follow={follow} pointCount={points.length} />
        <UnlockFollow onUserMove={() => setFollow(false)} />
        <ZoomButtons onUserZoom={() => setFollow(false)} />
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
            icon={sourceIcon(point.source, pointIndex === safeIndex)}
          >
            {point.label ? (
              <Tooltip direction="top" offset={[0, -8]}>
                {point.label}
              </Tooltip>
            ) : null}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
