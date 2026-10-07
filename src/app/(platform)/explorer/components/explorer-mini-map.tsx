"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const NIGHT_TILES = "/tiles/{z}/{x}/{y}.png";

function SyncView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 60);
    return () => window.clearTimeout(id);
  }, [map, center]);
  useEffect(() => {
    map.setView(center, 15, { animate: false });
  }, [map, center]);
  return null;
}

export default function ExplorerMiniMap({ lat, lng }: { lat: number; lng: number }) {
  const center: [number, number] = [lat, lng];
  const icon = divIcon({
    className: "ex-map-pin",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: '<span class="ex-map-pin-dot"></span>',
  });

  return (
    <div className="ex-mini-map" aria-hidden="true">
      <svg className="cmd-night-filter" aria-hidden="true">
        <filter id="ex-mini-night" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
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
        className="ex-mini-leaflet"
        center={center}
        zoom={15}
        minZoom={13}
        maxZoom={18}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        touchZoom={false}
      >
        <TileLayer url={NIGHT_TILES} className="cmd-tiles-night" maxZoom={19} />
        <SyncView center={center} />
        <Marker position={center} icon={icon} />
      </MapContainer>
    </div>
  );
}
