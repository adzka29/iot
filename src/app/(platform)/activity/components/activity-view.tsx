"use client";

import { useEffect, useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import {
  AUDIT_ACTIONS,
  AUDIT_TIME_RANGES,
  auditCategories,
  auditClass,
  auditLabel,
  formatAuditStamp,
  listAuditLogs,
  readAuditLog,
  summarizeAuditLogs,
  toAuditParams,
  type AuditCategory,
  type AuditDetail,
  type AuditListItem,
  type AuditQuery,
  type AuditSummary,
} from "@/lib/audit-logs";

const PAGE_OPTIONS = [8, 20, 50, 100];
const OUTCOMES = [
  { value: "", label: "All" },
  { value: "SUCCESS", label: "Success" },
  { value: "FAILED", label: "Failed" },
  { value: "DENIED", label: "Denied" },
];

export default function ActivityView() {
  const [actorQuery, setActorQuery] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const [debouncedActor, setDebouncedActor] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState("");
  const [outcome, setOutcome] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [range, setRange] = useState("");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [categories, setCategories] = useState<AuditCategory[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [items, setItems] = useState<AuditListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  const filters = useMemo<AuditQuery>(() => {
    const next: AuditQuery = { page, limit: pageSize };
    if (range) next.timeRange = range;
    if (debouncedSearch) next.search = debouncedSearch;
    if (debouncedActor) next.actor = debouncedActor;
    if (action) next.action = action;
    if (outcome) next.outcome = outcome;
    if (category) next.category = category;
    return next;
  }, [action, category, debouncedActor, debouncedSearch, outcome, page, pageSize, range]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedActor(actorQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [actorQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(tableQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [tableQuery]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([summarizeAuditLogs(controller.signal), auditCategories(controller.signal)])
      .then(([nextSummary, nextCategories]) => {
        if (controller.signal.aborted) return;
        setSummary(nextSummary);
        setCategories(nextCategories.categories);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCategories([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    listAuditLogs(filters, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setItems(list.items);
        setTotal(list.total);
        setSelectedId((current) => current ?? list.items[0]?.eventId ?? null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(reason instanceof Error ? reason.message : "Couldn't load the activity log");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    readAuditLog(selectedId, controller.signal)
      .then((event) => {
        if (!controller.signal.aborted) setDetail(event);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetail(null);
      });
    return () => controller.abort();
  }, [selectedId]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const visible = sort === "recent" ? items : [...items].reverse();
  const pageWindow = Math.min(pages, 7);
  const pageStart = Math.min(Math.max(safePage - Math.floor(pageWindow / 2), 1), Math.max(pages - pageWindow + 1, 1));
  const selected = visible.find((item) => item.eventId === selectedId) ?? null;
  const rangeLabel = AUDIT_TIME_RANGES.find((item) => item.value === range)?.label ?? "All time";
  const shownFrom = total ? (safePage - 1) * pageSize + 1 : 0;
  const shownTo = Math.min(safePage * pageSize, total);

  function resetFilters() {
    setActorQuery("");
    setTableQuery("");
    setDebouncedActor("");
    setDebouncedSearch("");
    setAction("");
    setOutcome("");
    setCategory("");
    setRange("");
    setRangeOpen(false);
    setSelectedId(null);
    setPage(1);
  }

  async function exportRows() {
    try {
      const params = toAuditParams({ ...filters, page: undefined, limit: undefined });
      const file = await fetch(`/api/audit-logs/export?${params}`, { cache: "no-store" });
      if (!file.ok) throw new Error("Couldn't export the activity log");
      const blob = await file.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "activity-log.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't export the activity log");
    }
  }

  const detailCategory = auditLabel(detail?.category ?? selected?.category);
  const detailAction = auditLabel(detail?.action ?? selected?.action);
  const detailOutcome = auditLabel(detail?.outcome ?? selected?.outcome);
  const detailTargetType = auditLabel(detail?.target.type ?? selected?.target.type);
  const stamp = selected ? formatAuditStamp(detail?.timestamp ?? selected.timestamp) : null;

  return (
    <div className="cmd act">
      <TopHeader />
      <main className="act-body">
        <header className="act-head">
          <div className="cmd-page-head">
            <span className="cmd-page-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M8 6.5h11M8 12h11M8 17.5h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="4.5" cy="6.5" r="1" fill="currentColor" />
                <circle cx="4.5" cy="12" r="1" fill="currentColor" />
                <circle cx="4.5" cy="17.5" r="1" fill="currentColor" />
              </svg>
            </span>
            <div>
              <h1 className="cmd-page-title is-split">
                <span>Activity</span>
                <span className="cmd-page-title-accent">Log</span>
              </h1>
              <p>Monitor and review all user and system activities across the SYNAPSE-T platform.</p>
            </div>
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
                  {AUDIT_TIME_RANGES.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="option"
                      className={range === item.value ? "is-active" : undefined}
                      onClick={() => {
                        setRange(item.value);
                        setRangeOpen(false);
                        setPage(1);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
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
          <Stat icon="total" label="Total Activities" value={summary?.total_activities ?? 0} color="#60a5fa" />
          <Stat icon="user" label="User Actions" value={summary?.user_actions ?? 0} color="#4ade80" />
          <Stat icon="system" label="System Actions" value={summary?.system_actions ?? 0} color="#a78bfa" />
          <Stat icon="failed" label="Failed Actions" value={summary?.failed_actions ?? 0} color="#f87171" />
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
            <FilterSelect
              label="ACTION"
              value={action}
              options={[{ value: "", label: "All Actions" }, ...AUDIT_ACTIONS.map((code) => ({ value: code, label: auditLabel(code) }))]}
              onChange={(value) => { setAction(value); setPage(1); }}
            />
            <FilterSelect
              label="OUTCOME"
              value={outcome}
              options={OUTCOMES}
              onChange={(value) => { setOutcome(value); setPage(1); }}
            />
            <p>CATEGORY</p>
            <ul>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={category === ""}
                    onChange={() => {
                      setCategory("");
                      setPage(1);
                    }}
                  />
                  All
                </label>
              </li>
              {categories.map((item) => (
                <li key={item.code}>
                  <label>
                    <input
                      type="checkbox"
                      checked={category === item.code}
                      onChange={() => {
                        setCategory((current) => (current === item.code ? "" : item.code));
                        setPage(1);
                      }}
                    />
                    {item.name}
                  </label>
                  <span>{item.count}</span>
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
              {error ? <p className="act-note">{error}</p> : null}
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
                  {visible.length === 0 ? (
                    <tr>
                      <td className="act-empty" colSpan={8}>{loading ? "Loading activity…" : "No activity"}</td>
                    </tr>
                  ) : visible.map((item) => {
                    const when = formatAuditStamp(item.timestamp);
                    return (
                      <tr key={item.eventId} className={item.eventId === selectedId ? "is-selected" : undefined} onClick={() => setSelectedId(item.eventId)}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked.includes(item.eventId)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => setChecked((current) => (current.includes(item.eventId) ? current.filter((id) => id !== item.eventId) : [...current, item.eventId]))}
                            aria-label={`Select ${item.event}`}
                          />
                        </td>
                        <td>
                          <b>{when.date}</b>
                          <small>{when.time}</small>
                        </td>
                        <td>
                          <b>{item.event}</b>
                          <small>{item.description}</small>
                        </td>
                        <td><span className={`act-cat is-${auditClass(item.category)}`}>{item.category}</span></td>
                        <td><span className="act-actor"><i>{(item.actor.name ?? "?").slice(0, 1).toUpperCase()}</i>{item.actor.name ?? "—"}</span></td>
                        <td>
                          <span className="act-target">
                            <b>{item.target.name ?? item.target.id ?? "—"}</b>
                            <small>{auditLabel(item.target.type)}</small>
                          </span>
                        </td>
                        <td><span className={`act-pill is-${auditClass(item.action)}`}>{item.action}</span></td>
                        <td><span className={`act-pill is-${auditClass(item.outcome)}`}>{item.outcome}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <footer>
              <span>Showing {shownFrom}-{shownTo} of {total} activities</span>
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

          {selected && stamp ? (
            <aside className="act-detail">
              <div className="act-detail-head">
                <strong>Activity Detail</strong>
                <button type="button" aria-label="Close detail" onClick={() => setSelectedId(null)}>×</button>
              </div>
              <h2>{selected.event}</h2>
              <p>{detail?.description ?? selected.description}</p>
              <dl>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{stamp.full}</dd>
                </div>
                <div>
                  <dt>Actor</dt>
                  <dd><span className="act-actor"><i>{(selected.actor.name ?? "?").slice(0, 1).toUpperCase()}</i>{selected.actor.name ?? "—"}</span></dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd><span className={`act-cat is-${auditClass(detailCategory)}`}>{detailCategory}</span></dd>
                </div>
                <div>
                  <dt>Action</dt>
                  <dd>{detailAction}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{selected.target.name ?? selected.target.id ?? "—"} <small>{detailTargetType}</small></dd>
                </div>
                <div>
                  <dt>Outcome</dt>
                  <dd><span className={`act-pill is-${auditClass(detailOutcome)}`}>{detailOutcome}</span></dd>
                </div>
              </dl>
              <h3>DESCRIPTION</h3>
              <p>{detail?.description ?? selected.description}</p>
              <h3>ADDITIONAL INFORMATION</h3>
              <dl>
                <div>
                  <dt>IP address</dt>
                  <dd>{detail?.ipAddress ?? "—"}</dd>
                </div>
                <div>
                  <dt>Actor type</dt>
                  <dd>{auditLabel(detail?.actorType)}</dd>
                </div>
                <div>
                  <dt>User agent</dt>
                  <dd>{detail?.userAgent ?? "—"}</dd>
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

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="act-select">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.label} value={option.value}>{option.label}</option>
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
