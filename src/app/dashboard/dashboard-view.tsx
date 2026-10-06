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

const events = [
  { color: "#ef4444", time: "14:24", text: "Telemetry received (GNSS)" },
  { color: "#f59e0b", time: "14:20", text: "Moved 120 m to northeast" },
  { color: "#3b82f6", time: "14:15", text: "Heart rate normal (79 bpm)" },
  { color: "#22c55e", time: "14:10", text: "Entered Alpha Zone" },
];

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

  const soldierName = /^\d+$/.test(selected)
    ? `Soldier ${selected}`
    : selected === "vehicle"
      ? "Patrol Vehicle"
      : selected === "ship"
        ? "Support Craft"
        : "Soldier 104";

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
                <img src="/images/login-hero-dark.png" alt="" />
                <div>
                  <h2>{soldierName}</h2>
                  <p>Alpha 1-2 · Group Alpha</p>
                  <div className="cmd-meta">
                    <span><i className={`cmd-pill${selected === "104" ? " is-critical" : ""}`} /> {selected === "104" ? "SOS" : "Active"}</span>
                    <span><i className="cmd-pill" /> GNSS (±8 m)</span>
                    <span>Last seen 4 minutes ago</span>
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
                    <div className="cmd-stat"><span>Heart Rate</span><strong>82 bpm</strong></div>
                    <div className="cmd-stat"><span>HRV</span><strong>46 ms</strong></div>
                    <div className="cmd-stat"><span>Battery</span><strong>78%</strong></div>
                    <div className="cmd-stat"><span>Device Status</span><strong>Online</strong></div>
                    <div className="cmd-stat"><span>Chest Strap</span><strong>Connected</strong><small>Location +6.175421, 106.827312</small></div>
                    <div className="cmd-events">
                      <h3>Recent Events</h3>
                      <ul>
                        {events.map((event) => (
                          <li key={event.time}>
                            <i style={{ background: event.color }} />
                            <span>{event.time}</span>
                            <span>{event.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
                {tab === "Vitals" ? (
                  <div className="cmd-stats">
                    <div className="cmd-stat"><span>Heart Rate</span><strong>82 bpm</strong></div>
                    <div className="cmd-stat"><span>Body Temp</span><strong>36.8 °C</strong></div>
                    <div className="cmd-stat"><span>SpO2</span><strong>98%</strong></div>
                    <div className="cmd-stat"><span>Respiration</span><strong>16 rpm</strong></div>
                  </div>
                ) : null}
                {tab === "Equipment" ? (
                  <div className="cmd-stats">
                    <div className="cmd-stat"><span>Chest Strap</span><strong>Connected</strong></div>
                    <div className="cmd-stat"><span>Radio</span><strong>Mesh</strong></div>
                    <div className="cmd-stat"><span>Battery</span><strong>78%</strong></div>
                    <div className="cmd-stat"><span>Weapon sensor</span><strong>Stowed</strong></div>
                  </div>
                ) : null}
                {tab === "Track" ? (
                  <div className="cmd-stats">
                    <div className="cmd-stat"><span>Location</span><strong>+6.175421, 106.827312</strong></div>
                    <div className="cmd-stat"><span>Last move</span><strong>120 m NE</strong></div>
                    <div className="cmd-stat"><span>Source</span><strong>GNSS ±8 m</strong></div>
                  </div>
                ) : null}
                {tab === "Events" ? (
                  <div className="cmd-events">
                    <h3>Recent Events</h3>
                    <ul>
                      {events.map((event) => (
                        <li key={event.time}>
                          <i style={{ background: event.color }} />
                          <span>{event.time}</span>
                          <span>{event.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </article>
          ) : null}
        </section>
      </div>
    </div>
  );
}
