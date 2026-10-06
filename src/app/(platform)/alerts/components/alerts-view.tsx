"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import AlertsChart, { ALERT_COLORS } from "./alerts-chart";
import {
  ALERT_SEVERITIES,
  ALERT_TYPES,
  acknowledgeAlert,
  alertOptions,
  alertTitle,
  alertTypeLabel,
  closedStatus,
  coordLabel,
  createAlertTicket,
  formatAlertDate,
  formatSeen,
  listAlerts,
  listOpenSos,
  readAlert,
  resolveAlert,
  severityLabel,
  soldierLabel,
  statusLabel,
  summarizeAlerts,
  toAlertParams,
  type AlertOptions,
  type AlertQuery,
  type AlertRecord,
  type AlertSummary,
  type AlertType,
} from "@/lib/alerts";

const PAGE_OPTIONS = [8, 20, 50, 100];

function sosItems(payload: Awaited<ReturnType<typeof listOpenSos>>) {
  return Array.isArray(payload) ? payload : payload.items;
}

function AlertGlyph({ type }: { type: string }) {
  if (type === "SOS") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.2 1.4 5.6 1.4 5.6H4.8s1.4-1.4 1.4-5.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 18h4.2A11 11 0 0 1 20 8.2M4 14.5h2.8A7.6 7.6 0 0 1 16.8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function vitalTone(kind: "hr" | "hrv" | "temp", alert: AlertRecord) {
  const details = alert.details;
  if (kind === "hr") return alert.alert_type === "SOS" || alert.alert_type === "ARRHYTHMIA" || (details?.hr ?? 0) >= 100;
  if (kind === "temp") return alert.alert_type === "HEAT_STRESS" || (details?.temp ?? 0) >= 38;
  return (details?.hrv ?? 99) < 30;
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
  const router = useRouter();
  const startingType = initialType.toUpperCase().replaceAll(" ", "_");
  const [soldierId, setSoldierId] = useState(() => {
    const value = Number(initialSoldier);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  });
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [range, setRange] = useState("all");
  const [severities, setSeverities] = useState<string[]>([...ALERT_SEVERITIES]);
  const [types, setTypes] = useState<string[]>(
    ALERT_TYPES.includes(startingType as AlertType) ? [startingType] : [...ALERT_TYPES],
  );
  const [groups, setGroups] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailTab, setDetailTab] = useState<"Details" | "Related">("Details");
  const [items, setItems] = useState<AlertRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [sos, setSos] = useState<AlertRecord[]>([]);
  const [related, setRelated] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(initialId ? Number(initialId) : null);
  const [selected, setSelected] = useState<AlertRecord | null>(null);

  const knownTypes = options?.alert_types?.length ? options.alert_types : [...ALERT_TYPES];
  const knownSeverities = options?.severities?.length ? options.severities : [...ALERT_SEVERITIES];
  const knownGroups = options?.groups?.length ? options.groups : groups;

  const filters = useMemo<Omit<AlertQuery, "limit" | "offset">>(() => {
    const next: Omit<AlertQuery, "limit" | "offset"> = { timeRange: range };
    const text = debouncedQuery.trim();
    if (text) next.q = text;
    if (severities.length && severities.length < knownSeverities.length) next.severity = severities;
    if (types.length && types.length < knownTypes.length) next.alert_type = types;
    if (groups.length && knownGroups.length && groups.length < knownGroups.length) next.group_id = groups;
    if (status) next.status = status;
    if (soldierId) next.soldier_id = soldierId;
    return next;
  }, [debouncedQuery, range, severities, types, groups, status, knownSeverities.length, knownTypes.length, knownGroups.length, soldierId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchText), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const controller = new AbortController();
    alertOptions(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setOptions(next);
        setGroups((current) => (current.length ? current : next.groups));
      })
      .catch(() => {
        /* filters keep the built-in type and severity lists */
      });
    listOpenSos(controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setSos(sosItems(payload));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSos([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!severities.length || !types.length) {
      setItems([]);
      setTotal(0);
      setSummary(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      listAlerts({ ...filters, limit: pageSize, offset: (page - 1) * pageSize }, controller.signal),
      summarizeAlerts(filters, controller.signal),
    ])
      .then(([list, nextSummary]) => {
        if (controller.signal.aborted) return;
        setItems(list.items);
        setTotal(list.total);
        setSummary(nextSummary);
        setSelectedId((current) => current ?? list.items[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setSummary(null);
        setError(reason instanceof Error ? reason.message : "Couldn't load alerts");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, page, pageSize, severities.length, types.length]);

  useEffect(() => {
    if (selectedId == null) {
      setSelected(null);
      setRelated([]);
      return;
    }
    const controller = new AbortController();
    readAlert(selectedId, controller.signal)
      .then((alert) => {
        if (controller.signal.aborted) return;
        setSelected(alert);
        if (alert.soldier_id == null) {
          setRelated([]);
          return;
        }
        return listAlerts({ soldier_id: alert.soldier_id, limit: 6 }, controller.signal).then((list) => {
          if (!controller.signal.aborted) setRelated(list.items.filter((item) => item.id !== alert.id).slice(0, 5));
        });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSelected(null);
        setActionError(reason instanceof Error ? reason.message : "Couldn't load alert");
      });
    return () => controller.abort();
  }, [selectedId]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const pageWindow = Math.min(pages, 5);
  const pageStart = Math.min(Math.max(currentPage - 2, 1), Math.max(pages - pageWindow + 1, 1));
  const severityCounts = Object.fromEntries(knownSeverities.map((name) => [name, 0])) as Record<string, number>;
  const typeCounts = Object.fromEntries(knownTypes.map((name) => [name, 0])) as Record<string, number>;
  for (const row of summary?.by_severity ?? []) severityCounts[row.severity] = row.count;
  for (const row of summary?.by_type ?? []) typeCounts[row.alert_type] = row.count;
  const chartData = (summary?.timeline ?? []).map((bucket) => ({
    time: Date.parse(bucket.time),
    label: formatAlertDate(bucket.time).date,
    count: bucket.count,
  }));
  const groupChoices = knownGroups;

  async function refreshSos() {
    try {
      setSos(sosItems(await listOpenSos()));
    } catch {
      setSos([]);
    }
  }

  async function runAction(name: string, task: () => Promise<unknown>) {
    if (selectedId == null) return;
    setPendingAction(name);
    setActionError("");
    try {
      await task();
      const [alert, list] = await Promise.all([
        readAlert(selectedId),
        listAlerts({ ...filters, limit: pageSize, offset: (currentPage - 1) * pageSize }),
      ]);
      setSelected(alert);
      setItems(list.items);
      setTotal(list.total);
      setSummary(await summarizeAlerts(filters));
      await refreshSos();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Action failed");
    } finally {
      setPendingAction("");
    }
  }

  function resetFilters() {
    setSearchText("");
    setDebouncedQuery("");
    setRange("all");
    setSeverities([...knownSeverities]);
    setTypes([...knownTypes]);
    setGroups(knownGroups.length ? [...knownGroups] : []);
    setStatus("");
    setSoldierId(undefined);
    setSelectedId(null);
    setPage(1);
    router.replace("/alerts");
  }

  async function exportCsv() {
    try {
      const file = await fetch(`/api/alerts/export.csv?${toAlertParams(filters)}`, { cache: "no-store" });
      if (!file.ok) throw new Error("Couldn't export alerts");
      const blob = await file.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "alerts.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't export alerts");
    }
  }

  const clock = selected ? formatAlertDate(selected.event_time) : null;
  const details = selected?.details;

  return (
    <div className="cmd al">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className={`al-body${sos.length ? " has-sos" : ""}`}>
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
          <div className="al-head-end">
            <div className="al-stats">
              <article className="is-critical">
                <span>Critical</span>
                <strong>{severityCounts.CRITICAL ?? 0}</strong>
              </article>
              <article className="is-warning">
                <span>Warning</span>
                <strong>{severityCounts.WARNING ?? 0}</strong>
              </article>
              <article className="is-info">
                <span>Info</span>
                <strong>{severityCounts.INFO ?? 0}</strong>
              </article>
              <article>
                <span>Total</span>
                <strong>{summary?.total ?? total}</strong>
              </article>
            </div>
            <Link href="/dashboard" className="cmd-back-map">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4.5 10.2 12 4.5l7.5 5.7V19a1.5 1.5 0 0 1-1.5 1.5h-3.2v-5.2h-5.6V20.5H6A1.5 1.5 0 0 1 4.5 19v-8.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Back to Map
            </Link>
          </div>
        </header>

        {sos.length ? (
          <div className="al-sos" role="status">
            <strong>{sos.length} open SOS</strong>
            {sos.slice(0, 4).map((alert) => (
              <button key={alert.id} type="button" onClick={() => setSelectedId(alert.id)}>
                {soldierLabel(alert)} · {alert.message}
              </button>
            ))}
          </div>
        ) : null}

        <section className="al-chart" aria-label="Alerts daily intervals">
          <div className="al-chart-top">
            <div>
              <h2>Alerts — Daily Intervals</h2>
              <small>{summary?.total ?? total} alerts · {range === "all" ? "All time" : "30 days"}</small>
            </div>
            <div className="al-legend">
              {(["Critical", "Warning", "Info"] as const).map((name) => (
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
            <span>{chartData[0]?.label ?? ""}</span>
            <span>{chartData[chartData.length - 1]?.label ?? ""}</span>
          </div>
        </section>

        <div className={`al-main${selected ? " is-open" : ""}`}>
          <aside className="al-filters">
            <div className="al-filter-head">
              <strong>Filters</strong>
              <div className="al-filter-actions">
                <button type="button" className="al-mini-export" onClick={resetFilters}>
                  Refresh
                </button>
                <button type="button" className="al-mini-export" onClick={exportCsv}>
                  Export
                </button>
              </div>
            </div>

            <p className="al-label">Search</p>
            <label className="al-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={searchText}
                placeholder="Search alerts..."
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <p className="al-label">Status</p>
            <select
              className="al-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              {(options?.statuses?.length ? options.statuses : ["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "CLEARED"]).map((name) => (
                <option key={name} value={name}>{statusLabel(name)}</option>
              ))}
            </select>

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
              {knownSeverities.map((name) => (
                <li key={name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={severities.includes(name)}
                      onChange={() => {
                        setSeverities((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
                        setPage(1);
                      }}
                    />
                    <i style={{ background: ALERT_COLORS[severityLabel(name) as keyof typeof ALERT_COLORS] ?? "#94a3b8" }} />
                    {severityLabel(name)}
                  </label>
                  <span>{severityCounts[name] ?? 0}</span>
                </li>
              ))}
            </ul>

            <p className="al-label">Alert Type</p>
            <ul className="al-check">
              {knownTypes.map((name) => (
                <li key={name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={types.includes(name)}
                      onChange={() => {
                        setTypes((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
                        setPage(1);
                      }}
                    />
                    <span className="al-type-ico"><AlertGlyph type={name} /></span>
                    {alertTypeLabel(name)}
                  </label>
                  <span>{typeCounts[name] ?? 0}</span>
                </li>
              ))}
            </ul>

            <p className="al-label">Group</p>
            <ul className="al-check">
              {groupChoices.map((name) => (
                <li key={name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!groups.length || groups.includes(name)}
                      onChange={() => {
                        setGroups((current) => {
                          const base = current.length ? current : knownGroups;
                          return base.includes(name) ? base.filter((item) => item !== name) : [...base, name];
                        });
                        setPage(1);
                      }}
                    />
                    {name}
                  </label>
                </li>
              ))}
            </ul>

            <button type="button" className="al-apply" onClick={resetFilters}>
              Refresh selection
            </button>
          </aside>

          <section className="al-results">
            <div className="al-table-scroll">
              {error ? <p className="al-note">{error}</p> : null}
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
                  {items.length === 0 ? (
                    <tr>
                      <td className="al-empty" colSpan={8}>{loading ? "Loading alerts…" : "No alerts"}</td>
                    </tr>
                  ) : items.map((row) => {
                    const when = formatAlertDate(row.event_time);
                    return (
                      <tr
                        key={row.id}
                        className={row.id === selectedId ? "is-selected" : undefined}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>
                          <b>{when.date}</b>
                          <small>{when.time}</small>
                        </td>
                        <td><span className={`cmd-sev is-${severityLabel(row.severity).toLowerCase()}`}>{severityLabel(row.severity)}</span></td>
                        <td>
                          <span className="al-row-type">
                            <AlertGlyph type={row.alert_type} />
                            {alertTypeLabel(row.alert_type)}
                          </span>
                        </td>
                        <td>{soldierLabel(row)}</td>
                        <td>{row.group_id ?? "—"}</td>
                        <td>{row.message}</td>
                        <td>{row.position_source ?? "—"}</td>
                        <td>{formatSeen(row.last_seen_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <footer>
              <span>
                {total ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, total)} of {total} results
              </span>
              <div>
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹</button>
                {Array.from({ length: pageWindow }, (_, index) => {
                  const number = pageStart + index;
                  return (
                    <button key={number} type="button" className={number === currentPage ? "is-active" : undefined} onClick={() => setPage(number)}>
                      {number}
                    </button>
                  );
                })}
                <button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>›</button>
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

          {selected && clock ? (
            <aside className="al-detail">
              <div className="al-detail-head">
                <span className={`al-detail-ico is-${severityLabel(selected.severity).toLowerCase()}`}>
                  <AlertGlyph type={selected.alert_type} />
                </span>
                <div>
                  <h2>{alertTitle(selected.alert_type)}</h2>
                  <small>{selected.alert_code}</small>
                </div>
                <span className={`cmd-sev is-${severityLabel(selected.severity).toLowerCase()}`}>{severityLabel(selected.severity)}</span>
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
                    <div><dt>Event Time</dt><dd>{clock.date} {clock.time}</dd></div>
                    <div><dt>Alert Type</dt><dd>{alertTypeLabel(selected.alert_type)}</dd></div>
                    <div><dt>Soldier ID</dt><dd>{soldierLabel(selected)}</dd></div>
                    <div><dt>Group</dt><dd>{selected.group_id ?? "—"}</dd></div>
                    <div><dt>Status</dt><dd className="is-active-status">{statusLabel(selected.status)}</dd></div>
                    <div><dt>Position Source</dt><dd>{selected.position_source ?? "—"}</dd></div>
                    <div><dt>Last Seen</dt><dd>{formatSeen(selected.last_seen_at)}</dd></div>
                    <div><dt>Battery Level</dt><dd>{details?.batt != null ? `${details.batt}%` : "—"}</dd></div>
                  </dl>

                  <div className="al-location">
                    <div className="al-location-head">
                      <strong>Location</strong>
                      <small>{coordLabel(selected)}</small>
                    </div>
                    <div className="al-mini-map" aria-hidden="true">
                      <span className="al-sos-pin">{selected.alert_type === "SOS" ? "SOS" : alertTypeLabel(selected.alert_type).slice(0, 3).toUpperCase()}</span>
                    </div>
                    <Link href="/dashboard" className="al-map-link">
                      Open on main map
                    </Link>
                  </div>

                  <div className="al-vitals">
                    <div className="al-vitals-head">
                      <strong>Latest Vital</strong>
                      <small>from Chest Strap · {clock.time}</small>
                    </div>
                    <div className="al-vital-grid">
                      <article>
                        <span>Heart Rate</span>
                        <strong>{details?.hr != null ? `${details.hr} bpm` : "—"}</strong>
                        <small className={vitalTone("hr", selected) ? "is-bad" : undefined}>{vitalTone("hr", selected) ? "High" : "Normal"}</small>
                      </article>
                      <article>
                        <span>HRV</span>
                        <strong>{details?.hrv != null ? `${details.hrv} ms` : "—"}</strong>
                        <small className={vitalTone("hrv", selected) ? "is-warn" : undefined}>{vitalTone("hrv", selected) ? "Low" : "Steady"}</small>
                      </article>
                      <article>
                        <span>Body Temp</span>
                        <strong>{details?.temp != null ? `${details.temp} °C` : "—"}</strong>
                        <small className={vitalTone("temp", selected) ? "is-bad" : undefined}>{vitalTone("temp", selected) ? "High" : "Normal"}</small>
                      </article>
                    </div>
                  </div>

                  <div className="al-actions">
                    <button
                      type="button"
                      disabled={pendingAction !== "" || selected.status !== "ACTIVE"}
                      onClick={() => runAction("ack", () => acknowledgeAlert(selected.id))}
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      className="is-resolve"
                      disabled={pendingAction !== "" || closedStatus(selected.status)}
                      onClick={() => runAction("resolve", () => resolveAlert(selected.id))}
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      disabled={pendingAction !== ""}
                      onClick={() => runAction("ticket", () => createAlertTicket(selected.id))}
                    >
                      Ticket
                    </button>
                  </div>
                  {actionError ? <p className="al-note">{actionError}</p> : null}
                </>
              ) : (
                <div className="al-related">
                  <p>Related alerts for {soldierLabel(selected)}</p>
                  <ul>
                    {related.map((row) => (
                      <li key={row.id}>
                        <button type="button" onClick={() => setSelectedId(row.id)}>
                          <strong>{alertTypeLabel(row.alert_type)}</strong>
                          <small>{formatAlertDate(row.event_time).date} {formatAlertDate(row.event_time).time}</small>
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
