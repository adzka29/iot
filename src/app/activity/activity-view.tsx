"use client";

import { useMemo, useState } from "react";
import TopHeader from "../dashboard/top-header";

type Activity = {
  id: string;
  date: string;
  time: string;
  title: string;
  detail: string;
  category: string;
  actor: string;
  target: string;
  targetKind: string;
  action: "Login" | "Create" | "Update";
  outcome: "Success";
  ip: string;
  actorType: string;
};

const categories = [
  "Authentication",
  "Personnel",
  "Groups",
  "Weapons",
  "Operations",
  "Alerts",
  "Tickets",
  "History",
  "Communication",
  "User Access",
  "Settings",
  "Reports",
];

const logs: Activity[] = [
  { id: "1", date: "10/06/26", time: "19:10:53", title: "User Login", detail: "Signed in.", category: "Authentication", actor: "Superadmin", target: "Superadmin", targetKind: "User", action: "Login", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "2", date: "10/06/26", time: "03:20:46", title: "User Login", detail: "Signed in.", category: "Authentication", actor: "Superadmin", target: "Superadmin", targetKind: "User", action: "Login", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "3", date: "10/06/26", time: "00:04:43", title: "Ticket Created", detail: "Created a ticket from an alert.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-002", targetKind: "Ticket", action: "Create", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "4", date: "10/06/26", time: "00:04:30", title: "Operation Created", detail: "Created an operation.", category: "Operations", actor: "Superadmin", target: "OP-2026-001", targetKind: "Operation", action: "Create", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "5", date: "10/06/26", time: "00:03:52", title: "Ticket Closed", detail: "Closed the ticket.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-001", targetKind: "Ticket", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "6", date: "10/06/26", time: "00:03:51", title: "Ticket Resolved", detail: "Resolved the ticket and its source alert.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-001", targetKind: "Ticket", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "7", date: "10/06/26", time: "00:03:49", title: "Ticket Started", detail: "Started working on the ticket.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-001", targetKind: "Ticket", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "8", date: "10/06/26", time: "00:03:47", title: "Ticket Assigned", detail: "Assigned the ticket to Superadmin.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-001", targetKind: "Ticket", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "9", date: "10/05/26", time: "22:18:12", title: "Ticket Updated", detail: "Updated ticket priority.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-002", targetKind: "Ticket", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "10", date: "10/05/26", time: "21:04:08", title: "Ticket Noted", detail: "Added a note to the ticket.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-002", targetKind: "Ticket", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "11", date: "10/05/26", time: "18:41:33", title: "Ticket Reopened", detail: "Reopened the ticket.", category: "Tickets", actor: "Superadmin", target: "TK-20261005-002", targetKind: "Ticket", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "12", date: "10/05/26", time: "16:37:13", title: "User Login", detail: "Signed in.", category: "Authentication", actor: "Superadmin", target: "Superadmin", targetKind: "User", action: "Login", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "13", date: "10/05/26", time: "09:12:04", title: "User Login", detail: "Signed in.", category: "Authentication", actor: "Superadmin", target: "Superadmin", targetKind: "User", action: "Login", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "14", date: "08/12/26", time: "11:22:09", title: "Settings Updated", detail: "Changed notification preferences.", category: "Settings", actor: "Superadmin", target: "Settings", targetKind: "System", action: "Update", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
  { id: "15", date: "07/18/26", time: "08:03:41", title: "Report Generated", detail: "Exported monthly activity report.", category: "Reports", actor: "Superadmin", target: "RPT-2026-07", targetKind: "Report", action: "Create", outcome: "Success", ip: "100.64.0.7", actorType: "User" },
];

const PAGE_OPTIONS = [8, 25, 50, 100];
const RANGE_NOW = Date.parse("2026-10-06T17:25:00+07:00");
const DAY_MS = 24 * 60 * 60 * 1000;

function activityStamp(item: Activity) {
  const [month, day, year] = item.date.split("/");
  return Date.parse(`20${year}-${month}-${day}T${item.time}+07:00`);
}

export default function ActivityView() {
  const [query, setQuery] = useState("");
  const [actorQuery, setActorQuery] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const [action, setAction] = useState("All Actions");
  const [outcome, setOutcome] = useState("All");
  const [actor, setActor] = useState("All Users");
  const [enabled, setEnabled] = useState<string[]>(categories);
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(logs[1].id);
  const [checked, setChecked] = useState<string[]>([]);
  const [range, setRange] = useState<"all" | "30d">("all");
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeLabel = range === "all" ? "All time" : "30 days";

  const ranged = useMemo(() => {
    if (range === "all") return logs;
    const cutoff = RANGE_NOW - 30 * DAY_MS;
    return logs.filter((item) => activityStamp(item) >= cutoff);
  }, [range]);

  const counts = useMemo(() => {
    const tally = Object.fromEntries(categories.map((name) => [name, 0]));
    ranged.forEach((item) => {
      tally[item.category] += 1;
    });
    return tally;
  }, [ranged]);

  const filtered = useMemo(() => {
    const text = `${actorQuery} ${tableQuery}`.trim().toLowerCase();
    const rows = ranged.filter((item) => {
      if (!enabled.includes(item.category)) return false;
      if (action !== "All Actions" && item.action !== action) return false;
      if (outcome !== "All" && item.outcome !== outcome) return false;
      if (actor !== "All Users" && item.actor !== actor) return false;
      if (!text) return true;
      return `${item.title} ${item.detail} ${item.target} ${item.actor} ${item.category}`.toLowerCase().includes(text);
    });
    return sort === "recent" ? rows : [...rows].reverse();
  }, [action, actor, actorQuery, enabled, outcome, ranged, sort, tableQuery]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageWindow = Math.min(pages, 7);
  const pageStart = Math.min(Math.max(safePage - Math.floor(pageWindow / 2), 1), Math.max(pages - pageWindow + 1, 1));
  const selected = filtered.find((item) => item.id === selectedId) ?? null;
  const userActions = ranged.filter((item) => item.actorType === "User").length;
  const failed = ranged.filter((item) => item.outcome !== "Success").length;

  function resetFilters() {
    setActorQuery("");
    setTableQuery("");
    setAction("All Actions");
    setOutcome("All");
    setActor("All Users");
    setEnabled(categories);
    setRange("all");
    setRangeOpen(false);
    setPage(1);
  }

  function toggleCategory(name: string) {
    setEnabled((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
    setPage(1);
  }

  function exportRows() {
    const source = checked.length ? filtered.filter((item) => checked.includes(item.id)) : filtered;
    const header = ["Time", "Event", "Category", "Actor", "Target", "Action", "Outcome"];
    const body = source.map((item) => [ `${item.date} ${item.time}`, item.title, item.category, item.actor, item.target, item.action, item.outcome ]);
    const csv = [header, ...body].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "activity-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cmd act">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className="act-body">
        <header className="act-head">
          <div>
            <h1>Activity Log</h1>
            <p>Monitor and review all user and system activities across the TrackForge platform.</p>
          </div>
          <div className="act-head-actions">
            <div className="act-range">
              <button
                type="button"
                className="act-range-btn"
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
                <div className="act-range-menu" role="listbox">
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
            <button type="button" className="act-export" onClick={exportRows}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Export
            </button>
          </div>
        </header>

        <section className="act-stats">
          <Stat icon="total" label="Total Activities" value={ranged.length} color="#60a5fa" />
          <Stat icon="user" label="User Actions" value={userActions} color="#4ade80" />
          <Stat icon="system" label="System Actions" value={ranged.length - userActions} color="#a78bfa" />
          <Stat icon="failed" label="Failed Actions" value={failed} color="#f87171" />
        </section>

        <div className={`act-grid${selected ? " has-detail" : ""}`}>
          <aside className="act-filters">
            <div className="act-filter-head">
              <strong>Filters</strong>
              <button type="button" onClick={resetFilters}>Reset</button>
            </div>
            <label className="act-search">
              <SearchIcon />
              <input value={actorQuery} placeholder="Search actor..." onChange={(event) => { setActorQuery(event.target.value); setPage(1); }} />
            </label>
            <FilterSelect label="ACTION" value={action} options={["All Actions", "Login", "Create", "Update"]} onChange={(value) => { setAction(value); setPage(1); }} />
            <FilterSelect label="OUTCOME" value={outcome} options={["All", "Success"]} onChange={(value) => { setOutcome(value); setPage(1); }} />
            <FilterSelect label="ACTOR" value={actor} options={["All Users", "Superadmin"]} onChange={(value) => { setActor(value); setPage(1); }} />
            <p>CATEGORY</p>
            <ul>
              {categories.map((name) => (
                <li key={name}>
                  <label>
                    <input type="checkbox" checked={enabled.includes(name)} onChange={() => toggleCategory(name)} />
                    {name}
                  </label>
                  <span>{counts[name]}</span>
                </li>
              ))}
            </ul>
          </aside>

          <section className="act-table-wrap">
            <div className="act-toolbar">
              <label className="act-search">
                <SearchIcon />
                <input value={tableQuery} placeholder="Search action, target, or details..." onChange={(event) => { setTableQuery(event.target.value); setPage(1); }} />
              </label>
              <button type="button" className="act-sort" onClick={() => setSort((value) => (value === "recent" ? "oldest" : "recent"))}>
                Sort: {sort === "recent" ? "Most Recent" : "Oldest"}
              </button>
            </div>
            <div className="act-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th />
                    <th>TIME</th>
                    <th>EVENT</th>
                    <th>CATEGORY</th>
                    <th>ACTOR</th>
                    <th>TARGET</th>
                    <th>ACTION</th>
                    <th>OUTCOME</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id} className={item.id === selectedId ? "is-selected" : undefined} onClick={() => setSelectedId(item.id)}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked.includes(item.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => setChecked((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]))}
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                      <td>
                        <b>{item.date}</b>
                        <small>{item.time}</small>
                      </td>
                      <td>
                        <b>{item.title}</b>
                        <small>{item.detail}</small>
                      </td>
                      <td><span className={`act-cat is-${item.category.toLowerCase().replaceAll(" ", "-")}`}>{item.category}</span></td>
                      <td><span className="act-actor"><i>S</i>{item.actor}</span></td>
                      <td>
                        <span className="act-target">
                          <b>{item.target}</b>
                          <small>{item.targetKind}</small>
                        </span>
                      </td>
                      <td><span className={`act-pill is-${item.action.toLowerCase()}`}>{item.action}</span></td>
                      <td><span className="act-pill is-success">{item.outcome}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer>
              <span>Showing {(safePage - 1) * pageSize + (visible.length ? 1 : 0)}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length} activities</span>
              <div>
                <button type="button" aria-label="Previous page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
                {Array.from({ length: pageWindow }, (_, index) => {
                  const number = pageStart + index;
                  return (
                    <button key={number} type="button" className={number === safePage ? "is-active" : undefined} onClick={() => setPage(number)}>
                      {number}
                    </button>
                  );
                })}
                <button type="button" aria-label="Next page" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>›</button>
                <label className="act-page-size">
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
            </footer>
          </section>

          {selected ? (
            <aside className="act-detail">
              <div className="act-detail-head">
                <strong>Activity Detail</strong>
                <button type="button" aria-label="Close detail" onClick={() => setSelectedId(null)}>×</button>
              </div>
              <h2>{selected.title}</h2>
              <p>{selected.detail}</p>
              <dl>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{selected.date.replace(/(\d{2})$/, "20$1")} {selected.time}</dd>
                </div>
                <div>
                  <dt>Actor</dt>
                  <dd><span className="act-actor"><i>S</i>{selected.actor}</span></dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd><span className={`act-cat is-${selected.category.toLowerCase().replaceAll(" ", "-")}`}>{selected.category}</span></dd>
                </div>
                <div>
                  <dt>Action</dt>
                  <dd>{selected.action}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{selected.target} <small>{selected.targetKind}</small></dd>
                </div>
                <div>
                  <dt>Outcome</dt>
                  <dd><span className="act-pill is-success">{selected.outcome}</span></dd>
                </div>
              </dl>
              <h3>DESCRIPTION</h3>
              <p>{selected.detail}</p>
              <h3>ADDITIONAL INFORMATION</h3>
              <dl>
                <div>
                  <dt>IP address</dt>
                  <dd>{selected.ip}</dd>
                </div>
                <div>
                  <dt>Actor type</dt>
                  <dd>{selected.actorType}</dd>
                </div>
              </dl>
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <article className="act-stat">
      <span className={`act-stat-icon is-${icon}`} style={{ color }}>{value === 0 && icon === "failed" ? "!" : icon === "user" ? "U" : icon === "system" ? "S" : "#"}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
      <Spark color={color} />
    </article>
  );
}

function Spark({ color }: { color: string }) {
  const bars = [8, 14, 10, 18, 12, 20, 16, 22, 11, 17];
  return (
    <svg className="act-spark" viewBox="0 0 80 28" aria-hidden="true">
      {bars.map((height, index) => (
        <rect key={index} x={index * 8} y={28 - height} width="4" height={height} rx="1" fill={color} opacity={0.35 + (index % 4) * 0.15} />
      ))}
    </svg>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="act-select">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
