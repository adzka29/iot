"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import ExplorerChart, { COLORS } from "./explorer-chart";
import type { ChartBucket } from "./explorer-chart";

type Level = "Uplink" | "Mesh" | "Telemetry" | "Beacon" | "System" | "Special";

type RecordRow = {
  id: string;
  event: string;
  received: string;
  stamp: number;
  entity: string;
  group: "Alpha" | "Bravo";
  level: Level;
  record: string;
  gateway: string;
  summary: string;
  hex: string;
  decoded: string;
  communication: string;
};

const LEVELS: Level[] = ["Uplink", "Mesh", "Telemetry", "Beacon", "System", "Special"];
const PAGE_OPTIONS = [8, 25, 50, 100];
const HEX = "ae11bb2233cc44dd55ee66ff77889900aabbccddeeff00112233445566778899";

function formatStamp(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = "Oct";
  const year = date.getFullYear();
  const time = date.toLocaleTimeString("en-GB", { hour12: false });
  return `${day} ${month} ${year} ${time}`;
}

function makeRecords(): RecordRow[] {
  const entities = ["GW-01", "P-108", "P-107", "P-106", "P-105", "P-104", "P-103", "P-101"];
  const start = Date.parse("2026-10-04T06:00:00+07:00");
    const end = Date.parse("2026-10-04T08:30:00+07:00");
  const mix: Level[] = [
    ...Array.from({ length: 240 }, () => "Mesh" as const),
    ...Array.from({ length: 240 }, () => "Telemetry" as const),
    ...Array.from({ length: 18 }, () => "Beacon" as const),
    ...Array.from({ length: 3 }, () => "System" as const),
    ...Array.from({ length: 2 }, () => "Special" as const),
    ...Array.from({ length: 2 }, () => "Uplink" as const),
  ];
  const totals: Record<Level, number> = { Mesh: 240, Telemetry: 240, Beacon: 18, System: 3, Special: 2, Uplink: 2 };
  const seen: Record<Level, number> = { Mesh: 0, Telemetry: 0, Beacon: 0, System: 0, Special: 0, Uplink: 0 };
  return mix.map((level, index) => {
    seen[level] += 1;
    const progress = (seen[level] - 1) / Math.max(totals[level] - 1, 1);
    const ratio = level === "Beacon" ? progress : 0.78 + progress * 0.22;
    const stamp = Math.round(start + (end - start) * Math.min(ratio, 1));
    const date = new Date(stamp);
    const entity = level === "Uplink" ? "GW-01" : entities[index % entities.length];
    const record =
      level === "Uplink" ? "Satellite Uplink" : level === "Telemetry" ? "Soldier Telemetry" : "Lora Frame";
    const summary =
      level === "Uplink" ? "8 packets · 174 B" : level === "Telemetry" ? "GNSS" : `TTL ${4 - (index % 3)} · hop ${index % 3}`;
    return {
      id: `rec-${index + 1}`,
      event: formatStamp(date),
      received: formatStamp(new Date(stamp + 4000 + (index % 7) * 250)),
      stamp,
      entity,
      group: entity.endsWith("7") || entity.endsWith("8") ? ("Bravo" as const) : ("Alpha" as const),
      level,
      record,
      gateway: index % 9 === 0 ? "GW-02" : "GW-01",
      summary,
      hex: HEX.repeat(3),
      decoded:
        level === "Uplink"
          ? "Gateway stores the soldier payload undecoded. This record is transport metadata, not a sensor reading."
          : level === "Telemetry"
            ? "Decoded soldier telemetry: GNSS fix, heart rate, and battery snapshot from the chest node."
            : "LoRa mesh frame forwarded toward the gateway with hop count and TTL remaining.",
      communication: JSON.stringify(
        {
          gateway_id: index % 9 === 0 ? "GW-02" : "GW-01",
          burst_id: `Burst-20261004-${String(index).padStart(6, "0")}`,
          packet_count: level === "Uplink" ? 8 : 1,
          size_bytes: level === "Uplink" ? 174 : 42 + (index % 18),
          sent_at: formatStamp(date),
          received_at: formatStamp(new Date(stamp + 4000)),
          delivery_status: "delivered",
          retry_count: 0,
          session_duration_seconds: 18,
          delivery_mode: "LIVE",
        },
        null,
        2,
      ),
    };
  }).sort((a, b) => b.stamp - a.stamp);
}

const RECORDS = makeRecords();

function jsonTone(text: string) {
  return text.split(/("(?:\\.|[^"\\])*")/g).map((part, index) => (
    <span key={`${part}-${index}`} className={index % 2 ? "is-str" : undefined}>
      {part}
    </span>
  ));
}

function LevelMark({ level }: { level: Level }) {
  return (
    <span className={`ex-level is-${level.toLowerCase()}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 18c3.2-3 5.2-7.5 5.2-12M9.5 18c2.2-2.2 3.4-5.2 3.4-8.8M14 18c1.4-1.4 2.1-3.3 2.1-5.6M18.2 18c.7-.7 1.1-1.7 1.1-2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {level}
    </span>
  );
}

export default function ExplorerView({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState("");
  const [recordQuery, setRecordQuery] = useState(initialQuery);
  const [entityType, setEntityType] = useState("All");
  const [group, setGroup] = useState("All Groups");
  const [level, setLevel] = useState("All Levels");
  const [recordType, setRecordType] = useState("All Records");
  const [source, setSource] = useState("All Sources");
  const [gateway, setGateway] = useState("All Gateways");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selectedId, setSelectedId] = useState<string | null>(RECORDS[0].id);
  const [range, setRange] = useState<"all" | "30d">("all");
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeLabel = range === "all" ? "All time" : "30 days";

  const filtered = useMemo(() => {
    const text = recordQuery.trim().toLowerCase();
    return RECORDS.filter((row) => {
      if (entityType === "Gateway" && !row.entity.startsWith("GW")) return false;
      if (entityType === "Personnel" && !row.entity.startsWith("P-")) return false;
      if (group !== "All Groups" && row.group !== group) return false;
      if (level !== "All Levels" && row.level !== level) return false;
      if (recordType !== "All Records" && row.record !== recordType) return false;
      if (gateway !== "All Gateways" && row.gateway !== gateway) return false;
      if (source === "Satellite" && row.level !== "Uplink") return false;
      if (source === "Radio" && row.level === "Uplink") return false;
      if (range === "30d") {
        const cutoff = Date.parse("2026-10-06T17:00:00+07:00") - 30 * 24 * 60 * 60 * 1000;
        if (row.stamp < cutoff) return false;
      }
      if (!text) return true;
      return `${row.entity} ${row.level} ${row.record} ${row.gateway} ${row.summary}`.toLowerCase().includes(text);
    });
  }, [recordQuery, entityType, group, level, recordType, gateway, source, range]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageWindow = Math.min(pages, 7);
  const pageStart = Math.min(Math.max(currentPage - Math.floor(pageWindow / 2), 1), Math.max(pages - pageWindow + 1, 1));
  const selected = selectedId ? filtered.find((row) => row.id === selectedId) ?? null : null;
  const counts = useMemo(() => {
    const tally = Object.fromEntries(LEVELS.map((name) => [name, 0])) as Record<Level, number>;
    filtered.forEach((row) => {
      tally[row.level] += 1;
    });
    return tally;
  }, [filtered]);
  const chartData = useMemo(() => {
    const start = Date.parse("2026-10-04T06:00:00+07:00");
    const end = Date.parse("2026-10-04T08:30:00+07:00");
    const step = 5 * 60 * 1000;
    const buckets: ChartBucket[] = [];
    for (let time = start; time < end; time += step) {
      const clock = new Date(time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      buckets.push({
        time,
        label: `04 Oct, ${clock}`,
        Mesh: 0,
        Telemetry: 0,
        Beacon: 0,
        System: 0,
        Special: 0,
        Uplink: 0,
      });
    }
    filtered.forEach((row) => {
      const index = Math.min(buckets.length - 1, Math.max(0, Math.floor((row.stamp - start) / step)));
      buckets[index][row.level] += 1;
    });
    return buckets;
  }, [filtered]);

  function clearFilters() {
    setRecordQuery("");
    setEntityType("All");
    setGroup("All Groups");
    setLevel("All Levels");
    setRecordType("All Records");
    setSource("All Sources");
    setGateway("All Gateways");
    setPage(1);
  }

  function exportCsv() {
    const header = ["Event time", "Received", "Entity", "Level", "Record", "Gateway", "Summary"];
    const body = filtered.map((row) =>
      [row.event, row.received, row.entity, row.level, row.record, row.gateway, row.summary]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "synapse-t-explorer.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cmd ex">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className="ex-body">
        <header className="ex-head">
          <div className="cmd-page-head">
            <span className="cmd-page-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="cmd-page-title is-split">
                <span>Search</span>
                <span className="cmd-page-title-sep">/</span>
                <span className="cmd-page-title-accent">Explorer</span>
              </h1>
              <p>Raw packets, decoded fields, and communication metadata</p>
            </div>
          </div>
          <div className="ex-head-actions">
            <div className="ex-range">
              <button
                type="button"
                className="ex-range-btn"
                aria-haspopup="listbox"
                aria-expanded={rangeOpen}
                onClick={() => setRangeOpen((open) => !open)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M8 3.8v3.2M16 3.8v3.2M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                {rangeLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {rangeOpen ? (
                <div className="ex-range-menu" role="listbox">
                  <button
                    type="button"
                    role="option"
                    className={range === "all" ? "is-active" : undefined}
                    onClick={() => {
                      setRange("all");
                      setRangeOpen(false);
                      setPage(1);
                    }}
                  >
                    All time
                  </button>
                  <button
                    type="button"
                    role="option"
                    className={range === "30d" ? "is-active" : undefined}
                    onClick={() => {
                      setRange("30d");
                      setRangeOpen(false);
                      setPage(1);
                    }}
                  >
                    30 days
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="ex-export" onClick={exportCsv}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4v10.5M8.2 10.8 12 14.6l3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Export
            </button>
            <Link href="/dashboard" className="cmd-back-map">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4.5 10.2 12 4.5l7.5 5.7V19a1.5 1.5 0 0 1-1.5 1.5h-3.2v-5.2h-5.6V20.5H6A1.5 1.5 0 0 1 4.5 19v-8.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Back to Map
            </Link>
          </div>
        </header>

        <section className="ex-chart" aria-label="Records over time">
          <div className="ex-chart-top">
            <div>
              <h2>Records over time</h2>
              <small>{filtered.length} records · {rangeLabel}</small>
            </div>
            <div className="ex-legend">
              {LEVELS.map((name) => (
                <span key={name}>
                  <i style={{ background: COLORS[name] }} />
                  {name} {counts[name]}
                </span>
              ))}
            </div>
          </div>
          <div className="ex-chart-plot">
            <ExplorerChart data={chartData} />
          </div>
          <div className="ex-axis">
            <span>04 Oct, 06:00</span>
            <span>04 Oct, 08:30</span>
          </div>
        </section>

        <div className={`ex-main${selected ? " is-open" : ""}`}>
          <aside className="ex-filters">
            <h2>Filters</h2>
            <label className="ex-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={recordQuery}
                placeholder="Search records..."
                onChange={(event) => {
                  setRecordQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Entity Type
              <select value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1); }}>
                <option>All</option>
                <option>Personnel</option>
                <option>Gateway</option>
              </select>
            </label>
            <label>
              Group
              <select value={group} onChange={(event) => { setGroup(event.target.value); setPage(1); }}>
                <option>All Groups</option>
                <option>Alpha</option>
                <option>Bravo</option>
              </select>
            </label>
            <label>
              Level
              <select value={level} onChange={(event) => { setLevel(event.target.value); setPage(1); }}>
                <option>All Levels</option>
                {LEVELS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Record
              <select value={recordType} onChange={(event) => { setRecordType(event.target.value); setPage(1); }}>
                <option>All Records</option>
                <option>Satellite Uplink</option>
                <option>Lora Frame</option>
                <option>Soldier Telemetry</option>
              </select>
            </label>
            <label>
              Source
              <select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }}>
                <option>All Sources</option>
                <option>Satellite</option>
                <option>Radio</option>
              </select>
            </label>
            <label>
              Gateway
              <select value={gateway} onChange={(event) => { setGateway(event.target.value); setPage(1); }}>
                <option>All Gateways</option>
                <option>GW-01</option>
                <option>GW-02</option>
              </select>
            </label>
            <button type="button" className="ex-clear" onClick={clearFilters}>
              Clear
            </button>
          </aside>

          <section className="ex-results">
            <h2>Results ({filtered.length} records)</h2>
            <div className="ex-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event time</th>
                    <th>Received</th>
                    <th>Entity</th>
                    <th>Level</th>
                    <th>Record</th>
                    <th>Gateway</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={selected?.id === row.id ? "is-selected" : undefined}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td>{row.event.replace(" 2026 ", " ")}</td>
                      <td>{row.received.replace(" 2026 ", " ")}</td>
                      <td>{row.entity}</td>
                      <td>
                        <LevelMark level={row.level} />
                      </td>
                      <td>{row.record}</td>
                      <td>{row.gateway}</td>
                      <td>{row.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ex-pager">
              <small>
                {filtered.length} records · 1073 ms
              </small>
              <div>
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: pageWindow }, (_, index) => {
                  const number = pageStart + index;
                  return (
                    <button
                      key={number}
                      type="button"
                      className={currentPage === number ? "is-active" : undefined}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={currentPage >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  ›
                </button>
                <label className="ex-page-size">
                  <select
                    value={pageSize}
                    aria-label="Rows per page"
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </section>

          {selected ? (
            <aside className="ex-detail">
              <header>
                <h2>Record</h2>
                <button type="button" aria-label="Close record" onClick={() => setSelectedId(null)}>
                  ×
                </button>
              </header>
              <h3>Raw payload</h3>
              <pre className="ex-json">
                {jsonTone(
                  JSON.stringify(
                    {
                      raw_hex: selected.hex,
                      raw_format: "HEX",
                      raw_bytes_length: Math.round(selected.hex.length / 2),
                    },
                    null,
                    2,
                  ),
                )}
              </pre>
              <h3>Decoded</h3>
              <p>{selected.decoded}</p>
              <h3>Communication</h3>
              <pre className="ex-json">{jsonTone(selected.communication)}</pre>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}
