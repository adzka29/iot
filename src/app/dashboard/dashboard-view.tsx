"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import TopHeader from "./top-header";

const OpsMap = dynamic(() => import("./ops-map"), { ssr: false });

type Tab = "Overview" | "Vitals" | "Equipment" | "Track" | "Events";

type Marker = {
  id: string;
  label: string;
  position: [number, number];
  tone: "ok" | "warn" | "critical" | "info";
  kind: "person" | "vehicle" | "ship" | "weapon";
};

const starterMarkers: Marker[] = [
  { id: "101", label: "101", position: [-6.182, 106.812], tone: "ok", kind: "person" },
  { id: "103", label: "103", position: [-6.162, 106.835], tone: "ok", kind: "person" },
  { id: "104", label: "104", position: [-6.175421, 106.827312], tone: "critical", kind: "person" },
  { id: "107", label: "107", position: [-6.192, 106.821], tone: "ok", kind: "person" },
  { id: "108", label: "108", position: [-6.168, 106.852], tone: "ok", kind: "person" },
  { id: "106", label: "106", position: [-6.181, 106.845], tone: "warn", kind: "person" },
  { id: "107b", label: "107", position: [-6.188, 106.858], tone: "ok", kind: "person" },
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

type Dossier = {
  unit: string;
  status: string;
  gnss: string;
  seen: string;
  overview: Reading[];
  vitals: Reading[];
  gear: Reading[];
  track: Reading[];
  events: SoldierEvent[];
};

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
    track: [
      { label: "Last Move", value: "18 m north", note: "Holding position", tone: "ok" },
      { label: "Heading", value: "012°", note: "Slow walk", tone: "ok" },
      { label: "Speed", value: "0.4 m/s", note: "On foot", tone: "ok" },
      { label: "Source", value: "GNSS ±6 m", note: "Fix age 8 s", tone: "ok" },
    ],
    events: [
      { color: "#22c55e", time: "14:26", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:18", text: "Holding position" },
      { color: "#22c55e", time: "14:05", text: "Heart rate resting (74 bpm)" },
      { color: "#22c55e", time: "13:41", text: "Radio check acknowledged" },
    ],
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
    track: [
      { label: "Last Move", value: "64 m east", note: "Along the road", tone: "ok" },
      { label: "Heading", value: "088°", note: "Walking", tone: "ok" },
      { label: "Speed", value: "1.1 m/s", note: "On foot", tone: "ok" },
      { label: "Source", value: "GNSS ±7 m", note: "Fix age 12 s", tone: "ok" },
    ],
    events: [
      { color: "#22c55e", time: "14:24", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:16", text: "Moved 64 m east" },
      { color: "#22c55e", time: "14:02", text: "Heart rate normal (81 bpm)" },
      { color: "#22c55e", time: "13:48", text: "Chest strap synced" },
    ],
  },
  "104": {
    unit: "Alpha 1-2 · Group Alpha",
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
    track: [
      { label: "Last Move", value: "86 m northeast", note: "Since 14:20", tone: "warn" },
      { label: "Heading", value: "042°", note: "Away from last stop", tone: "warn" },
      { label: "Speed", value: "1.6 m/s", note: "On foot", tone: "ok" },
      { label: "Source", value: "GNSS ±8 m", note: "Fix age 21 s", tone: "ok" },
    ],
    events: [
      { color: "#ef4444", time: "14:24", text: "SOS beacon active" },
      { color: "#f59e0b", time: "14:21", text: "Heart rate elevated (118 bpm)" },
      { color: "#3b82f6", time: "14:20", text: "Moved 86 m northeast" },
      { color: "#22c55e", time: "14:11", text: "GNSS fix restored (±8 m)" },
    ],
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
    track: [
      { label: "Last Move", value: "40 m south", note: "Slowed down", tone: "warn" },
      { label: "Heading", value: "176°", note: "On foot", tone: "ok" },
      { label: "Speed", value: "0.7 m/s", note: "Walking", tone: "ok" },
      { label: "Source", value: "GNSS ±11 m", note: "Fix age 40 s", tone: "warn" },
    ],
    events: [
      { color: "#ef4444", time: "14:19", text: "Battery low (22%)" },
      { color: "#f59e0b", time: "14:14", text: "Chest strap signal dropping" },
      { color: "#f59e0b", time: "14:08", text: "Heart rate high (97 bpm)" },
      { color: "#3b82f6", time: "13:57", text: "Moved 40 m south" },
    ],
  },
  "107": {
    unit: "Bravo 2-1 · Group Bravo",
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
    track: [
      { label: "Last Move", value: "12 m west", note: "Near last report", tone: "ok" },
      { label: "Heading", value: "268°", note: "Stationary", tone: "ok" },
      { label: "Speed", value: "0.2 m/s", note: "On foot", tone: "ok" },
      { label: "Source", value: "GNSS ±5 m", note: "Fix age 4 s", tone: "ok" },
    ],
    events: [
      { color: "#22c55e", time: "14:27", text: "Telemetry received" },
      { color: "#22c55e", time: "14:12", text: "Heart rate resting (76 bpm)" },
      { color: "#3b82f6", time: "13:55", text: "Position hold confirmed" },
      { color: "#22c55e", time: "13:30", text: "Radio check acknowledged" },
    ],
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
    track: [
      { label: "Last Move", value: "35 m southeast", note: "Patrol pace", tone: "ok" },
      { label: "Heading", value: "142°", note: "Walking", tone: "ok" },
      { label: "Speed", value: "1.0 m/s", note: "On foot", tone: "ok" },
      { label: "Source", value: "GNSS ±6 m", note: "Fix age 9 s", tone: "ok" },
    ],
    events: [
      { color: "#22c55e", time: "14:23", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:09", text: "Moved 35 m southeast" },
      { color: "#22c55e", time: "13:58", text: "Heart rate normal (79 bpm)" },
      { color: "#22c55e", time: "13:22", text: "Chest strap synced" },
    ],
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
    track: [
      { label: "Last Move", value: "110 m north", note: "Patrol leg", tone: "ok" },
      { label: "Heading", value: "004°", note: "Walking", tone: "ok" },
      { label: "Speed", value: "1.3 m/s", note: "On foot", tone: "ok" },
      { label: "Source", value: "GNSS ±7 m", note: "Fix age 15 s", tone: "ok" },
    ],
    events: [
      { color: "#22c55e", time: "14:25", text: "Telemetry received" },
      { color: "#3b82f6", time: "14:17", text: "Moved 110 m north" },
      { color: "#22c55e", time: "14:01", text: "Heart rate normal (84 bpm)" },
      { color: "#22c55e", time: "13:36", text: "Radio check acknowledged" },
    ],
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

function EventList({ title, items }: { title: string; items: SoldierEvent[] }) {
  return (
    <div className="cmd-events">
      <h3>{title}</h3>
      <ul>
        {items.map((event) => (
          <li key={`${event.time}-${event.text}`}>
            <i style={{ background: event.color }} />
            <span>{event.time}</span>
            <span>{event.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardView() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("Overview");
  const [selected, setSelected] = useState("104");
  const [cardOpen, setCardOpen] = useState(true);

  const shownMarkers = starterMarkers.filter((marker) => {
    const text = query.trim().toLowerCase();
    if (!text) return true;
    return `${marker.label} soldier ${marker.id}`.toLowerCase().includes(text);
  });

  function choose(id: string) {
    setSelected(id);
    setCardOpen(true);
    setTab("Overview");
  }

  const marker = starterMarkers.find((item) => item.id === selected) ?? starterMarkers[2];
  const dossier = dossiers[marker.id] ?? dossiers["104"];
  const place = `${marker.position[0].toFixed(5)}, ${marker.position[1].toFixed(5)}`;

  return (
    <div className="cmd">
      <TopHeader query={query} onQueryChange={setQuery} />

      <div className="cmd-body">
        <section className="cmd-stage" aria-label="Operations map">
          <OpsMap
            markers={shownMarkers}
            showTracks
            selected={selected}
            cardOpen={cardOpen}
            onSelect={(id) => choose(id)}
          />

          {cardOpen ? (
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
                  {(["Overview", "Vitals", "Equipment", "Track", "Events"] as Tab[]).map((item) => (
                    <button key={item} type="button" className={tab === item ? "is-active" : ""} onClick={() => setTab(item)}>
                      {item}
                    </button>
                  ))}
                  <button type="button" className="cmd-close" aria-label="Close soldier details" onClick={() => setCardOpen(false)}>
                    ×
                  </button>
                </div>
                {tab === "Overview" ? (
                  <div className="cmd-stats">
                    {dossier.overview.map((item) => (
                      <Stat key={item.label} {...item} />
                    ))}
                    <EventList title="Recent Events" items={dossier.events} />
                  </div>
                ) : null}
                {tab === "Vitals" ? (
                  <div className="cmd-stats is-grid">
                    {dossier.vitals.map((item) => (
                      <Stat key={item.label} {...item} />
                    ))}
                  </div>
                ) : null}
                {tab === "Equipment" ? (
                  <div className="cmd-stats is-grid">
                    {dossier.gear.map((item) => (
                      <Stat key={item.label} {...item} />
                    ))}
                  </div>
                ) : null}
                {tab === "Track" ? (
                  <div className="cmd-stats is-grid">
                    <Stat label="Location" value={place} note={dossier.unit} tone="ok" />
                    {dossier.track.map((item) => (
                      <Stat key={item.label} {...item} />
                    ))}
                  </div>
                ) : null}
                {tab === "Events" ? (
                  <EventList title="Recent Events" items={dossier.events} />
                ) : null}
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </div>
  );
}
