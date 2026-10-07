"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Map as LeafletMap, LeafletMouseEvent } from "leaflet";
import { Map as LeafletMapClass, divIcon } from "leaflet";
import { LeafletContext, createLeafletContext } from "@react-leaflet/core";
import { Circle, Marker, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  MAP_CENTER,
  MAP_ZOOM,
  NIGHT_TILES,
  type DrawMode,
  type OpGeofence,
  type OpMarker,
} from "@/lib/operations";

export type { DrawMode };

function mapAlive(map: LeafletMap | null | undefined): map is LeafletMap {
  try {
    const el = map?.getContainer();
    return Boolean(el?.isConnected && (map as LeafletMap & { _loaded?: boolean })._loaded);
  } catch {
    return false;
  }
}

function withMap(map: LeafletMap | null | undefined, fn: (m: LeafletMap) => void) {
  if (!mapAlive(map)) return;
  try {
    fn(map);
  } catch {
    /* Leaflet throws _leaflet_pos during teardown / zero-size panes */
  }
}

type OperationsMapProps = {
  fences: OpGeofence[];
  markers?: OpMarker[];
  selectedFenceId?: string | null;
  selectedMarkerIds?: string[];
  drawMode?: DrawMode;
  draftPoints?: [number, number][];
  circleCenter?: [number, number] | null;
  circleRadiusM?: number;
  interactive?: boolean;
  className?: string;
  onSelectFence?: (id: string | null) => void;
  onSelectMarker?: (id: string) => void;
  onMapClick?: (position: [number, number]) => void;
  onDraftPoint?: (position: [number, number]) => void;
  onFinishPolygon?: () => void;
};

const personGlyph = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.1" fill="#fff"/><path d="M6.2 19.2c.7-3.1 2.9-4.7 5.8-4.7s5.1 1.6 5.8 4.7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`;

function pinIcon(marker: OpMarker, selected: boolean) {
  const code = marker.label.startsWith("S-") ? marker.label : `S-${marker.label}`;
  const danru = marker.role === "danru";
  return divIcon({
    className: "cmd-person-wrap",
    html: `<span class="cmd-person${selected ? " is-selected" : ""}${danru ? " is-danru" : ""}"><span class="cmd-person-ring">${personGlyph}</span><span class="cmd-person-label">${code}</span>${danru ? '<span class="cmd-person-role">DANRU</span>' : ""}</span>`,
    iconSize: danru ? [76, 70] : [68, 54],
    iconAnchor: danru ? [38, 19] : [34, 17],
  });
}

function NightFilter() {
  return (
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
  );
}

function MapCanvas({
  mapRef,
  children,
  className,
}: {
  mapRef: RefObject<LeafletMap | null>;
  children: ReactNode;
  className?: string;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<ReturnType<typeof createLeafletContext> | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    let map: LeafletMap | null = null;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled || !node.isConnected) return;
      const created = new LeafletMapClass(node, {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        minZoom: 3,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
      });
      map = created;
      mapRef.current = created;
      setContext(createLeafletContext(created));
      withMap(created, (m) => m.invalidateSize({ animate: false }));
      resizeObserver = new ResizeObserver(() => {
        if (cancelled) return;
        withMap(created, (m) => m.invalidateSize({ animate: false }));
      });
      resizeObserver.observe(node);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      resizeObserver = null;
      mapRef.current = null;
      if (map) {
        try {
          map.remove();
        } catch {
          /* ignore */
        }
        map = null;
      }
    };
  }, [mapRef]);

  return (
    <div ref={nodeRef} className={className ?? "op-leaflet"}>
      {context ? <LeafletContext value={context}>{children}</LeafletContext> : null}
    </div>
  );
}

function FitBounds({
  fences,
  markers,
}: {
  fences: OpGeofence[];
  markers: OpMarker[];
}) {
  const map = useMap();
  const key = `${fences.map((f) => f.id).join("|")}|${markers.map((m) => m.id).join("|")}`;
  useEffect(() => {
    const points: [number, number][] = [
      ...fences.flatMap((f) => f.points),
      ...markers.map((m) => m.position),
    ];
    if (!points.length) return;
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const id = window.requestAnimationFrame(() => {
      withMap(map, (m) => {
        m.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [36, 36], maxZoom: 15 },
        );
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [map, key, fences, markers]);
  return null;
}

function DrawHandler({
  drawMode,
  onDraftPoint,
  onFinishPolygon,
  onMapClick,
  onClearSelect,
}: {
  drawMode: DrawMode;
  onDraftPoint?: (position: [number, number]) => void;
  onFinishPolygon?: () => void;
  onMapClick?: (position: [number, number]) => void;
  onClearSelect?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    withMap(map, (m) => {
      if (drawMode !== "none") m.doubleClickZoom.disable();
      else m.doubleClickZoom.enable();
    });
    return () => {
      withMap(map, (m) => m.doubleClickZoom.enable());
    };
  }, [drawMode, map]);

  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      const target = event.originalEvent.target as HTMLElement | null;
      if (target?.closest(".leaflet-marker-icon, .op-person, .op-fence-hit")) return;
      const pos: [number, number] = [event.latlng.lat, event.latlng.lng];
      if (drawMode === "polygon") {
        if (event.originalEvent.detail > 1) {
          onFinishPolygon?.();
          return;
        }
        onDraftPoint?.(pos);
        return;
      }
      if (drawMode === "circle") {
        onMapClick?.(pos);
        return;
      }
      onClearSelect?.();
    },
  });
  return null;
}

export default function OperationsMap({
  fences,
  markers = [],
  selectedFenceId = null,
  selectedMarkerIds = [],
  drawMode = "none",
  draftPoints = [],
  circleCenter = null,
  circleRadiusM = 400,
  interactive = true,
  className,
  onSelectFence,
  onSelectMarker,
  onMapClick,
  onDraftPoint,
  onFinishPolygon,
}: OperationsMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      withMap(mapRef.current, (m) => m.invalidateSize({ animate: false }));
    }, 80);
    return () => window.clearTimeout(id);
  }, [fences.length, markers.length, drawMode]);

  return (
    <div className={`op-map cmd-map${className ? ` ${className}` : ""}`}>
      <NightFilter />
      <MapCanvas mapRef={mapRef}>
        <TileLayer url={NIGHT_TILES} className="cmd-tiles-night" maxZoom={19} />
        <FitBounds fences={fences} markers={markers} />
        {interactive ? (
          <DrawHandler
            drawMode={drawMode}
            onDraftPoint={onDraftPoint}
            onFinishPolygon={onFinishPolygon}
            onMapClick={onMapClick}
            onClearSelect={() => onSelectFence?.(null)}
          />
        ) : null}
        {fences.map((fence) => {
          const active = selectedFenceId === fence.id;
          return (
            <Polygon
              key={fence.id}
              positions={fence.points}
              pathOptions={{
                className: "cmd-fence",
                color: fence.color,
                fillColor: fence.color,
                fillOpacity: active ? 0.28 : 0.16,
                weight: active ? 3 : 2,
                dashArray: fence.kind === "restricted" ? "6 6" : undefined,
              }}
              eventHandlers={{
                click: () => onSelectFence?.(fence.id),
              }}
            >
              <Tooltip permanent direction="center" className="cmd-zone-tip">
                {fence.name}
              </Tooltip>
            </Polygon>
          );
        })}
        {draftPoints.length >= 2 ? (
          <Polyline positions={draftPoints} pathOptions={{ color: "#60a5fa", weight: 2, dashArray: "6 6" }} />
        ) : null}
        {draftPoints.length >= 3 ? (
          <Polygon
            positions={draftPoints}
            pathOptions={{ color: "#60a5fa", fillColor: "#60a5fa", fillOpacity: 0.12, weight: 2, dashArray: "6 6" }}
          />
        ) : null}
        {draftPoints.map((point, index) => (
          <Marker
            key={`draft-${index}`}
            position={point}
            icon={divIcon({
              className: "op-draft-dot",
              html: "<span></span>",
              iconSize: [10, 10],
              iconAnchor: [5, 5],
            })}
          />
        ))}
        {circleCenter ? (
          <Circle
            center={circleCenter}
            radius={circleRadiusM}
            pathOptions={{ color: "#60a5fa", fillColor: "#60a5fa", fillOpacity: 0.12, weight: 2, dashArray: "6 6" }}
          />
        ) : null}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={pinIcon(marker, selectedMarkerIds.includes(marker.id))}
            eventHandlers={{
              click: () => onSelectMarker?.(marker.id),
            }}
          />
        ))}
      </MapCanvas>
    </div>
  );
}
