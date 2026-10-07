"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
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

const OpsMap = dynamic(() => import("./ops-map"), { ssr: false });
const HistoryMiniMap = dynamic(() => import("./history-mini-map"), { ssr: false });

type Tab = "Overview" | "History" | "Events" | "Alerts" | "Reports";

type SoldierAlert = {
  id: string;
  time: string;
  severity: string;
  type: string;
  details: string;
  position: string;
  seen: string;
};

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

type HistoryStop = {
  time: string;
  title: string;
  place: string;
  coords: string;
  source: string;
  tone: "ok" | "warn" | "stale" | "event";
};

function buildHistory(label: string, position: [number, number]): HistoryStop[] {
  const [lat, lng] = position;
  const seed = Number(label.replace(/\D/g, "")) || 100;
  const steps: Omit<HistoryStop, "coords">[] = [
    { time: "14:24", title: "Current position", place: "Near operational sector", source: "GNSS", tone: "ok" },
    { time: "14:20", title: "Moved northeast along route", place: "Jl. Medan Merdeka Timur", source: "GNSS", tone: "ok" },
    { time: "14:11", title: "GNSS fix restored", place: "Lapangan Monas edge", source: "GNSS", tone: "ok" },
    { time: "13:56", title: "Held at rally point", place: "Gedung area south", source: "Dead Reckoning", tone: "warn" },
    { time: "13:38", title: "Crossed checkpoint B", place: "Jl. Veteran No. 12", source: "Trilateration", tone: "warn" },
    { time: "13:12", title: "Patrol leg west", place: "Blok M corridor", source: "GNSS", tone: "ok" },
    { time: "12:47", title: "Brief stop · no vitals burst", place: "Shade point Alpha", source: "Stale", tone: "stale" },
    { time: "12:19", title: "Entered watch sector", place: "Gate 3 approach", source: "GNSS", tone: "ok" },
    { time: "11:54", title: "Event marker logged", place: "Comms handoff zone", source: "Event", tone: "event" },
    { time: "11:21", title: "Moved south on foot", place: "Side street east", source: "Dead Reckoning", tone: "warn" },
    { time: "10:48", title: "Route waypoint crossed", place: "Intersection 4", source: "GNSS", tone: "ok" },
    { time: "10:08", title: "Departed staging area", place: "Staging pad Bravo", source: "GNSS", tone: "ok" },
  ];
  return steps.map((step, index) => {
    const dLat = -0.00055 * (index + (seed % 5) * 0.08);
    const dLng = 0.00042 * ((index % 3) - 1) + 0.0001 * (seed % 7);
    return {
      ...step,
      coords: `${(lat + dLat).toFixed(5)}, ${(lng + dLng).toFixed(5)}`,
    };
  });
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

function parseCoords(coords: string): [number, number] {
  const [lat, lng] = coords.split(",").map((part) => Number(part.trim()));
  return [lat, lng];
}

function HistoryList({
  soldierId,
  items,
}: {
  soldierId: string;
  items: HistoryStop[];
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [index, setIndex] = useState(0);
  const active = items[Math.min(index, items.length - 1)] ?? null;
  const progress = items.length <= 1 ? 100 : (index / (items.length - 1)) * 100;
  const path = useMemo(() => items.map((item) => parseCoords(item.coords)), [items]);

  useEffect(() => {
    if (!playing || items.length === 0) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        if (current >= items.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(280, 900 / speed));
    return () => window.clearInterval(id);
  }, [playing, speed, items.length]);

  return (
    <div className="cmd-history">
      <div className="cmd-playback-card">
        <div className="cmd-playback-map">
          <HistoryMiniMap path={path} index={index} />
          {active ? (
            <div className="cmd-playback-pin">
              <strong>{active.time}</strong>
              <span>{active.place}</span>
            </div>
          ) : null}
          <Link
            href={`/history?soldier=${encodeURIComponent(soldierId)}`}
            className="cmd-playback-mainmap"
            onClick={(event) => event.stopPropagation()}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 8.2 12 4l8 4.2-8 4.2L4 8.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="m6.2 12.2 5.8 3 5.8-3M6.2 16.2 12 19.2l5.8-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Open History
          </Link>
        </div>
        <div className="cmd-playback">
          <button
            type="button"
            className="cmd-playback-play"
            aria-label={playing ? "Pause playback" : "Play playback"}
            onClick={() => {
              if (!playing && index >= items.length - 1) setIndex(0);
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
              <span>06 Oct 2026 00:00</span>
              <span>06 Oct 2026 23:59</span>
            </div>
            <label className="cmd-playback-track">
              <span className="cmd-playback-fill" style={{ width: `${progress}%` }} />
              {active ? <b style={{ left: `${progress}%` }}>{active.time}:00</b> : null}
              <input
                type="range"
                min={0}
                max={Math.max(items.length - 1, 0)}
                value={index}
                aria-label="Playback position"
                onChange={(event) => {
                  setPlaying(false);
                  setIndex(Number(event.target.value));
                }}
              />
            </label>
            {active ? (
              <p className="cmd-playback-now">
                {active.title} · {active.source}
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
      <ul>
        {items.map((item, itemIndex) => (
          <li
            key={`${item.time}-${item.title}`}
            className={`is-${item.tone}${itemIndex === index ? " is-active" : ""}`}
            onClick={() => {
              setPlaying(false);
              setIndex(itemIndex);
            }}
          >
            <div className="cmd-history-thumb" aria-hidden="true">
              <HistoryMiniMap path={path} index={itemIndex} compact />
              <b>{item.time}</b>
            </div>
            <div className="cmd-history-body">
              <strong>{item.title}</strong>
              <p>{item.place}</p>
              <small>
                {item.coords} · {item.source}
              </small>
            </div>
            <Link
              href={`/history?soldier=${encodeURIComponent(soldierId)}`}
              className="cmd-event-detail"
              onClick={(event) => event.stopPropagation()}
            >
              View Detail
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertList({ soldierId, items }: { soldierId: string; items: SoldierAlert[] }) {
  return (
    <div className="cmd-alerts-panel">
      <h3>Active Alerts</h3>
      {items.length ? null : <p className="cmd-feed-note">No alerts for this soldier.</p>}
      <ul>
        {items.map((alert) => (
          <li key={alert.id} className={`is-${alert.severity.toLowerCase()}`}>
            <span className={`cmd-alert-type is-${alert.type.toLowerCase().replaceAll(" ", "-")}`}>
              <AlertTypeIcon type={alert.type} />
            </span>
            <div className="cmd-alert-body">
              <div className="cmd-alert-top">
                <strong>{alert.type}</strong>
                <span className={`cmd-sev is-${alert.severity.toLowerCase()}`}>{alert.severity}</span>
              </div>
              <p>{alert.details}</p>
              <small>
                {alert.time} · {alert.position} · Seen {alert.seen}
              </small>
            </div>
            <Link
              href={`/alerts?soldier=${encodeURIComponent(soldierId)}&type=${encodeURIComponent(alert.type)}`}
              className="cmd-event-detail"
            >
              View Detail
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertTypeIcon({ type }: { type: SoldierAlert["type"] }) {
  if (type === "SOS") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.2 1.4 5.6 1.4 5.6H4.8s1.4-1.4 1.4-5.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Arrhythmia") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12h3l2-4 3 8 2-4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "Low Battery") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="7.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M19.5 10.2v3.6M6.2 12h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Heat Stress") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4v7.2a2.8 2.8 0 1 0 2.2 2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 2.8v1.4M16.5 4.8l-1 1M19 9h-1.4M7.5 4.8l1 1M5 9h1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Strap Disconnected") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 8.5 5.2 11.3a4 4 0 0 0 5.5 5.5L13.5 14M16 15.5l2.8-2.8a4 4 0 0 0-5.5-5.5L10.5 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Casualty") {
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
  soldierId,
  fill = false,
}: {
  title: string;
  items: SoldierEvent[];
  soldierId: string;
  fill?: boolean;
}) {
  return (
    <div className={`cmd-events${fill ? " is-fill" : ""}`}>
      <h3>{title}</h3>
      {items.length ? null : <p className="cmd-feed-note">No explorer records for this soldier.</p>}
      <ul>
        {items.map((event) => (
          <li key={`${event.time}-${event.text}`}>
            <i style={{ background: event.color }} />
            <div className="cmd-event-body">
              <span className="cmd-event-time">{event.time}</span>
              <span className="cmd-event-text">{event.text}</span>
            </div>
            <Link
              href={`/explorer?q=${encodeURIComponent(`P-${soldierId}`)}`}
              className="cmd-event-detail"
            >
              View Detail
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type MatchSource = "alerts" | "explorer";

type MatchRow = {
  key: string;
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
    soldierId: record.soldier_id == null ? null : String(record.soldier_id),
    title: record.soldier_id == null ? entityLabel(record) : `S-${record.soldier_id}`,
    route: `${record.group_id ?? categoryLabel(record.category)} → ${place}`,
    detail: recordSummary(record),
    severity: record.severity ? severityLabel(record.severity) : categoryLabel(record.category),
    time: matchClock(record.event_time),
  };
}

function toSoldierAlert(alert: AlertRecord): SoldierAlert {
  return {
    id: String(alert.id),
    time: formatAlertDate(alert.event_time).time,
    severity: severityLabel(alert.severity),
    type: alertTypeLabel(alert.alert_type),
    details: alert.message || alertTypeLabel(alert.alert_type),
    position: alert.position_source ?? coordLabel(alert),
    seen: formatSeen(alert.last_seen_at || alert.event_time),
  };
}

function toSoldierEvent(record: ExplorerRecord): SoldierEvent {
  return {
    color: "#60a5fa",
    time: matchClock(record.event_time).slice(0, 5).replace(".", ":"),
    text: `${categoryLabel(record.category)} · ${recordSummary(record)}`,
  };
}

const MATCHES_POLL_MS = 5000;
const MATCH_FRESH_MS = 10_000;
const MATCH_STAGGER_MS = 90;

type FreshMatch = { until: number; order: number };

function RecentMatches({ onSelect }: { onSelect: (id: string, source: MatchSource) => void }) {
  const [open, setOpen] = useState(true);
  const [source, setSource] = useState<MatchSource>("alerts");
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
        <button type="button" role="tab" aria-selected={source === "alerts"} className={source === "alerts" ? "is-active" : ""} onClick={() => setSource("alerts")}>
          Alerts
        </button>
        <button type="button" role="tab" aria-selected={source === "explorer"} className={source === "explorer" ? "is-active" : ""} onClick={() => setSource("explorer")}>
          Explorer
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
              onClick={() => {
                if (match.soldierId) onSelect(match.soldierId, source);
              }}
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

function KillChainBar() {
  const stages = [
    { label: "Chest Strap", status: "Connected" },
    { label: "Shoulder Hub", status: "Active" },
    { label: "LoRa Mesh", status: "Healthy" },
    { label: "Gateway Node", status: "Online" },
    { label: "Satellite", status: "Available" },
  ];

  return (
    <aside className="cmd-chain" aria-label="System communication chain">
      <div className="cmd-chain-lead">
        <strong>System Communication Chain</strong>
      </div>
      <ol className="cmd-chain-flow">
        {stages.map((stage) => (
          <li key={stage.label}>
            <em>{stage.label}</em>
            <span>
              <i />
              {stage.status}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

type ReportSectionId = "overview" | "alerts" | "history" | "events" | "vitals" | "equipment";

const REPORT_SECTIONS: {
  id: ReportSectionId;
  title: string;
  note: string;
  tone: "blue" | "amber" | "cyan" | "slate" | "rose" | "violet";
  icon: "person" | "alert" | "path" | "list" | "heart" | "gear";
}[] = [
  { id: "overview", title: "Overview", note: "Soldier identity, current status, device status, last known position.", tone: "blue", icon: "person" },
  { id: "alerts", title: "Alerts", note: "All alerts and incidents involving this soldier.", tone: "amber", icon: "alert" },
  { id: "history", title: "History", note: "Movement history and position records with map.", tone: "cyan", icon: "path" },
  { id: "events", title: "Events", note: "System and device events (telemetry, status changes, etc).", tone: "slate", icon: "list" },
  { id: "vitals", title: "Vitals (Optional)", note: "Heart rate, HRV and other vital signs data.", tone: "rose", icon: "heart" },
  { id: "equipment", title: "Equipment (Optional)", note: "Device information (shoulder hub, chest strap, battery, etc).", tone: "violet", icon: "gear" },
];

function ReportSectionIcon({ name }: { name: (typeof REPORT_SECTIONS)[number]["icon"] }) {
  if (name === "person") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.2" fill="currentColor" />
        <path d="M5.4 19.2c1.2-3.3 3.5-4.9 6.6-4.9s5.4 1.6 6.6 4.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.2 20.2 19H3.8L12 4.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 10v4.2M12 16.8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "path") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="17.5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17.5" cy="6.5" r="2.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8.2 15.8 15.8 8.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 7h11M8 12h11M8 17h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="4.5" cy="7" r="1.1" fill="currentColor" />
        <circle cx="4.5" cy="12" r="1.1" fill="currentColor" />
        <circle cx="4.5" cy="17" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19s-6.5-4.1-8.4-7.5C2.2 9.2 3.4 6.5 6.1 6.1c1.5-.2 2.9.5 3.9 1.6L12 9.8l2-2.1c1-1.1 2.4-1.8 3.9-1.6 2.7.4 3.9 3.1 2.5 5.4C18.5 14.9 12 19 12 19Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M4.8 12.2h3.2l1.6-2.4 2.2 4.6 1.5-2.2h2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ReportConfig({ soldierId }: { soldierId: string }) {
  const [sections, setSections] = useState<Record<ReportSectionId, boolean>>({
    overview: true,
    alerts: true,
    history: true,
    events: false,
    vitals: false,
    equipment: false,
  });
  const [format, setFormat] = useState("pdf");
  const [detail, setDetail] = useState("standard");
  const [options, setOptions] = useState({
    maps: true,
    timestamps: true,
    raw: true,
    source: true,
  });

  function toggleSection(id: ReportSectionId) {
    setSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleOption(key: keyof typeof options) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="cmd-report-builder">
      <div className="cmd-report-scroll">
        <section className="cmd-report-block" aria-labelledby="cmd-report-sections">
          <h3 id="cmd-report-sections">Include Sections</h3>
          <div className="cmd-report-sections">
            {REPORT_SECTIONS.map((section) => {
              const checked = sections[section.id];
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`cmd-report-section is-${section.tone}${checked ? " is-active" : ""}`}
                  aria-pressed={checked}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="cmd-report-section-icon">
                    <ReportSectionIcon name={section.icon} />
                  </span>
                  <span className="cmd-report-section-copy">
                    <strong>{section.title}</strong>
                    <small>{section.note}</small>
                  </span>
                  <span className={`cmd-report-check${checked ? " is-on" : ""}`} aria-hidden="true">
                    {checked ? (
                      <svg viewBox="0 0 16 16" fill="none">
                        <path d="m3.6 8.2 2.8 2.8 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="cmd-report-block" aria-labelledby="cmd-report-output">
          <h3 id="cmd-report-output">Output Settings</h3>
          <div className="cmd-report-fields">
            <label>
              <span>Format</span>
              <div className="cmd-report-select">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M14 3.6V8h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                <select value={format} onChange={(event) => setFormat(event.target.value)} aria-label="Report format">
                  <option value="pdf">PDF (Recommended)</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </label>
            <label>
              <span>Detail Level</span>
              <div className="cmd-report-select">
                <select value={detail} onChange={(event) => setDetail(event.target.value)} aria-label="Detail level">
                  <option value="summary">Summary</option>
                  <option value="standard">Standard</option>
                  <option value="full">Full</option>
                </select>
              </div>
            </label>
          </div>
          <div className="cmd-report-toggles">
            {(
              [
                ["maps", "Include map visualizations"],
                ["timestamps", "Include timestamps"],
                ["raw", "Include raw data summary"],
                ["source", "Include position source"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="cmd-report-toggle">
                <span>{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={options[key]}
                  className={options[key] ? "is-on" : ""}
                  onClick={() => toggleOption(key)}
                >
                  <i />
                </button>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="cmd-report-actions">
        <button type="button" className="cmd-report-btn is-ghost">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2.8 12s3.4-6.2 9.2-6.2S21.2 12 21.2 12s-3.4 6.2-9.2 6.2S2.8 12 2.8 12Z" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Preview Report
        </button>
        <button type="button" className="cmd-report-btn is-primary">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M14 3.6V8h4.5M12 11.2v6M9 14.2h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Generate Report
        </button>
      </div>
      <p className="cmd-report-note">Soldier {soldierId}</p>
    </div>
  );
}

export default function DashboardView() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [selected, setSelected] = useState("104");
  const [cardOpen, setCardOpen] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<SoldierAlert[]>([]);
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

  function choose(id: string, source?: MatchSource) {
    setSelected(id);
    const isWeapon = id.startsWith("wpn-");
    setCardOpen(!isWeapon);
    setTab(source === "explorer" ? "Events" : source === "alerts" ? "Alerts" : "Overview");
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
      listAlerts({ soldier_id: soldierId, limit: 20 }, controller.signal),
      listExplorer({ soldier_id: soldierId, category: "TELEMETRY", limit: 20, timeRange: "30d" }, controller.signal),
    ])
      .then(([alerts, logs]) => {
        if (controller.signal.aborted) return;
        setLiveAlerts(alerts.items.map(toSoldierAlert));
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
              <RecentMatches onSelect={choose} />
              <KillChainBar />
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
            <RecentMatches onSelect={choose} />
            <KillChainBar />
          </div>

          {personOpen ? (
            <article className="cmd-card">
              <div className="cmd-identity">
                <div className={`cmd-portrait is-${marker.tone}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="3.1" fill="currentColor" />
                    <path d="M5.2 19.4c1.3-3.4 3.6-5 6.8-5s5.5 1.6 6.8 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <b>{marker.label}</b>
                </div>
                <div>
                  <h2>Soldier {marker.label}</h2>
                  <p>{dossier.unit}</p>
                  <div className="cmd-meta">
                    <span><i className={`cmd-pill is-${marker.tone === "ok" ? "ok" : marker.tone === "warn" ? "warn" : "critical"}`} /> {dossier.status}</span>
                    <span><i className="cmd-pill" /> GNSS ({dossier.gnss})</span>
                    <span>Last seen {dossier.seen}</span>
                    <span className="cmd-place">{place}</span>
                  </div>
                </div>
              </div>
              <div className="cmd-card-main">
                <div className="cmd-tabs">
                  {(["Overview", "History", "Events", "Alerts", "Reports"] as Tab[]).map((item) => (
                    <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
                      {item}
                    </button>
                  ))}
                  <button type="button" className="cmd-close" aria-label="Close soldier details" onClick={() => setCardOpen(false)}>
                    ×
                  </button>
                </div>
                <div className={`cmd-card-scroll${tab === "Events" || tab === "History" || tab === "Reports" || tab === "Alerts" ? " is-events" : ""}`}>
                  {tab === "Overview" ? (
                    <div className="cmd-stats is-overview">
                      {dossier.overview.map((item) => (
                        <Stat key={item.label} {...item} chart />
                      ))}
                    </div>
                  ) : null}
                  {tab === "History" ? (
                    <HistoryList soldierId={marker.label} items={buildHistory(marker.label, marker.position)} />
                  ) : null}
                  {tab === "Events" ? (
                    <EventList title="Explorer log" items={liveEvents} soldierId={marker.label} fill />
                  ) : null}
                  {tab === "Alerts" ? (
                    <AlertList soldierId={marker.label} items={liveAlerts} />
                  ) : null}
                  {tab === "Reports" ? <ReportConfig soldierId={marker.label} /> : null}
                </div>
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </div>
  );
}
