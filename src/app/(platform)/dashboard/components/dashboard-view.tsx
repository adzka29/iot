"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import TopHeader from "@/components/TopHeader";
import { alertTypeLabel, coordLabel, formatAlertDate, formatSeen, listAlerts, severityLabel, type AlertRecord } from "@/lib/alerts";
import {
  categoryLabel,
  entityLabel,
  latestPinsFromExplorer,
  listExplorer,
  recordSummary,
  type ExplorerRecord,
  type LiveSoldierPin,
} from "@/lib/explorer";
import {
  downsampleTrackPoints,
  formatHistoryClock,
  formatHistoryTime,
  listHistoryTrack,
  titleizeHistory,
  type HistoryTrackPoint,
} from "@/lib/history";
import { readSessionId } from "@/lib/session";

const OpsMap = dynamic(() => import("./ops-map"), { ssr: false });
const HistoryMiniMap = dynamic(() => import("./history-mini-map"), { ssr: false });

type Marker = {
  id: string;
  label: string;
  position: [number, number];
  tone: "ok" | "warn" | "critical" | "info" | "idle";
  kind: "person" | "vehicle" | "ship" | "weapon";
  group?: string;
  status?: string;
  role?: "danru";
};

/** Weapons stay as overlay; people come from explorer TELEMETRY. */
const weaponMarkers: Marker[] = [
  { id: "wpn-008", label: "WPN-008", position: [-6.166, 106.814], tone: "ok", kind: "weapon", status: "Connected" },
  { id: "wpn-015", label: "WPN-015", position: [-6.168, 106.823], tone: "ok", kind: "weapon", status: "Connected" },
  { id: "wpn-002", label: "WPN-002", position: [-6.174, 106.826], tone: "ok", kind: "weapon", status: "Connected" },
  { id: "wpn-013", label: "WPN-013", position: [-6.172, 106.808], tone: "critical", kind: "weapon", status: "Disconnected" },
  { id: "wpn-012", label: "WPN-012", position: [-6.181, 106.825], tone: "warn", kind: "weapon", status: "Low Battery" },
  { id: "wpn-004", label: "WPN-004", position: [-6.179, 106.832], tone: "warn", kind: "weapon", status: "Low Battery" },
  { id: "wpn-016", label: "WPN-016", position: [-6.178, 106.848], tone: "warn", kind: "weapon", status: "Low Battery" },
  { id: "wpn-006", label: "WPN-006", position: [-6.171, 106.842], tone: "ok", kind: "weapon", status: "Connected" },
  { id: "wpn-011", label: "WPN-011", position: [-6.174, 106.850], tone: "ok", kind: "weapon", status: "Connected" },
  { id: "wpn-010", label: "WPN-010", position: [-6.186, 106.812], tone: "idle", kind: "weapon", status: "Unassigned" },
  { id: "wpn-009", label: "WPN-009", position: [-6.190, 106.828], tone: "info", kind: "weapon", status: "Maintenance" },
  { id: "wpn-014", label: "WPN-014", position: [-6.191, 106.838], tone: "info", kind: "weapon", status: "Maintenance" },
];

const MAP_POLL_MS = 5000;

type Tone = "ok" | "warn" | "bad";

type Reading = {
  label: string;
  value: string;
  note: string;
  tone: Tone;
};

type SoldierEvent = {
  id?: number;
  color: string;
  time: string;
  text: string;
};

type Dossier = {
  unit: string;
  status: string;
  gnss: string;
  seen: string;
  overview: Reading[];
  vitals: Reading[];
  gear: Reading[];
  events: SoldierEvent[];
};

function pinToMarker(pin: LiveSoldierPin): Marker {
  return {
    id: String(pin.soldierId),
    label: pin.label,
    position: pin.position,
    tone: pin.tone,
    kind: "person",
    ...(pin.group ? { group: pin.group } : {}),
  };
}

function relativeSeen(iso: string) {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}

function dossierFromPin(pin: LiveSoldierPin): Dossier {
  const t = pin.telemetry;
  const f = t.flags;
  const status = f.sos ? "SOS" : f.casualty ? "Casualty" : pin.tone === "warn" ? "Warning" : "Active";
  const hrTone: Tone = t.hr >= 110 || f.arrhythmia ? "bad" : t.hr >= 95 ? "warn" : "ok";
  const battTone: Tone = t.batt < 25 || f.low_battery ? "bad" : t.batt < 40 ? "warn" : "ok";
  const group = pin.group ?? "Ungrouped";
  return {
    unit: `${group}`,
    status,
    gnss: pin.positionSource ?? f.position_source ?? "GNSS",
    seen: relativeSeen(pin.eventTime),
    overview: [
      {
        label: "Heart Rate",
        value: `${t.hr} bpm`,
        note: hrTone === "ok" ? "Normal" : hrTone === "warn" ? "Elevated" : "Critical",
        tone: hrTone,
      },
      {
        label: "HRV",
        value: `${t.hrv} ms`,
        note: t.hrv < 30 ? "Low" : "Steady",
        tone: t.hrv < 30 ? "warn" : "ok",
      },
      {
        label: "Battery",
        value: `${t.batt}%`,
        note: battTone === "ok" ? "Good" : battTone === "warn" ? "Fair" : "Low",
        tone: battTone,
      },
    ],
    vitals: [
      { label: "Heart Rate", value: `${t.hr} bpm`, note: hrTone === "ok" ? "Resting" : "Watch", tone: hrTone },
      { label: "HRV", value: `${t.hrv} ms`, note: t.hrv < 30 ? "Low" : "Steady", tone: t.hrv < 30 ? "warn" : "ok" },
      {
        label: "Body Temp",
        value: `${t.temp.toFixed(1)} °C`,
        note: f.heat_stress ? "Heat stress" : "Normal",
        tone: f.heat_stress ? "warn" : "ok",
      },
      { label: "SpO2", value: `${t.spo2}%`, note: t.spo2 < 95 ? "Low" : "Normal", tone: t.spo2 < 95 ? "warn" : "ok" },
    ],
    gear: [
      {
        label: "Chest Strap",
        value: f.strap_connected ? "Connected" : "Disconnected",
        note: t.vital ?? (f.strap_connected ? "OK" : "No vitals"),
        tone: f.strap_connected ? "ok" : "warn",
      },
      {
        label: "Battery",
        value: `${t.batt}%`,
        note: battTone === "ok" ? "Healthy" : "Check pack",
        tone: battTone,
      },
      {
        label: "GNSS",
        value: pin.positionSource ?? f.position_source ?? "GNSS",
        note: `${pin.position[0].toFixed(5)}, ${pin.position[1].toFixed(5)}`,
        tone: "ok",
      },
    ],
    events: [],
  };
}

function withHistory(events: SoldierEvent[]): SoldierEvent[] {
  return [
    ...events,
    { color: "#3b82f6", time: "13:12", text: "Mesh frame forwarded" },
    { color: "#22c55e", time: "12:58", text: "Battery report received" },
    { color: "#3b82f6", time: "12:41", text: "Position update accepted" },
    { color: "#22c55e", time: "12:19", text: "Telemetry burst delivered" },
    { color: "#a78bfa", time: "11:54", text: "Gateway handshake ok" },
    { color: "#3b82f6", time: "11:28", text: "Moved into sector watch" },
    { color: "#22c55e", time: "11:02", text: "Chest strap heartbeat ok" },
    { color: "#22c55e", time: "10:37", text: "GNSS lock maintained" },
    { color: "#3b82f6", time: "10:08", text: "Route waypoint crossed" },
    { color: "#22c55e", time: "09:44", text: "Radio channel confirmed" },
  ];
}

function historyTone(source: string | null): "ok" | "warn" | "stale" {
  const key = (source ?? "").toUpperCase();
  if (key === "STALE") return "stale";
  if (key === "DEAD_RECKONING" || key === "TRILATERATION") return "warn";
  return "ok";
}

/** Mount Leaflet thumbs only while the row is on screen — full track can be hundreds of points. */
function LazyHistoryThumb({
  path,
  index,
  time,
}: {
  path: [number, number][];
  index: number;
  time: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="cmd-history-thumb" aria-hidden="true">
      {visible && path.length ? <HistoryMiniMap path={path} index={index} compact /> : null}
      <b>{time}</b>
    </div>
  );
}

const dossiers: Record<string, Dossier> = {
  "101": {
    unit: "Alpha 1-1 · Group Alpha",
    status: "Active",
    gnss: "±6 m",
    seen: "1 minute ago",
    overview: [
      { label: "Heart Rate", value: "74 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "54 ms", note: "Normal", tone: "ok" },
      { label: "Battery", value: "91%", note: "Good", tone: "ok" },
    ],
    vitals: [
      { label: "Heart Rate", value: "74 bpm", note: "Resting range", tone: "ok" },
      { label: "HRV", value: "54 ms", note: "Steady", tone: "ok" },
      { label: "Body Temp", value: "36.6 °C", note: "Normal", tone: "ok" },
      { label: "SpO2", value: "99%", note: "Normal", tone: "ok" },
      { label: "Respiration", value: "14 rpm", note: "Calm", tone: "ok" },
      { label: "Skin Temp", value: "33.1 °C", note: "Normal", tone: "ok" },
    ],
    gear: [
      { label: "Chest Strap", value: "Connected", note: "Firmware 2.4.1", tone: "ok" },
      { label: "Radio", value: "Mesh", note: "Channel 4 · −61 dBm", tone: "ok" },
      { label: "Battery", value: "91%", note: "Pack A · healthy", tone: "ok" },
      { label: "GNSS", value: "Locked", note: "12 satellites", tone: "ok" },
    ],
    events: withHistory([
      { color: "#22c55e", time: "14:26", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:18", text: "Holding position" },
      { color: "#22c55e", time: "14:05", text: "Heart rate resting (74 bpm)" },
      { color: "#22c55e", time: "13:41", text: "Radio check acknowledged" },
    ]),
  },
  "103": {
    unit: "Alpha 1-1 · Group Alpha",
    status: "Active",
    gnss: "±7 m",
    seen: "2 minutes ago",
    overview: [
      { label: "Heart Rate", value: "82 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "46 ms", note: "Normal", tone: "ok" },
      { label: "Battery", value: "78%", note: "Good", tone: "ok" },
    ],
    vitals: [
      { label: "Heart Rate", value: "81 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "47 ms", note: "Steady", tone: "ok" },
      { label: "Body Temp", value: "36.7 °C", note: "Normal", tone: "ok" },
      { label: "SpO2", value: "98%", note: "Normal", tone: "ok" },
      { label: "Respiration", value: "15 rpm", note: "Normal", tone: "ok" },
      { label: "Skin Temp", value: "33.4 °C", note: "Normal", tone: "ok" },
    ],
    gear: [
      { label: "Chest Strap", value: "Connected", note: "Firmware 2.4.1", tone: "ok" },
      { label: "Radio", value: "Mesh", note: "Channel 4 · −64 dBm", tone: "ok" },
      { label: "Battery", value: "77%", note: "Pack A · healthy", tone: "ok" },
      { label: "GNSS", value: "Locked", note: "11 satellites", tone: "ok" },
    ],
    events: withHistory([
      { color: "#22c55e", time: "14:24", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:16", text: "Moved 64 m east" },
      { color: "#22c55e", time: "14:02", text: "Heart rate normal (81 bpm)" },
      { color: "#22c55e", time: "13:48", text: "Chest strap synced" },
    ]),
  },
  "104": {
    unit: "DANRU · Alpha 1-2 · Group Alpha",
    status: "SOS",
    gnss: "±8 m",
    seen: "4 minutes ago",
    overview: [
      { label: "Heart Rate", value: "118 bpm", note: "Elevated", tone: "bad" },
      { label: "HRV", value: "28 ms", note: "Low", tone: "warn" },
      { label: "Battery", value: "64%", note: "Fair", tone: "warn" },
    ],
    vitals: [
      { label: "Heart Rate", value: "118 bpm", note: "Above baseline", tone: "bad" },
      { label: "HRV", value: "28 ms", note: "Dropped 18 ms", tone: "warn" },
      { label: "Body Temp", value: "37.4 °C", note: "Slightly high", tone: "warn" },
      { label: "SpO2", value: "96%", note: "Watch", tone: "warn" },
      { label: "Respiration", value: "22 rpm", note: "Fast", tone: "warn" },
      { label: "Skin Temp", value: "34.8 °C", note: "Warm", tone: "ok" },
    ],
    gear: [
      { label: "Chest Strap", value: "Connected", note: "Firmware 2.4.1", tone: "ok" },
      { label: "Radio", value: "Mesh", note: "Channel 4 · −58 dBm", tone: "ok" },
      { label: "Battery", value: "64%", note: "Pack A · discharging", tone: "warn" },
      { label: "GNSS", value: "Locked", note: "9 satellites · ±8 m", tone: "ok" },
    ],
    events: withHistory([
      { color: "#ef4444", time: "14:24", text: "SOS beacon active" },
      { color: "#f59e0b", time: "14:21", text: "Heart rate elevated (118 bpm)" },
      { color: "#3b82f6", time: "14:20", text: "Moved 86 m northeast" },
      { color: "#22c55e", time: "14:11", text: "GNSS fix restored (±8 m)" },
    ]),
  },
  "106": {
    unit: "Alpha 1-3 · Group Alpha",
    status: "Warning",
    gnss: "±11 m",
    seen: "6 minutes ago",
    overview: [
      { label: "Heart Rate", value: "97 bpm", note: "High", tone: "warn" },
      { label: "HRV", value: "31 ms", note: "Low", tone: "warn" },
      { label: "Battery", value: "22%", note: "Low", tone: "bad" },
    ],
    vitals: [
      { label: "Heart Rate", value: "97 bpm", note: "Above baseline", tone: "warn" },
      { label: "HRV", value: "31 ms", note: "Low", tone: "warn" },
      { label: "Body Temp", value: "37.1 °C", note: "Warm", tone: "ok" },
      { label: "SpO2", value: "97%", note: "Normal", tone: "ok" },
      { label: "Respiration", value: "18 rpm", note: "Slightly fast", tone: "warn" },
      { label: "Skin Temp", value: "34.2 °C", note: "Normal", tone: "ok" },
    ],
    gear: [
      { label: "Chest Strap", value: "Intermittent", note: "Reseat the strap", tone: "warn" },
      { label: "Radio", value: "Mesh", note: "Channel 4 · −79 dBm", tone: "warn" },
      { label: "Battery", value: "22%", note: "Under 1 h left", tone: "bad" },
      { label: "GNSS", value: "Locked", note: "8 satellites · ±11 m", tone: "warn" },
    ],
    events: withHistory([
      { color: "#ef4444", time: "14:19", text: "Battery low (22%)" },
      { color: "#f59e0b", time: "14:14", text: "Chest strap signal dropping" },
      { color: "#f59e0b", time: "14:08", text: "Heart rate high (97 bpm)" },
      { color: "#3b82f6", time: "13:57", text: "Moved 40 m south" },
    ]),
  },
  "107": {
    unit: "DANRU · Bravo 2-1 · Group Bravo",
    status: "Active",
    gnss: "±5 m",
    seen: "Just now",
    overview: [
      { label: "Heart Rate", value: "76 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "51 ms", note: "Normal", tone: "ok" },
      { label: "Battery", value: "83%", note: "Good", tone: "ok" },
    ],
    vitals: [
      { label: "Heart Rate", value: "76 bpm", note: "Resting", tone: "ok" },
      { label: "HRV", value: "51 ms", note: "Steady", tone: "ok" },
      { label: "Body Temp", value: "36.5 °C", note: "Normal", tone: "ok" },
      { label: "SpO2", value: "99%", note: "Normal", tone: "ok" },
      { label: "Respiration", value: "14 rpm", note: "Calm", tone: "ok" },
      { label: "Skin Temp", value: "32.9 °C", note: "Normal", tone: "ok" },
    ],
    gear: [
      { label: "Chest Strap", value: "Connected", note: "Firmware 2.4.1", tone: "ok" },
      { label: "Radio", value: "Mesh", note: "Channel 6 · −57 dBm", tone: "ok" },
      { label: "Battery", value: "83%", note: "Pack B · healthy", tone: "ok" },
      { label: "GNSS", value: "Locked", note: "14 satellites", tone: "ok" },
    ],
    events: withHistory([
      { color: "#22c55e", time: "14:27", text: "Telemetry received" },
      { color: "#22c55e", time: "14:12", text: "Heart rate resting (76 bpm)" },
      { color: "#3b82f6", time: "13:55", text: "Position hold confirmed" },
      { color: "#22c55e", time: "13:30", text: "Radio check acknowledged" },
    ]),
  },
  "107b": {
    unit: "Bravo 2-2 · Group Bravo",
    status: "Active",
    gnss: "±6 m",
    seen: "3 minutes ago",
    overview: [
      { label: "Heart Rate", value: "79 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "49 ms", note: "Normal", tone: "ok" },
      { label: "Battery", value: "88%", note: "Good", tone: "ok" },
    ],
    vitals: [
      { label: "Heart Rate", value: "79 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "49 ms", note: "Steady", tone: "ok" },
      { label: "Body Temp", value: "36.6 °C", note: "Normal", tone: "ok" },
      { label: "SpO2", value: "98%", note: "Normal", tone: "ok" },
      { label: "Respiration", value: "15 rpm", note: "Normal", tone: "ok" },
      { label: "Skin Temp", value: "33.0 °C", note: "Normal", tone: "ok" },
    ],
    gear: [
      { label: "Chest Strap", value: "Connected", note: "Firmware 2.4.0", tone: "ok" },
      { label: "Radio", value: "Mesh", note: "Channel 6 · −63 dBm", tone: "ok" },
      { label: "Battery", value: "88%", note: "Pack B · healthy", tone: "ok" },
      { label: "GNSS", value: "Locked", note: "13 satellites", tone: "ok" },
    ],
    events: withHistory([
      { color: "#22c55e", time: "14:23", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:09", text: "Moved 35 m southeast" },
      { color: "#22c55e", time: "13:58", text: "Heart rate normal (79 bpm)" },
      { color: "#22c55e", time: "13:22", text: "Chest strap synced" },
    ]),
  },
  "108": {
    unit: "Bravo 2-1 · Group Bravo",
    status: "Active",
    gnss: "±7 m",
    seen: "2 minutes ago",
    overview: [
      { label: "Heart Rate", value: "84 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "44 ms", note: "Normal", tone: "ok" },
      { label: "Battery", value: "70%", note: "Good", tone: "ok" },
    ],
    vitals: [
      { label: "Heart Rate", value: "84 bpm", note: "Light activity", tone: "ok" },
      { label: "HRV", value: "44 ms", note: "Steady", tone: "ok" },
      { label: "Body Temp", value: "36.8 °C", note: "Normal", tone: "ok" },
      { label: "SpO2", value: "98%", note: "Normal", tone: "ok" },
      { label: "Respiration", value: "16 rpm", note: "Normal", tone: "ok" },
      { label: "Skin Temp", value: "33.6 °C", note: "Normal", tone: "ok" },
    ],
    gear: [
      { label: "Chest Strap", value: "Connected", note: "Firmware 2.4.1", tone: "ok" },
      { label: "Radio", value: "Mesh", note: "Channel 6 · −66 dBm", tone: "ok" },
      { label: "Battery", value: "70%", note: "Pack B · healthy", tone: "ok" },
      { label: "GNSS", value: "Locked", note: "10 satellites", tone: "ok" },
    ],
    events: withHistory([
      { color: "#22c55e", time: "14:25", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:17", text: "Moved 110 m north" },
      { color: "#22c55e", time: "14:01", text: "Heart rate normal (84 bpm)" },
      { color: "#22c55e", time: "13:36", text: "Radio check acknowledged" },
    ]),
  },
};

function toneColor(tone: Tone) {
  if (tone === "ok") return "#4ade80";
  if (tone === "warn") return "#fbbf24";
  return "#f87171";
}

function sparkSeries(label: string, value: string, tone: Tone): number[] {
  const base = Number.parseFloat(value) || 50;
  const seed = Math.round(base * 17 + label.length * 13);
  const count = 28;
  const points: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const wobble = ((seed * (i + 3)) % 11) / 11;
    let y = 0.45 + wobble * 0.22;
    if (label === "Heart Rate") {
      y = 0.35 + Math.sin(t * Math.PI * 4 + seed) * 0.12 + wobble * 0.18;
      if (tone === "bad") y += t * 0.28;
      else if (tone === "warn") y += t * 0.12;
    } else if (label === "HRV") {
      y = 0.55 + Math.sin(t * Math.PI * 3 + seed * 0.2) * 0.16 + wobble * 0.1;
      if (tone !== "ok") y -= t * 0.28;
    } else {
      y = 0.78 - t * (tone === "bad" ? 0.55 : tone === "warn" ? 0.32 : 0.12) + wobble * 0.06;
    }
    points.push(Math.max(0.08, Math.min(0.92, y)));
  }
  return points;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 120;
  const height = 44;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const coords = values.map((v, i) => `${(i * step).toFixed(2)},${(height - v * height).toFixed(2)}`);
  const line = coords.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg className="cmd-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={area} fill={color} opacity="0.14" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({ label, value, note, tone, chart = false }: Reading & { chart?: boolean }) {
  const long = value.length > 12;
  if (!chart) {
    return (
      <div className={`cmd-stat is-${tone}`}>
        <span>{label}</span>
        <strong className={long ? "is-long" : ""}>{value}</strong>
        <small>{note}</small>
      </div>
    );
  }
  return (
    <div className={`cmd-stat is-${tone} has-chart`}>
      <div className="cmd-stat-copy">
        <span>{label}</span>
        <strong className={long ? "is-long" : ""}>{value}</strong>
        <small>{note}</small>
      </div>
      <Sparkline values={sparkSeries(label, value, tone)} color={toneColor(tone)} />
    </div>
  );
}

function HistoryList({ soldierId }: { soldierId: string }) {
  const sid = Number(String(soldierId).replace(/\D/g, ""));
  const [points, setPoints] = useState<HistoryTrackPoint[]>([]);
  const [trackTotal, setTrackTotal] = useState(0);
  const [note, setNote] = useState("Loading history…");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(sid) || sid <= 0) {
      setPoints([]);
      setTrackTotal(0);
      setNote("Invalid soldier");
      return;
    }
    if (!readSessionId()) {
      setPoints([]);
      setTrackTotal(0);
      setNote("Login required for History (history.read).");
      return;
    }
    const controller = new AbortController();
    setNote("Loading history…");
    listHistoryTrack(
      { scope: "SOLDIER", soldier_id: sid, timeRange: "30d" },
      controller.signal,
    )
      .then((track) => {
        if (controller.signal.aborted) return;
        const sampled = downsampleTrackPoints(track.points, 400);
        setTrackTotal(track.points.length);
        setPoints(sampled);
        setIndex(0);
        setNote(sampled.length ? "" : "No TELEMETRY track points");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setPoints([]);
        setTrackTotal(0);
        const message = reason instanceof Error ? reason.message : "Couldn't load history";
        setNote(
          message === "Login required" || message === "authentication required"
            ? "Login required for History (history.read)."
            : message,
        );
      });
    return () => controller.abort();
  }, [sid]);

  // Newest-first for the list; playback/map stay chronological (oldest → newest).
  const listItems = useMemo(() => [...points].reverse(), [points]);
  const active = points[Math.min(index, Math.max(points.length - 1, 0))] ?? null;
  const progress = points.length <= 1 ? 100 : (index / Math.max(points.length - 1, 1)) * 100;
  const path = useMemo(
    () => points.map((point) => [point.latitude, point.longitude] as [number, number]),
    [points],
  );
  const startLabel = points[0] ? formatHistoryTime(points[0].event_time) : "—";
  const endLabel = points.length ? formatHistoryTime(points[points.length - 1].event_time) : "—";

  useEffect(() => {
    if (!playing || points.length === 0) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        if (current >= points.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(280, 900 / speed));
    return () => window.clearInterval(id);
  }, [playing, speed, points.length]);

  return (
    <div className="cmd-history">
      <div className="cmd-playback-card">
        <div className="cmd-playback-map">
          {path.length ? <HistoryMiniMap path={path} index={Math.min(index, Math.max(path.length - 1, 0))} /> : null}
          {active ? (
            <div className="cmd-playback-pin">
              <strong>{formatHistoryClock(active.event_time)}</strong>
              <span>{active.position_source ? titleizeHistory(active.position_source) : "TELEMETRY"}</span>
            </div>
          ) : null}
          <Link
            href={`/history?soldier=${encodeURIComponent(String(sid))}`}
            className="cmd-playback-mainmap"
            onClick={(event) => event.stopPropagation()}
          >
            Open History
          </Link>
        </div>
        <div className="cmd-playback">
          <button
            type="button"
            className="cmd-playback-play"
            aria-label={playing ? "Pause playback" : "Play playback"}
            disabled={!points.length}
            onClick={() => {
              if (!playing && index >= points.length - 1) setIndex(0);
              setPlaying((value) => !value);
            }}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5L8 5.5Z" />
              </svg>
            )}
          </button>
          <div className="cmd-playback-main">
            <div className="cmd-playback-times">
              <span>{startLabel}</span>
              <span>{endLabel}</span>
            </div>
            <label className="cmd-playback-track">
              <span className="cmd-playback-fill" style={{ width: `${progress}%` }} />
              {active ? <b style={{ left: `${progress}%` }}>{formatHistoryClock(active.event_time)}</b> : null}
              <input
                type="range"
                min={0}
                max={Math.max(points.length - 1, 0)}
                value={Math.min(index, Math.max(points.length - 1, 0))}
                aria-label="Playback position"
                disabled={!points.length}
                onChange={(event) => {
                  setPlaying(false);
                  setIndex(Number(event.target.value));
                }}
              />
            </label>
            {active ? (
              <p className="cmd-playback-now">
                {active.id} · {active.position_source ? titleizeHistory(active.position_source) : "TELEMETRY"}
              </p>
            ) : null}
          </div>
          <label className="cmd-playback-speed">
            <span className="sr-only">Playback speed</span>
            <select
              value={speed}
              aria-label="Playback speed"
              onChange={(event) => setSpeed(Number(event.target.value))}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </label>
        </div>
      </div>

      <h3>Movement History</h3>
      {note ? (
        <p className="cmd-feed-note">
          {note}{" "}
          {/login/i.test(note) ? (
            <Link href="/login" className="cmd-inline-link">
              Login
            </Link>
          ) : null}
        </p>
      ) : trackTotal > points.length ? (
        <p className="cmd-feed-note">
          Map shows {points.length} of {trackTotal} track points (downsampled for performance).
        </p>
      ) : null}
      <ul>
        {listItems.map((item, listIndex) => {
          const pointIndex = points.length - 1 - listIndex;
          return (
            <li
              key={item.id}
              className={`is-${historyTone(item.position_source)}${pointIndex === index ? " is-active" : ""}`}
              onClick={() => {
                setPlaying(false);
                setIndex(pointIndex);
              }}
            >
              <LazyHistoryThumb
                path={path.slice(Math.max(0, pointIndex - 2), pointIndex + 3)}
                index={pointIndex - Math.max(0, pointIndex - 2)}
                time={formatHistoryClock(item.event_time)}
              />
              <div className="cmd-history-body">
                <strong>{item.id}</strong>
                <p>
                  {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                </p>
                <small>
                  {item.position_source ? titleizeHistory(item.position_source) : "TELEMETRY"} · source_id{" "}
                  {item.source_id}
                </small>
              </div>
              <Link
                href={`/history?soldier=${encodeURIComponent(String(sid))}&id=${item.source_id}`}
                className="cmd-event-detail"
                onClick={(event) => event.stopPropagation()}
              >
                View Detail
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function alertTypeClass(alertType: string) {
  return alertType.toLowerCase().replaceAll("_", "-");
}

function AlertList({ items }: { items: AlertRecord[] }) {
  return (
    <div className="cmd-alerts-panel">
      <h3>Active Alerts</h3>
      {items.length ? null : <p className="cmd-feed-note">No alerts for this soldier.</p>}
      <ul>
        {items.map((alert) => (
          <li key={alert.id} className={`is-${String(alert.severity).toLowerCase()}`}>
            <Link href={`/alerts?id=${alert.id}`} className="cmd-feed-row">
              <span className={`cmd-alert-type is-${alertTypeClass(String(alert.alert_type))}`}>
                <AlertTypeIcon type={String(alert.alert_type)} />
              </span>
              <div className="cmd-alert-body">
                <div className="cmd-alert-top">
                  <strong>{alert.alert_type}</strong>
                  <span className={`cmd-sev is-${String(alert.severity).toLowerCase()}`}>{alert.severity}</span>
                </div>
                <p>{alert.message}</p>
                <small>
                  {formatAlertDate(alert.event_time).time} · {coordLabel(alert)}
                  {alert.position_source ? ` · ${alert.position_source}` : ""} · Seen{" "}
                  {formatSeen(alert.last_seen_at || alert.event_time)}
                </small>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertTypeIcon({ type }: { type: string }) {
  if (type === "SOS") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.2 1.4 5.6 1.4 5.6H4.8s1.4-1.4 1.4-5.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "ARRHYTHMIA") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12h3l2-4 3 8 2-4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "LOW_BATTERY") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="7.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M19.5 10.2v3.6M6.2 12h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "HEAT_STRESS") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4v7.2a2.8 2.8 0 1 0 2.2 2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 2.8v1.4M16.5 4.8l-1 1M19 9h-1.4M7.5 4.8l1 1M5 9h1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "STRAP_DISCONNECTED") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 8.5 5.2 11.3a4 4 0 0 0 5.5 5.5L13.5 14M16 15.5l2.8-2.8a4 4 0 0 0-5.5-5.5L10.5 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "CASUALTY") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 18h4.2A11 11 0 0 1 20 8.2M4 14.5h2.8A7.6 7.6 0 0 1 16.8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function EventList({
  title,
  items,
  fill = false,
}: {
  title: string;
  items: SoldierEvent[];
  soldierId?: string;
  fill?: boolean;
}) {
  return (
    <div className={`cmd-events${fill ? " is-fill" : ""}`}>
      <h3>{title}</h3>
      {items.length ? null : <p className="cmd-feed-note">No explorer records for this soldier.</p>}
      <ul>
        {items.map((event) => (
          <li key={event.id ?? `${event.time}-${event.text}`}>
            {event.id != null ? (
              <Link href={`/explorer?id=${event.id}`} className="cmd-feed-row">
                <i style={{ background: event.color }} />
                <div className="cmd-event-body">
                  <span className="cmd-event-time">{event.time}</span>
                  <span className="cmd-event-text">{event.text}</span>
                </div>
              </Link>
            ) : (
              <>
                <i style={{ background: event.color }} />
                <div className="cmd-event-body">
                  <span className="cmd-event-time">{event.time}</span>
                  <span className="cmd-event-text">{event.text}</span>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type MatchSource = "alerts" | "explorer";

type MatchRow = {
  key: string;
  href: string;
  soldierId: string | null;
  title: string;
  route: string;
  detail: string;
  severity: string;
  time: string;
};

function matchClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .replaceAll(":", ".");
}

function alertMatch(alert: AlertRecord): MatchRow {
  const place = alert.gateway_id ?? alert.position_source ?? "Field";
  return {
    key: `alert-${alert.id}`,
    href: `/alerts?id=${alert.id}`,
    soldierId: alert.soldier_id == null ? null : String(alert.soldier_id),
    title: alert.soldier_id == null ? (alert.entity_id ?? "Alert") : `S-${alert.soldier_id}`,
    route: `${alert.group_id ?? "Ungrouped"} → ${place}`,
    detail: alert.message || alertTypeLabel(alert.alert_type),
    severity: severityLabel(alert.severity),
    time: matchClock(alert.event_time),
  };
}

function explorerMatch(record: ExplorerRecord): MatchRow {
  const place = record.gateway_id ?? record.position_source ?? categoryLabel(record.category);
  return {
    key: `log-${record.id}`,
    href: `/explorer?id=${record.id}`,
    soldierId: record.soldier_id == null ? null : String(record.soldier_id),
    title: record.soldier_id == null ? entityLabel(record) : `S-${record.soldier_id}`,
    route: `${record.group_id ?? categoryLabel(record.category)} → ${place}`,
    detail: recordSummary(record),
    severity: record.severity ? severityLabel(record.severity) : categoryLabel(record.category),
    time: matchClock(record.event_time),
  };
}

function toSoldierEvent(record: ExplorerRecord): SoldierEvent {
  return {
    id: record.id,
    color: "#60a5fa",
    time: matchClock(record.event_time).slice(0, 5).replace(".", ":"),
    text: `${categoryLabel(record.category)} · ${recordSummary(record)}`,
  };
}

const MATCHES_POLL_MS = 5000;
const MATCH_FRESH_MS = 10_000;
const MATCH_STAGGER_MS = 90;

type FreshMatch = { until: number; order: number };

function RecentMatches() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [source, setSource] = useState<MatchSource>("explorer");
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [note, setNote] = useState("Loading alerts");
  const [tick, setTick] = useState(0);
  const [fresh, setFresh] = useState<Record<string, FreshMatch>>({});
  const [now, setNow] = useState(() => Date.now());
  const rowsRef = useRef<MatchRow[]>([]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    setRows([]);
    rowsRef.current = [];
    setFresh({});
    setNote(source === "alerts" ? "Loading alerts" : "Loading explorer log");
    setTick(0);
  }, [source]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setTick((n) => n + 1), MATCHES_POLL_MS);
    return () => window.clearInterval(id);
  }, [open, source]);

  useEffect(() => {
    if (!Object.keys(fresh).length) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setFresh((current) => {
        const next: Record<string, FreshMatch> = {};
        for (const [key, meta] of Object.entries(current)) {
          if (meta.until > t) next[key] = meta;
        }
        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 400);
    return () => window.clearInterval(id);
  }, [fresh]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const load =
      source === "alerts"
        ? listAlerts({ limit: 24, timeRange: "30d" }, controller.signal).then((list) => list.items.map(alertMatch))
        : listExplorer({ category: "TELEMETRY", limit: 24, timeRange: "30d" }, controller.signal).then((list) =>
            list.items.map(explorerMatch),
          );
    load
      .then((items) => {
        if (controller.signal.aborted) return;
        const previous = rowsRef.current;
        const prevKeys = new Set(previous.map((row) => row.key));
        const newcomers = previous.length > 0 ? items.filter((item) => !prevKeys.has(item.key)) : [];

        if (newcomers.length) {
          const stamped = Date.now();
          setNow(stamped);
          setFresh((current) => {
            const next = { ...current };
            newcomers.forEach((item, index) => {
              next[item.key] = { until: stamped + MATCH_FRESH_MS, order: index };
            });
            return next;
          });
        }

        rowsRef.current = items;
        setRows(items);
        setNote(items.length ? "" : source === "alerts" ? "No alerts" : "No records");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setNote(reason instanceof Error ? reason.message : "Couldn't load records");
      });
    return () => controller.abort();
  }, [open, source, tick]);

  if (!open) {
    return (
      <button type="button" className="cmd-matches is-collapsed" onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 10 4 4m0 0v6m0-6h6M10 14l10 10m0 0v-6m0 6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <strong>Recent Matches</strong>
      </button>
    );
  }

  return (
    <aside className="cmd-matches" aria-label="Recent matches">
      <div className="cmd-matches-head">
        <div>
          <strong>Recent Matches</strong>
          <small>{source === "alerts" ? "From alerts" : "From explorer log"}</small>
        </div>
        <div className="cmd-matches-tools">
          <span className="cmd-live">Live</span>
          <button type="button" className="cmd-matches-x" aria-label="Close recent matches" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
      </div>
      <div className="cmd-matches-source" role="tablist" aria-label="Match source">
        <button type="button" role="tab" aria-selected={source === "explorer"} className={source === "explorer" ? "is-active" : ""} onClick={() => setSource("explorer")}>
          Explorer
        </button>
        <button type="button" role="tab" aria-selected={source === "alerts"} className={source === "alerts" ? "is-active" : ""} onClick={() => setSource("alerts")}>
          Alerts
        </button>
      </div>
      <div className="cmd-matches-list">
        {note ? <p className="cmd-matches-note">{note}</p> : null}
        {rows.map((match) => {
          const meta = fresh[match.key];
          const isFresh = Boolean(meta && meta.until > now);
          return (
            <button
              key={match.key}
              type="button"
              className={`cmd-match is-${match.severity.toLowerCase()}${isFresh ? " is-fresh is-enter" : ""}`}
              style={
                isFresh && meta
                  ? ({ ["--match-delay"]: `${meta.order * MATCH_STAGGER_MS}ms` } as CSSProperties)
                  : undefined
              }
              onClick={() => router.push(match.href)}
            >
              <span className="cmd-match-top">
                <b>{match.title}</b>
                {isFresh ? <span className="cmd-match-new">NEW</span> : null}
                <em className={`is-${match.severity.toLowerCase()}`}>{match.severity}</em>
                <time>{match.time}</time>
              </span>
              <p>{match.route}</p>
              <p>{match.detail}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export default function DashboardView() {
  const [selected, setSelected] = useState("104");
  const [cardOpen, setCardOpen] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<AlertRecord[]>([]);
  const [liveEvents, setLiveEvents] = useState<SoldierEvent[]>([]);
  const [livePins, setLivePins] = useState<LiveSoldierPin[]>([]);
  const [mapTick, setMapTick] = useState(0);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const personMarkers = useMemo(() => livePins.map(pinToMarker), [livePins]);
  const mapMarkers = useMemo(() => [...personMarkers, ...weaponMarkers], [personMarkers]);
  const pinById = useMemo(() => {
    const map = new Map<string, LiveSoldierPin>();
    for (const pin of livePins) map.set(String(pin.soldierId), pin);
    return map;
  }, [livePins]);

  function choose(id: string) {
    setSelected(id);
    const isWeapon = id.startsWith("wpn-");
    setCardOpen(!isWeapon);
  }

  useEffect(() => {
    const id = window.setInterval(() => setMapTick((n) => n + 1), MAP_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listExplorer({ category: "TELEMETRY", timeRange: "30d", limit: 150 }, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        const pins = latestPinsFromExplorer(list.items);
        setLivePins(pins);
        if (!pins.length) return;
        const current = selectedRef.current;
        if (!pins.some((pin) => String(pin.soldierId) === current)) {
          setSelected(String(pins[0].soldierId));
          setCardOpen(true);
        }
      })
      .catch(() => {
        /* keep last pins */
      });
    return () => controller.abort();
  }, [mapTick]);

  useEffect(() => {
    const soldierId = Number(selected);
    if (!Number.isFinite(soldierId)) return;
    const controller = new AbortController();
    Promise.all([
      listAlerts({ soldier_id: soldierId, limit: 50, timeRange: "30d" }, controller.signal),
      listExplorer({ soldier_id: soldierId, category: "TELEMETRY", limit: 20, timeRange: "30d" }, controller.signal),
    ])
      .then(([alerts, logs]) => {
        if (controller.signal.aborted) return;
        setLiveAlerts(alerts.items);
        setLiveEvents(logs.items.map(toSoldierEvent));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLiveAlerts([]);
        setLiveEvents([]);
      });
    return () => controller.abort();
  }, [selected]);

  const livePin = pinById.get(selected);
  const marker =
    personMarkers.find((item) => item.id === selected) ??
    weaponMarkers.find((item) => item.id === selected) ??
    personMarkers[0] ??
    weaponMarkers[0];
  const dossier = livePin
    ? dossierFromPin(livePin)
    : dossiers[marker?.id ?? ""] ?? {
        unit: "Ungrouped",
        status: "—",
        gnss: "—",
        seen: "—",
        overview: [],
        vitals: [],
        gear: [],
        events: [],
      };
  const place = marker
    ? `${marker.position[0].toFixed(5)}, ${marker.position[1].toFixed(5)}`
    : "—";
  const personOpen = Boolean(cardOpen && marker?.kind === "person");
  const onViewChange = useCallback((view: "group" | "weapons") => {
    if (view === "weapons") setCardOpen(false);
  }, []);

  if (!marker) {
    return (
      <div className="cmd">
        <TopHeader />
        <div className="cmd-body">
          <section className="cmd-stage" aria-label="Operations map">
            <div className="cmd-map-slot">
              <OpsMap
                markers={weaponMarkers}
                showTracks
                selected=""
                cardOpen={false}
                onSelect={choose}
                onViewChange={onViewChange}
              />
              <RecentMatches />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="cmd">
      <TopHeader />
      <div className="cmd-body">
        <section className={`cmd-stage${personOpen ? " has-card" : ""}`} aria-label="Operations map">
          <div className="cmd-map-slot">
            <OpsMap
              markers={mapMarkers}
              showTracks
              selected={selected}
              cardOpen={personOpen}
              onSelect={(id) => choose(id)}
              onViewChange={onViewChange}
            />
            <RecentMatches />
          </div>

          {personOpen ? (
            <aside className="cmd-card" aria-label={`Soldier ${marker.label} details`}>
              <header className="cmd-identity">
                <div className={`cmd-portrait is-${marker.tone}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3.1" fill="currentColor" />
                    <path
                      d="M5.2 19.4c1.3-3.4 3.6-5 6.8-5s5.5 1.6 6.8 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <b>{marker.label}</b>
                </div>
                <div>
                  <h2>Soldier {marker.label}</h2>
                  <p>{dossier.unit}</p>
                  <div className="cmd-meta">
                    <span>
                      <i
                        className={`cmd-pill is-${marker.tone === "ok" ? "ok" : marker.tone === "warn" ? "warn" : "critical"}`}
                      />{" "}
                      {dossier.status}
                    </span>
                    <span>
                      <i className="cmd-pill" /> GNSS ({dossier.gnss})
                    </span>
                    <span>Last seen {dossier.seen}</span>
                    <span className="cmd-place">{place}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="cmd-close"
                  aria-label="Close soldier details"
                  onClick={() => setCardOpen(false)}
                >
                  ×
                </button>
              </header>

              <Link
                href={
                  liveEvents[0]?.id != null
                    ? `/explorer?id=${liveEvents[0].id}`
                    : `/explorer?q=${encodeURIComponent(selected)}`
                }
                className="cmd-side-card is-link"
                aria-label={`Open explorer for soldier ${marker.label}`}
              >
                <h3 className="cmd-side-card-title">Overview</h3>
                <div className="cmd-stats is-overview">
                  {dossier.overview.map((item) => (
                    <Stat key={item.label} {...item} chart />
                  ))}
                </div>
              </Link>

              <section className="cmd-side-card is-fill is-history">
                <h3 className="cmd-side-card-title">History</h3>
                <div className="cmd-side-card-body">
                  <HistoryList soldierId={marker.label} />
                </div>
              </section>

              <section className="cmd-side-card is-fill">
                <h3 className="cmd-side-card-title">Events</h3>
                <div className="cmd-side-card-body">
                  <EventList title="Explorer log" items={liveEvents} soldierId={marker.label} fill />
                </div>
              </section>

              <section className="cmd-side-card is-fill">
                <h3 className="cmd-side-card-title">Alerts</h3>
                <div className="cmd-side-card-body">
                  <AlertList items={liveAlerts} />
                </div>
              </section>
            </aside>
          ) : null}
        </section>
      </div>
    </div>
  );
}
