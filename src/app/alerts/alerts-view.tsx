"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TopHeader from "../dashboard/top-header";
import AlertsChart, { ALERT_COLORS } from "./alerts-chart";
import type { AlertChartBucket } from "./alerts-chart";

type Severity = "Critical" | "Warning" | "Info";
type AlertType =
  | "SOS"
  | "Casualty"
  | "Arrhythmia"
  | "Low Battery"
  | "Heat Stress"
  | "Strap Disconnected"
  | "No Contact";

type AlertRow = {
  id: string;
  code: string;
  title: string;
  date: string;
  time: string;
  stamp: number;
  severity: Severity;
  type: AlertType;
  soldier: string;
  soldierId: string;
  group: "Alpha" | "Bravo" | "Charlie" | "Delta";
  details: string;
  position: string;
  coords: string;
  seen: string;
  status: "Active" | "Cleared" | "Acknowledged";
  battery: string;
  heartRate: string;
  hrv: string;
  bodyTemp: string;
};

const TYPES: AlertType[] = [
  "SOS",
  "Casualty",
  "Arrhythmia",
  "Low Battery",
  "Heat Stress",
  "Strap Disconnected",
  "No Contact",
];
const GROUPS = ["Alpha", "Bravo", "Charlie", "Delta"] as const;
const PAGE_OPTIONS = [8, 20, 50, 100];

const SEED: Omit<AlertRow, "id" | "code" | "stamp" | "coords" | "battery" | "heartRate" | "hrv" | "bodyTemp" | "title" | "status">[] = [
  { date: "03 Oct 2026", time: "22:38", severity: "Critical", type: "SOS", soldier: "S-04", soldierId: "104", group: "Alpha", details: "SOS button pressed", position: "GNSS (±12 m)", seen: "2 minutes ago" },
  { date: "03 Oct 2026", time: "22:21", severity: "Critical", type: "Casualty", soldier: "S-01", soldierId: "101", group: "Alpha", details: "No movement detected (algorithm)", position: "GNSS (±15 m)", seen: "5 minutes ago" },
  { date: "03 Oct 2026", time: "21:56", severity: "Critical", type: "Arrhythmia", soldier: "S-03", soldierId: "103", group: "Bravo", details: "Irregular heart rhythm detected", position: "GNSS (±15 m)", seen: "3 minutes ago" },
  { date: "03 Oct 2026", time: "21:42", severity: "Warning", type: "Low Battery", soldier: "S-07", soldierId: "107", group: "Bravo", details: "Device battery 18%", position: "Mesh (RSSI)", seen: "12 minutes ago" },
  { date: "03 Oct 2026", time: "20:18", severity: "Warning", type: "Heat Stress", soldier: "S-06", soldierId: "106", group: "Charlie", details: "Body temperature high threshold", position: "GNSS (±20 m)", seen: "8 minutes ago" },
  { date: "03 Oct 2026", time: "19:33", severity: "Info", type: "Strap Disconnected", soldier: "S-08", soldierId: "108", group: "Charlie", details: "Chest strap disconnected", position: "GNSS (±25 m)", seen: "18 minutes ago" },
  { date: "03 Oct 2026", time: "18:27", severity: "Info", type: "No Contact", soldier: "S-02", soldierId: "102", group: "Alpha", details: "No data received for > 30 minutes", position: "Last seen 18:26", seen: "(N/A)" },
  { date: "03 Oct 2026", time: "16:04", severity: "Warning", type: "Low Battery", soldier: "S-05", soldierId: "105", group: "Delta", details: "Device battery 20%", position: "Mesh (RSSI)", seen: "12 minutes ago" },
  { date: "03 Oct 2026", time: "14:22", severity: "Info", type: "No Contact", soldier: "S-09", soldierId: "109", group: "Delta", details: "No data received for > 30 minutes", position: "Last seen 14:21", seen: "(N/A)" },
  { date: "03 Oct 2026", time: "12:11", severity: "Info", type: "Strap Disconnected", soldier: "S-10", soldierId: "107b", group: "Bravo", details: "Chest strap disconnected", position: "GNSS (±30 m)", seen: "18 minutes ago" },
  { date: "03 Oct 2026", time: "11:01", severity: "Critical", type: "SOS", soldier: "S-11", soldierId: "104", group: "Alpha", details: "SOS button pressed", position: "GNSS (±12 m)", seen: "2 minutes ago" },
  { date: "03 Oct 2026", time: "09:31", severity: "Critical", type: "SOS", soldier: "S-12", soldierId: "104", group: "Alpha", details: "SOS button pressed", position: "GNSS (±12 m)", seen: "2 minutes ago" },
];

function titleFor(type: AlertType) {
  if (type === "SOS") return "SOS Signal Received";
  if (type === "Casualty") return "Casualty Alert";
  if (type === "Arrhythmia") return "Arrhythmia Detected";
  if (type === "Low Battery") return "Low Battery Warning";
  if (type === "Heat Stress") return "Heat Stress Warning";
  if (type === "Strap Disconnected") return "Strap Disconnected";
  return "No Contact";
}

function makeAlerts(): AlertRow[] {
  const rows: AlertRow[] = [];
  for (let day = 0; day < 3; day += 1) {
    SEED.forEach((item, index) => {
      const stamp = Date.parse(`2026-10-${String(3 - day).padStart(2, "0")}T${item.time}:00+07:00`) - day * 86400000;
      const id = `al-${day + 1}-${index + 1}`;
      const lat = (-6.1754 + ((index + day) % 5) * 0.0012).toFixed(5);
      const lng = (106.8273 + ((index + day) % 4) * 0.0011).toFixed(5);
      rows.push({
        ...item,
        id,
        code: `#AL-2026100${3 - day}-${String(index + 1).padStart(3, "0")}`,
        title: titleFor(item.type),
        date: `${String(3 - day).padStart(2, "0")} Oct 2026`,
        stamp,
        coords: `${lat}, ${lng}`,
        status: item.severity === "Critical" ? "Active" : index % 3 === 0 ? "Acknowledged" : "Active",
        battery: item.type === "Low Battery" ? "18%" : `${64 - ((index + day) % 20)}%`,
        heartRate: item.type === "SOS" || item.type === "Arrhythmia" ? `${118 + (index % 8)} bpm` : `${72 + (index % 12)} bpm`,
        hrv: item.type === "Arrhythmia" ? "28 ms" : `${42 + (index % 10)} ms`,
        bodyTemp: item.type === "Heat Stress" ? "38.6 °C" : `${36.4 + (index % 5) * 0.1} °C`,
      });
    });
  }
  return rows.sort((a, b) => b.stamp - a.stamp);
}

const ALERTS = makeAlerts();

function AlertGlyph({ type }: { type: AlertType }) {
  if (type === "SOS") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.2 1.4 5.6 1.4 5.6H4.8s1.4-1.4 1.4-5.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 18h4.2A11 11 0 0 1 20 8.2M4 14.5h2.8A7.6 7.6 0 0 1 16.8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function AlertsView({
  initialId = "",
  initialSoldier = "",
  initialType = "",
}: {
  initialId?: string;
  initialSoldier?: string;
  initialType?: string;
}) {
  const [query, setQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [range, setRange] = useState<"all" | "30d">("all");
  const [severities, setSeverities] = useState<Severity[]>(["Critical", "Warning", "Info"]);
  const [types, setTypes] = useState<AlertType[]>(TYPES);
  const [groups, setGroups] = useState<string[]>([...GROUPS]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailTab, setDetailTab] = useState<"Details" | "Related">("Details");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialId && ALERTS.some((row) => row.id === initialId)) return initialId;
    if (initialSoldier) {
      const hit = ALERTS.find(
        (row) =>
          row.soldierId === initialSoldier &&
          (!initialType || row.type.toLowerCase() === initialType.toLowerCase()),
      );
      return hit?.id ?? ALERTS.find((row) => row.soldierId === initialSoldier)?.id ?? ALERTS[0]?.id ?? null;
    }
    return ALERTS[0]?.id ?? null;
  });

  const filtered = useMemo(() => {
    const text = groupQuery.trim().toLowerCase();
    const cutoff = Date.parse("2026-10-06T23:59:00+07:00") - 30 * 24 * 60 * 60 * 1000;
    return ALERTS.filter((row) => {
      if (!severities.includes(row.severity)) return false;
      if (!types.includes(row.type)) return false;
      if (!groups.includes(row.group)) return false;
      if (range === "30d" && row.stamp < cutoff) return false;
      if (initialSoldier && row.soldierId !== initialSoldier && !selectedId) return false;
      if (!text) return true;
      return `${row.group} ${row.soldier} ${row.type} ${row.details}`.toLowerCase().includes(text);
    });
  }, [groupQuery, groups, range, severities, types, initialSoldier, selectedId]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = selectedId ? filtered.find((row) => row.id === selectedId) ?? ALERTS.find((row) => row.id === selectedId) ?? null : null;

  const severityCounts = useMemo(() => {
    const tally = { Critical: 0, Warning: 0, Info: 0 };
    ALERTS.forEach((row) => {
      tally[row.severity] += 1;
    });
    return tally;
  }, []);

  const typeCounts = useMemo(() => {
    const tally = Object.fromEntries(TYPES.map((name) => [name, 0])) as Record<AlertType, number>;
    ALERTS.forEach((row) => {
      tally[row.type] += 1;
    });
    return tally;
  }, []);

  const groupCounts = useMemo(() => {
    const tally = Object.fromEntries(GROUPS.map((name) => [name, 0])) as Record<(typeof GROUPS)[number], number>;
    ALERTS.forEach((row) => {
      tally[row.group] += 1;
    });
    return tally;
  }, []);

  const chartData = useMemo(() => {
    const start = Date.parse("2026-07-05T00:00:00+07:00");
    const end = Date.parse("2026-10-03T00:00:00+07:00");
    const step = 5 * 24 * 60 * 60 * 1000;
    const buckets: AlertChartBucket[] = [];
    for (let time = start; time <= end; time += step) {
      const date = new Date(time);
      buckets.push({
        time,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        Critical: 0,
        Warning: 0,
        Info: 0,
      });
    }
    filtered.forEach((row) => {
      const index = Math.min(buckets.length - 1, Math.max(0, Math.floor((row.stamp - start) / step)));
      buckets[index][row.severity] += 1;
    });
    return buckets;
  }, [filtered]);

  function toggleSeverity(name: Severity) {
    setSeverities((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
    setPage(1);
  }

  function toggleType(name: AlertType) {
    setTypes((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
    setPage(1);
  }

  function toggleGroup(name: string) {
    setGroups((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
    setPage(1);
  }

  function exportCsv() {
    const header = ["Time", "Severity", "Type", "Soldier", "Group", "Details", "Position", "Seen"];
    const body = filtered.map((row) =>
      [`${row.date} ${row.time}`, row.severity, row.type, row.soldier, row.group, row.details, row.position, row.seen]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trackforge-alerts.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cmd al">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className="al-body">
        <header className="al-head">
          <div className="cmd-page-head">
            <span className="cmd-page-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 4.5 20.2 19H3.8L12 4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M12 10v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="0.9" fill="currentColor" />
              </svg>
            </span>
            <div>
              <h1 className="cmd-page-title">Alerts</h1>
              <p>Monitor and manage critical events from soldiers and system devices.</p>
            </div>
          </div>
          <div className="al-stats">
            <article className="is-critical">
              <span>Critical</span>
              <strong>{severityCounts.Critical}</strong>
            </article>
            <article className="is-warning">
              <span>Warning</span>
              <strong>{severityCounts.Warning}</strong>
            </article>
            <article className="is-info">
              <span>Info</span>
              <strong>{severityCounts.Info}</strong>
            </article>
            <article>
              <span>Total</span>
              <strong>{ALERTS.length}</strong>
            </article>
          </div>
        </header>

        <section className="al-chart" aria-label="Alerts daily intervals">
          <div className="al-chart-top">
            <div>
              <h2>Alerts — Daily Intervals</h2>
              <small>{filtered.length} alerts · {range === "all" ? "All time" : "30 days"}</small>
            </div>
            <div className="al-legend">
              {(["Critical", "Warning", "Info"] as Severity[]).map((name) => (
                <span key={name}>
                  <i style={{ background: ALERT_COLORS[name] }} />
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="al-chart-plot">
            <AlertsChart data={chartData} />
          </div>
          <div className="al-axis">
            <span>7/5</span>
            <span>10/3</span>
          </div>
        </section>

        <div className={`al-main${selected ? " is-open" : ""}`}>
          <aside className="al-filters">
            <div className="al-filter-head">
              <strong>Filters</strong>
              <button type="button" className="al-mini-export" onClick={exportCsv}>
                Export
              </button>
            </div>

            <p className="al-label">Time Range</p>
            <div className="al-range-toggle">
              <button type="button" className={range === "all" ? "is-active" : undefined} onClick={() => { setRange("all"); setPage(1); }}>
                All time
              </button>
              <button type="button" className={range === "30d" ? "is-active" : undefined} onClick={() => { setRange("30d"); setPage(1); }}>
                30 days
              </button>
            </div>

            <p className="al-label">Severity</p>
            <ul className="al-check">
              {(["Critical", "Warning", "Info"] as Severity[]).map((name) => (
                <li key={name}>
                  <label>
                    <input type="checkbox" checked={severities.includes(name)} onChange={() => toggleSeverity(name)} />
                    <i style={{ background: ALERT_COLORS[name] }} />
                    {name}
                  </label>
                  <span>{severityCounts[name]}</span>
                </li>
              ))}
            </ul>

            <p className="al-label">Alert Type</p>
            <ul className="al-check">
              {TYPES.map((name) => (
                <li key={name}>
                  <label>
                    <input type="checkbox" checked={types.includes(name)} onChange={() => toggleType(name)} />
                    <span className="al-type-ico"><AlertGlyph type={name} /></span>
                    {name}
                  </label>
                  <span>{typeCounts[name]}</span>
                </li>
              ))}
            </ul>

            <p className="al-label">Group</p>
            <label className="al-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={groupQuery}
                placeholder="Search group..."
                onChange={(event) => {
                  setGroupQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <ul className="al-check">
              {GROUPS.map((name) => (
                <li key={name}>
                  <label>
                    <input type="checkbox" checked={groups.includes(name)} onChange={() => toggleGroup(name)} />
                    {name}
                  </label>
                  <span>{groupCounts[name]}</span>
                </li>
              ))}
            </ul>

            <button type="button" className="al-apply" onClick={() => setPage(1)}>
              Apply
            </button>
          </aside>

          <section className="al-results">
            <div className="al-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>SEVERITY</th>
                    <th>TYPE</th>
                    <th>SOLDIER</th>
                    <th>GROUP</th>
                    <th>DETAILS</th>
                    <th>SOURCE</th>
                    <th>SEEN</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.id === selectedId ? "is-selected" : undefined}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td>
                        <b>{row.date}</b>
                        <small>{row.time}</small>
                      </td>
                      <td><span className={`cmd-sev is-${row.severity.toLowerCase()}`}>{row.severity}</span></td>
                      <td>
                        <span className="al-row-type">
                          <AlertGlyph type={row.type} />
                          {row.type}
                        </span>
                      </td>
                      <td>{row.soldier}</td>
                      <td>{row.group}</td>
                      <td>{row.details}</td>
                      <td>{row.position}</td>
                      <td>{row.seen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer>
              <span>
                {(safePage - 1) * pageSize + (rows.length ? 1 : 0)}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} results
              </span>
              <div>
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
                {Array.from({ length: Math.min(pages, 5) }, (_, index) => {
                  const number = index + 1;
                  return (
                    <button key={number} type="button" className={number === safePage ? "is-active" : undefined} onClick={() => setPage(number)}>
                      {number}
                    </button>
                  );
                })}
                <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>›</button>
                <label className="al-page-size">
                  <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                    {PAGE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size} / page</option>
                    ))}
                  </select>
                </label>
              </div>
            </footer>
          </section>

          {selected ? (
            <aside className="al-detail">
              <div className="al-detail-head">
                <span className={`al-detail-ico is-${selected.severity.toLowerCase()}`}>
                  <AlertGlyph type={selected.type} />
                </span>
                <div>
                  <h2>{selected.title}</h2>
                  <small>{selected.code}</small>
                </div>
                <span className={`cmd-sev is-${selected.severity.toLowerCase()}`}>{selected.severity}</span>
                <button type="button" aria-label="Close detail" onClick={() => setSelectedId(null)}>×</button>
              </div>

              <div className="al-detail-tabs">
                <button type="button" className={detailTab === "Details" ? "is-active" : undefined} onClick={() => setDetailTab("Details")}>
                  Details
                </button>
                <button type="button" className={detailTab === "Related" ? "is-active" : undefined} onClick={() => setDetailTab("Related")}>
                  Related
                </button>
              </div>

              {detailTab === "Details" ? (
                <>
                  <dl className="al-meta">
                    <div><dt>Event Time</dt><dd>{selected.date} {selected.time}</dd></div>
                    <div><dt>Alert Type</dt><dd>{selected.type}</dd></div>
                    <div><dt>Soldier ID</dt><dd>{selected.soldier}</dd></div>
                    <div><dt>Group</dt><dd>{selected.group}</dd></div>
                    <div><dt>Status</dt><dd className="is-active-status">{selected.status}</dd></div>
                    <div><dt>Position Source</dt><dd>{selected.position}</dd></div>
                    <div><dt>Last Seen</dt><dd>{selected.seen}</dd></div>
                    <div><dt>Battery Level</dt><dd>{selected.battery}</dd></div>
                  </dl>

                  <div className="al-location">
                    <div className="al-location-head">
                      <strong>Location</strong>
                      <small>{selected.coords}</small>
                    </div>
                    <div className="al-mini-map" aria-hidden="true">
                      <span className="al-sos-pin">{selected.type === "SOS" ? "SOS" : selected.type.slice(0, 3).toUpperCase()}</span>
                    </div>
                    <Link href={`/dashboard`} className="al-map-link">
                      Open on main map
                    </Link>
                  </div>

                  <div className="al-vitals">
                    <div className="al-vitals-head">
                      <strong>Latest Vital</strong>
                      <small>from Chest Strap · {selected.time}</small>
                    </div>
                    <div className="al-vital-grid">
                      <article>
                        <span>Heart Rate</span>
                        <strong>{selected.heartRate}</strong>
                        <small className={selected.type === "SOS" || selected.type === "Arrhythmia" ? "is-bad" : undefined}>
                          {selected.type === "SOS" || selected.type === "Arrhythmia" ? "High" : "Normal"}
                        </small>
                      </article>
                      <article>
                        <span>HRV</span>
                        <strong>{selected.hrv}</strong>
                        <small className={selected.hrv === "28 ms" ? "is-warn" : undefined}>
                          {selected.hrv === "28 ms" ? "Low" : "Steady"}
                        </small>
                      </article>
                      <article>
                        <span>Body Temp</span>
                        <strong>{selected.bodyTemp}</strong>
                        <small className={selected.type === "Heat Stress" ? "is-bad" : undefined}>
                          {selected.type === "Heat Stress" ? "High" : "Normal"}
                        </small>
                      </article>
                    </div>
                  </div>
                </>
              ) : (
                <div className="al-related">
                  <p>Related alerts for {selected.soldier}</p>
                  <ul>
                    {ALERTS.filter((row) => row.soldierId === selected.soldierId && row.id !== selected.id)
                      .slice(0, 5)
                      .map((row) => (
                        <li key={row.id}>
                          <button type="button" onClick={() => setSelectedId(row.id)}>
                            <strong>{row.type}</strong>
                            <small>{row.date} {row.time}</small>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}
