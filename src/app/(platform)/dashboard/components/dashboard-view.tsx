"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";

const OpsMap = dynamic(() => import("./ops-map"), { ssr: false });
const HistoryMiniMap = dynamic(() => import("./history-mini-map"), { ssr: false });

type Tab = "History" | "Events" | "Alerts" | "Reports";

type SoldierAlert = {
  id: string;
  time: string;
  severity: "Critical" | "Warning" | "Info";
  type: "SOS" | "Casualty" | "Arrhythmia" | "Low Battery" | "Heat Stress" | "Strap Disconnected" | "No Contact";
  details: string;
  position: string;
  seen: string;
};

function buildAlerts(label: string, status: string): SoldierAlert[] {
  const base: SoldierAlert[] =
    status === "SOS"
      ? [
          { id: `${label}-sos-1`, time: "14:24", severity: "Critical", type: "SOS", details: "SOS button pressed", position: "GNSS (±8 m)", seen: "4 minutes ago" },
          { id: `${label}-hr-1`, time: "14:21", severity: "Warning", type: "Arrhythmia", details: "Heart rate elevated (118 bpm)", position: "GNSS (±8 m)", seen: "7 minutes ago" },
          { id: `${label}-heat-1`, time: "14:05", severity: "Warning", type: "Heat Stress", details: "Body temperature high threshold", position: "GNSS (±9 m)", seen: "23 minutes ago" },
        ]
      : status === "Warning"
        ? [
            { id: `${label}-bat-1`, time: "14:19", severity: "Warning", type: "Low Battery", details: "Device battery 22%", position: "Mesh (RSSI)", seen: "6 minutes ago" },
            { id: `${label}-strap-1`, time: "14:14", severity: "Info", type: "Strap Disconnected", details: "Chest strap signal dropping", position: "GNSS (±11 m)", seen: "11 minutes ago" },
            { id: `${label}-hr-1`, time: "14:08", severity: "Warning", type: "Arrhythmia", details: "Heart rate high (97 bpm)", position: "GNSS (±11 m)", seen: "17 minutes ago" },
          ]
        : [
            { id: `${label}-info-1`, time: "13:48", severity: "Info", type: "No Contact", details: "Brief link delay recovered", position: "GNSS (±6 m)", seen: "36 minutes ago" },
            { id: `${label}-bat-1`, time: "12:20", severity: "Info", type: "Low Battery", details: "Battery check normal", position: "Mesh (RSSI)", seen: "2 hours ago" },
          ];

  return [
    ...base,
    { id: `${label}-cas-1`, time: "11:40", severity: "Warning", type: "Casualty", details: "No movement detected (algorithm)", position: "GNSS (±14 m)", seen: "3 hours ago" },
    { id: `${label}-sos-2`, time: "09:12", severity: "Critical", type: "SOS", details: "SOS training ping acknowledged", position: "GNSS (±10 m)", seen: "5 hours ago" },
    { id: `${label}-strap-2`, time: "08:05", severity: "Info", type: "Strap Disconnected", details: "Chest strap reconnected", position: "GNSS (±7 m)", seen: "6 hours ago" },
  ];
}

type Marker = {
  id: string;
  label: string;
  position: [number, number];
  tone: "ok" | "warn" | "critical" | "info" | "idle";
  kind: "person" | "vehicle" | "ship" | "weapon";
  group?: "Alpha" | "Bravo";
  status?: string;
  role?: "danru";
};

type SearchHit = {
  id: string;
  title: string;
  hint: string;
  position: [number, number];
  target: "person" | "weapon" | "place";
  zoom?: number;
};

const MAP_PLACES: SearchHit[] = [
  { id: "place-monas", title: "Monas", hint: "Area · Jakarta Pusat", position: [-6.175421, 106.827312], target: "place", zoom: 15 },
  { id: "place-gambir", title: "Gambir", hint: "Daerah · Jakarta Pusat", position: [-6.1764, 106.8304], target: "place", zoom: 15 },
  { id: "place-menteng", title: "Menteng", hint: "Daerah · Jakarta Pusat", position: [-6.1944, 106.8294], target: "place", zoom: 15 },
  { id: "place-senen", title: "Senen", hint: "Daerah · Jakarta Pusat", position: [-6.1769, 106.8415], target: "place", zoom: 15 },
  { id: "place-cikini", title: "Cikini", hint: "Daerah · Jakarta Pusat", position: [-6.1912, 106.8418], target: "place", zoom: 15 },
  { id: "place-kemayoran", title: "Kemayoran", hint: "Daerah · Jakarta Pusat", position: [-6.1598, 106.8454], target: "place", zoom: 14 },
  { id: "place-tanah-abang", title: "Tanah Abang", hint: "Daerah · Jakarta Pusat", position: [-6.1856, 106.8117], target: "place", zoom: 15 },
  { id: "place-sawah-besar", title: "Sawah Besar", hint: "Daerah · Jakarta Pusat", position: [-6.1608, 106.8275], target: "place", zoom: 15 },
  { id: "place-johar-baru", title: "Johar Baru", hint: "Daerah · Jakarta Pusat", position: [-6.1833, 106.855], target: "place", zoom: 15 },
  { id: "place-cempaka-putih", title: "Cempaka Putih", hint: "Daerah · Jakarta Pusat", position: [-6.1815, 106.8683], target: "place", zoom: 15 },
  { id: "place-kota-tua", title: "Kota Tua", hint: "Area · Jakarta Barat", position: [-6.1352, 106.8133], target: "place", zoom: 15 },
  { id: "place-ancol", title: "Ancol", hint: "Area · Jakarta Utara", position: [-6.1256, 106.8333], target: "place", zoom: 14 },
  { id: "place-thamrin", title: "Jalan Thamrin", hint: "Lokasi · Jakarta Pusat", position: [-6.1877, 106.823], target: "place", zoom: 16 },
  { id: "place-sudirman", title: "Jalan Sudirman", hint: "Lokasi · Jakarta Pusat", position: [-6.2088, 106.8216], target: "place", zoom: 15 },
  { id: "place-istana", title: "Istana Merdeka", hint: "Lokasi · Jakarta Pusat", position: [-6.1702, 106.824], target: "place", zoom: 16 },
];

const starterMarkers: Marker[] = [
  { id: "101", label: "101", position: [-6.182, 106.812], tone: "ok", kind: "person", group: "Alpha" },
  { id: "103", label: "103", position: [-6.162, 106.835], tone: "ok", kind: "person", group: "Alpha" },
  { id: "104", label: "104", position: [-6.175421, 106.827312], tone: "critical", kind: "person", group: "Alpha", role: "danru" },
  { id: "107", label: "107", position: [-6.192, 106.821], tone: "ok", kind: "person", group: "Bravo", role: "danru" },
  { id: "108", label: "108", position: [-6.168, 106.852], tone: "ok", kind: "person", group: "Bravo" },
  { id: "106", label: "106", position: [-6.181, 106.845], tone: "warn", kind: "person", group: "Alpha" },
  { id: "107b", label: "107", position: [-6.188, 106.858], tone: "ok", kind: "person", group: "Bravo" },
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
      { label: "Heart Rate", value: "74 bpm", note: "Resting", tone: "ok" },
      { label: "HRV", value: "54 ms", note: "Steady", tone: "ok" },
      { label: "Battery", value: "91%", note: "About 9 h left", tone: "ok" },
      { label: "Device", value: "Online", note: "Link stable", tone: "ok" },
      { label: "Chest Strap", value: "Connected", note: "Signal strong", tone: "ok" },
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
      { label: "Heart Rate", value: "81 bpm", note: "Normal", tone: "ok" },
      { label: "HRV", value: "47 ms", note: "Steady", tone: "ok" },
      { label: "Battery", value: "77%", note: "About 6 h left", tone: "ok" },
      { label: "Device", value: "Online", note: "Link stable", tone: "ok" },
      { label: "Chest Strap", value: "Connected", note: "Signal strong", tone: "ok" },
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
      { label: "Battery", value: "64%", note: "About 3 h left", tone: "warn" },
      { label: "Device", value: "Online", note: "SOS beacon on", tone: "bad" },
      { label: "Chest Strap", value: "Connected", note: "Signal strong", tone: "ok" },
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
      { label: "Battery", value: "22%", note: "Replace soon", tone: "bad" },
      { label: "Device", value: "Online", note: "Link weak", tone: "warn" },
      { label: "Chest Strap", value: "Intermittent", note: "Signal dropping", tone: "warn" },
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
      { label: "Heart Rate", value: "76 bpm", note: "Resting", tone: "ok" },
      { label: "HRV", value: "51 ms", note: "Steady", tone: "ok" },
      { label: "Battery", value: "83%", note: "About 7 h left", tone: "ok" },
      { label: "Device", value: "Online", note: "Link stable", tone: "ok" },
      { label: "Chest Strap", value: "Connected", note: "Signal strong", tone: "ok" },
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
      { label: "HRV", value: "49 ms", note: "Steady", tone: "ok" },
      { label: "Battery", value: "88%", note: "About 8 h left", tone: "ok" },
      { label: "Device", value: "Online", note: "Link stable", tone: "ok" },
      { label: "Chest Strap", value: "Connected", note: "Signal strong", tone: "ok" },
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
      { label: "HRV", value: "44 ms", note: "Steady", tone: "ok" },
      { label: "Battery", value: "70%", note: "About 5 h left", tone: "ok" },
      { label: "Device", value: "Online", note: "Link stable", tone: "ok" },
      { label: "Chest Strap", value: "Connected", note: "Signal strong", tone: "ok" },
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

function Stat({ label, value, note, tone }: Reading) {
  const long = value.length > 12;
  return (
    <div className={`cmd-stat is-${tone}`}>
      <span>{label}</span>
      <strong className={long ? "is-long" : ""}>{value}</strong>
      <small>{note}</small>
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

export default function DashboardView() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("History");
  const [selected, setSelected] = useState("104");
  const [cardOpen, setCardOpen] = useState(true);
  const [focus, setFocus] = useState<{
    nonce: number;
    id: string;
    position: [number, number];
    kind: Marker["kind"] | "place";
    zoom?: number;
  } | null>(null);
  const [geoHits, setGeoHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setGeoHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(text)}`)
        .then((response) => (response.ok ? response.json() : []))
        .then((rows: SearchHit[]) => setGeoHits(Array.isArray(rows) ? rows : []))
        .catch(() => setGeoHits([]));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  const hits = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];

    const coord = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    const coordHit: SearchHit[] = coord
      ? [
          {
            id: `coord-${coord[1]}-${coord[2]}`,
            title: `${coord[1]}, ${coord[2]}`,
            hint: "Coordinates",
            position: [Number(coord[1]), Number(coord[2])],
            target: "place",
            zoom: 16,
          },
        ]
      : [];

    const people = starterMarkers.flatMap((marker) => {
      const dossier = dossiers[marker.id];
      const title = marker.kind === "person" ? `S-${marker.label}` : marker.label;
      const haystack = [
        title,
        marker.id,
        marker.kind,
        marker.group,
        marker.status,
        marker.role,
        dossier?.unit,
        dossier?.status,
        marker.kind === "person" ? "personnel soldier" : "weapon",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(text)) return [];
      const hint = [
        marker.role === "danru" ? "DANRU" : marker.kind === "weapon" ? "Weapon" : "Personnel",
        marker.group,
        marker.status,
      ]
        .filter(Boolean)
        .join(" · ");
      return [
        {
          id: marker.id,
          title,
          hint,
          position: marker.position,
          target: marker.kind === "weapon" ? "weapon" : "person",
        } satisfies SearchHit,
      ];
    });

    const areas = MAP_PLACES.filter((place) =>
      `${place.title} ${place.hint}`.toLowerCase().includes(text),
    );

    const seen = new Set([...people, ...areas, ...coordHit].map((hit) => hit.title.toLowerCase()));
    const remote = geoHits.filter((hit) => !seen.has(hit.title.toLowerCase()));
    return [...coordHit, ...people, ...areas, ...remote].slice(0, 10);
  }, [query, geoHits]);

  function choose(id: string) {
    setSelected(id);
    const item = starterMarkers.find((entry) => entry.id === id);
    setCardOpen(item?.kind === "person");
    setTab("History");
  }

  function locate(id: string) {
    const hit = hits.find((item) => item.id === id);
    if (hit?.target === "place") {
      setCardOpen(false);
      setFocus({
        nonce: Date.now(),
        id: hit.id,
        position: hit.position,
        kind: "place",
        zoom: hit.zoom ?? 15,
      });
      setQuery("");
      return;
    }
    const item = starterMarkers.find((entry) => entry.id === id);
    if (!item) return;
    choose(id);
    setFocus({
      nonce: Date.now(),
      id: item.id,
      position: item.position,
      kind: item.kind,
      zoom: 16,
    });
    setQuery("");
  }

  const marker = starterMarkers.find((item) => item.id === selected) ?? starterMarkers[2];
  const dossier = dossiers[marker.id] ?? dossiers["104"];
  const place = `${marker.position[0].toFixed(5)}, ${marker.position[1].toFixed(5)}`;
  const personOpen = cardOpen && marker.kind === "person";
  const onViewChange = useCallback((view: "group" | "weapons") => {
    if (view === "weapons") setCardOpen(false);
  }, []);

  return (
    <div className="cmd">
      <TopHeader query={query} onQueryChange={setQuery} hits={hits} onPick={locate} />

      <div className="cmd-body">
        <section className={`cmd-stage${personOpen ? " has-card" : ""}`} aria-label="Operations map">
          <div className="cmd-map-slot">
            <OpsMap
              markers={starterMarkers}
              showTracks
              selected={selected}
              cardOpen={personOpen}
              focus={focus}
              onSelect={(id) => choose(id)}
              onViewChange={onViewChange}
            />
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
                  {(["History", "Events", "Alerts", "Reports"] as Tab[]).map((item) => (
                    <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
                      {item}
                    </button>
                  ))}
                  <button type="button" className="cmd-close" aria-label="Close soldier details" onClick={() => setCardOpen(false)}>
                    ×
                  </button>
                </div>
                <div className={`cmd-card-scroll${tab === "Events" || tab === "History" || tab === "Reports" || tab === "Alerts" ? " is-events" : ""}`}>
                  {tab === "History" ? (
                    <HistoryList soldierId={marker.label} items={buildHistory(marker.label, marker.position)} />
                  ) : null}
                  {tab === "Events" ? (
                    <EventList title="Recent Events" items={dossier.events} soldierId={marker.label} fill />
                  ) : null}
                  {tab === "Alerts" ? (
                    <AlertList soldierId={marker.label} items={buildAlerts(marker.label, dossier.status)} />
                  ) : null}
                  {tab === "Reports" ? (
                    <div className="cmd-reports">
                      <h3>Reports</h3>
                      <ul>
                        {[
                          { time: "14:20", title: "Incident summary", note: "SOS + elevated HR window" },
                          { time: "13:55", title: "Movement report", note: "Last 2 km patrol leg" },
                          { time: "12:40", title: "Device health", note: "Battery and strap status" },
                          { time: "11:10", title: "Shift handover", note: "Sector watch notes" },
                        ].map((report) => (
                          <li key={`${report.time}-${report.title}`}>
                            <div className="cmd-report-body">
                              <strong>{report.title}</strong>
                              <p>{report.note}</p>
                              <small>{report.time} · Soldier {marker.label}</small>
                            </div>
                            <Link
                              href={`/explorer?q=${encodeURIComponent(`P-${marker.label}`)}`}
                              className="cmd-event-detail"
                            >
                              View Detail
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </div>
  );
}
