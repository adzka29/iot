"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import TopHeader from "../dashboard/top-header";
import type { TrackPoint, TrackSource } from "./history-track-map";

const HistoryTrackMap = dynamic(() => import("./history-track-map"), { ssr: false });

type ViewBy = "Soldier" | "Group" | "Weapon";
type DataType = "Telemetry" | "Mesh Frame" | "Uplink" | "Beacon" | "Special" | "System";

type HistoryStop = {
  time: string;
  stamp: string;
  title: string;
  place: string;
  source: TrackSource;
  dataType: DataType;
  position: [number, number];
  uncertainty: string;
  heartRate: string;
  hrv: string;
  spo2: string;
  bodyTemp: string;
  battery: string;
  strap: string;
  transport: string;
  gateway: string;
};

const SOLDIERS = ["101", "103", "104", "105", "106", "107", "108"];
const DATA_TYPES: DataType[] = ["Telemetry", "Mesh Frame", "Uplink", "Beacon", "Special", "System"];
const SOURCES: TrackSource[] = ["GNSS", "Dead Reckoning", "Trilateration", "Stale"];

const DATA_COLORS: Record<DataType, string> = {
  Telemetry: "#38bdf8",
  "Mesh Frame": "#a78bfa",
  Uplink: "#f59e0b",
  Beacon: "#eab308",
  Special: "#4ade80",
  System: "#22d3ee",
};

function buildStops(soldierId: string): HistoryStop[] {
  const seed = Number(soldierId) || 104;
  const base: [number, number] = [-6.17542 + (seed % 7) * 0.00015, 106.82731 - (seed % 5) * 0.00012];
  const sources: TrackSource[] = ["GNSS", "GNSS", "Dead Reckoning", "GNSS", "Trilateration", "Stale", "GNSS", "Dead Reckoning", "GNSS", "GNSS", "Trilateration", "GNSS"];
  const types: DataType[] = ["Telemetry", "Mesh Frame", "Telemetry", "Beacon", "Telemetry", "System", "Telemetry", "Mesh Frame", "Uplink", "Telemetry", "Special", "Telemetry"];
  const times = ["08:00:03", "08:04:11", "08:09:42", "08:14:05", "08:18:33", "08:22:10", "08:25:48", "08:29:02", "08:33:17", "08:37:40", "08:41:09", "08:45:22"];

  return times.map((time, index) => {
    const lat = base[0] - index * 0.00055 + (index % 3) * 0.00012;
    const lng = base[1] + index * 0.00042 - (index % 2) * 0.00018;
    return {
      time,
      stamp: `04 Oct 2026 ${time}`,
      title: index === times.length - 1 ? "Event marker" : index === 0 ? "Track start" : `Moved ${18 + index * 7} m`,
      place: index % 2 ? "Sector north approach" : "Patrol corridor east",
      source: sources[index],
      dataType: types[index],
      position: [lat, lng],
      uncertainty: sources[index] === "GNSS" ? "±8 m" : sources[index] === "Stale" ? "±40 m" : "±18 m",
      heartRate: `${70 + ((seed + index * 3) % 20)} bpm`,
      hrv: `${30 + ((seed + index) % 15)} ms`,
      spo2: `${97 + (index % 3)}%`,
      bodyTemp: `${(36 + (index % 5) * 0.1).toFixed(1)} °C`,
      battery: `${96 - index * 2}%`,
      strap: index === 5 ? "Intermittent" : "Connected",
      transport: types[index] === "Uplink" ? "Satellite" : "Mesh",
      gateway: index % 4 === 0 ? "GW-02" : "GW-01",
    };
  });
}

export default function HistoryView({ initialSoldier = "104" }: { initialSoldier?: string }) {
  const [query, setQuery] = useState("");
  const [viewBy, setViewBy] = useState<ViewBy>("Soldier");
  const [soldier, setSoldier] = useState(SOLDIERS.includes(initialSoldier) ? initialSoldier : "104");
  const [range, setRange] = useState<"all" | "30d">("all");
  const [dataTypes, setDataTypes] = useState<DataType[]>(DATA_TYPES);
  const [sources, setSources] = useState<TrackSource[]>(SOURCES);
  const [tab, setTab] = useState<"map" | "summary">("map");
  const [detailOpen, setDetailOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [index, setIndex] = useState(0);

  const stops = useMemo(() => buildStops(soldier), [soldier]);
  const filtered = useMemo(
    () => stops.filter((stop) => dataTypes.includes(stop.dataType) && sources.includes(stop.source)),
    [stops, dataTypes, sources],
  );
  const points: TrackPoint[] = useMemo(
    () =>
      filtered.map((stop) => ({
        position: stop.position,
        time: stop.time,
        source: stop.source,
        label: `${stop.source} (${stop.uncertainty.replace("±", "").trim()})`,
      })),
    [filtered],
  );

  const active = filtered[Math.min(index, Math.max(filtered.length - 1, 0))] ?? null;
  const progress = filtered.length <= 1 ? 100 : (Math.min(index, filtered.length - 1) / Math.max(filtered.length - 1, 1)) * 100;

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [soldier, dataTypes, sources]);

  useEffect(() => {
    if (!playing || filtered.length === 0) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        if (current >= filtered.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(280, 900 / speed));
    return () => window.clearInterval(id);
  }, [playing, speed, filtered.length]);

  function toggleData(name: DataType) {
    setDataTypes((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  function toggleSource(name: TrackSource) {
    setSources((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  function resetFilters() {
    setViewBy("Soldier");
    setRange("all");
    setDataTypes(DATA_TYPES);
    setSources(SOURCES);
    setIndex(0);
  }

  const distanceKm = (filtered.length * 0.0042).toFixed(3);
  const avgHr = filtered.length
    ? Math.round(filtered.reduce((sum, stop) => sum + Number(stop.heartRate.replace(/\D/g, "")), 0) / filtered.length)
    : 0;
  const avgBattery = filtered.length
    ? Math.round(filtered.reduce((sum, stop) => sum + Number(stop.battery.replace(/\D/g, "")), 0) / filtered.length)
    : 0;

  return (
    <div className="cmd hs">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className="hs-body">
        <aside className="hs-filters">
          <div className="hs-filter-head">
            <strong>Filters</strong>
          </div>

          <p className="hs-label">View By</p>
          <div className="hs-segment">
            {(["Soldier", "Group", "Weapon"] as ViewBy[]).map((item) => (
              <button key={item} type="button" className={viewBy === item ? "is-active" : undefined} onClick={() => setViewBy(item)}>
                {item}
              </button>
            ))}
          </div>

          <label className="hs-field">
            Soldier
            <select value={soldier} onChange={(event) => setSoldier(event.target.value)}>
              {SOLDIERS.map((id) => (
                <option key={id} value={id}>
                  S-{id}
                </option>
              ))}
            </select>
          </label>

          <p className="hs-label">Time Range</p>
          <div className="hs-range-toggle">
            <button type="button" className={range === "all" ? "is-active" : undefined} onClick={() => setRange("all")}>
              All time
            </button>
            <button type="button" className={range === "30d" ? "is-active" : undefined} onClick={() => setRange("30d")}>
              30 days
            </button>
          </div>

          <p className="hs-label">Data Type</p>
          <ul className="hs-check">
            {DATA_TYPES.map((name) => (
              <li key={name}>
                <label>
                  <input type="checkbox" checked={dataTypes.includes(name)} onChange={() => toggleData(name)} />
                  <i style={{ background: DATA_COLORS[name] }} />
                  {name}
                </label>
              </li>
            ))}
          </ul>

          <p className="hs-label">Position Source</p>
          <ul className="hs-check">
            {SOURCES.map((name) => (
              <li key={name}>
                <label>
                  <input type="checkbox" checked={sources.includes(name)} onChange={() => toggleSource(name)} />
                  {name}
                </label>
              </li>
            ))}
          </ul>

          <div className="hs-filter-actions">
            <button type="button" className="hs-reset" onClick={resetFilters}>
              Reset
            </button>
            <button type="button" className="hs-apply" onClick={() => setDetailOpen(true)}>
              Apply
            </button>
          </div>
        </aside>

        <section className={`hs-main${detailOpen ? " has-detail" : ""}`}>
          <header className="hs-head">
            <div className="cmd-page-head">
              <span className="cmd-page-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M12 8v4.2l2.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <h1 className="cmd-page-title">History</h1>
                <p>View historical activities, telemetry, movements, and system events from your unit.</p>
              </div>
            </div>
            <div className="hs-tabs">
              <button type="button" className={tab === "map" ? "is-active" : undefined} onClick={() => setTab("map")}>
                Timeline & Map
              </button>
              <button type="button" className={tab === "summary" ? "is-active" : undefined} onClick={() => setTab("summary")}>
                Summary
              </button>
            </div>
          </header>

          <div className="hs-stats">
            <article>
              <span>Total Distance (derived)</span>
              <strong>{distanceKm} km</strong>
            </article>
            <article>
              <span>Heart Rate (avg)</span>
              <strong>{avgHr} bpm</strong>
            </article>
            <article>
              <span>Battery (avg)</span>
              <strong>{avgBattery} %</strong>
            </article>
          </div>

          {tab === "map" ? (
            <div className="hs-stage">
              <div className="hs-map-wrap">
                <HistoryTrackMap points={points} index={Math.min(index, Math.max(points.length - 1, 0))} />
              </div>
              <div className="hs-playback">
                <button
                  type="button"
                  className="hs-play"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={() => {
                    if (!playing && index >= filtered.length - 1) setIndex(0);
                    setPlaying((value) => !value);
                  }}
                >
                  {playing ? "❚❚" : "▶"}
                </button>
                <div className="hs-playback-main">
                  <div className="hs-playback-times">
                    <span>03 Oct 2026 00:00</span>
                    <span>03 Oct 2026 23:59</span>
                  </div>
                  <label className="hs-playback-track">
                    <span className="hs-playback-fill" style={{ width: `${progress}%` }} />
                    {active ? <b style={{ left: `${progress}%` }}>{active.time}</b> : null}
                    <input
                      type="range"
                      min={0}
                      max={Math.max(filtered.length - 1, 0)}
                      value={Math.min(index, Math.max(filtered.length - 1, 0))}
                      onChange={(event) => {
                        setPlaying(false);
                        setIndex(Number(event.target.value));
                        setDetailOpen(true);
                      }}
                    />
                  </label>
                </div>
                <label className="hs-speed">
                  <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </label>
              </div>
            </div>
          ) : (
            <div className="hs-summary">
              <p>
                Soldier S-{soldier} · {filtered.length} track points · {range === "all" ? "All time" : "30 days"}
              </p>
              <ul>
                {filtered.map((stop) => (
                  <li key={`${stop.time}-${stop.title}`}>
                    <strong>{stop.time}</strong>
                    <span>{stop.title}</span>
                    <small>
                      {stop.source} · {stop.dataType}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {detailOpen && active ? (
          <aside className="hs-detail">
            <div className="hs-detail-head">
              <strong>Detail</strong>
              <button type="button" aria-label="Close detail" onClick={() => setDetailOpen(false)}>
                ×
              </button>
            </div>
            <div className="hs-detail-stamp">
              <b>{active.stamp}</b>
              <small>{active.place}</small>
            </div>

            <section>
              <h3>Event</h3>
              <dl>
                <div><dt>Data Type</dt><dd>{active.dataType}</dd></div>
                <div><dt>Position Source</dt><dd>{active.source}</dd></div>
                <div><dt>Soldier</dt><dd>S-{soldier}</dd></div>
                <div><dt>Group</dt><dd>{soldier.startsWith("10") && Number(soldier) >= 107 ? "Bravo" : "Alpha"}</dd></div>
              </dl>
            </section>

            <section>
              <h3>Position</h3>
              <dl>
                <div><dt>Coordinates</dt><dd>{active.position[0].toFixed(5)}, {active.position[1].toFixed(5)}</dd></div>
                <div><dt>Uncertainty</dt><dd>{active.uncertainty}</dd></div>
              </dl>
            </section>

            <section>
              <h3>Location (zoomed)</h3>
              <div className="hs-detail-map" aria-hidden="true">
                <span />
                <small>200 m</small>
              </div>
            </section>

            <section>
              <h3>Vitals</h3>
              <dl>
                <div><dt>Heart Rate</dt><dd>{active.heartRate}</dd></div>
                <div><dt>HRV / RMSSD</dt><dd>{active.hrv}</dd></div>
                <div><dt>SpO2</dt><dd>{active.spo2}</dd></div>
                <div><dt>Body Temp</dt><dd>{active.bodyTemp}</dd></div>
              </dl>
            </section>

            <section>
              <h3>Device</h3>
              <dl>
                <div><dt>Battery</dt><dd>{active.battery}</dd></div>
                <div><dt>Chest Strap</dt><dd className={active.strap === "Connected" ? "is-ok" : "is-warn"}>{active.strap}</dd></div>
              </dl>
            </section>

            <section>
              <h3>Communication</h3>
              <dl>
                <div><dt>Transport</dt><dd>{active.transport}</dd></div>
                <div><dt>Gateway</dt><dd>{active.gateway}</dd></div>
              </dl>
            </section>
          </aside>
        ) : null}
      </main>
    </div>
  );
}
