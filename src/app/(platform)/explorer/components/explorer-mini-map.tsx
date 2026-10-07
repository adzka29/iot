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
