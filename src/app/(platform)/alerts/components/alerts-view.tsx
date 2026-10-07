"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import TopHeader from "@/components/TopHeader";
import AlertsChart, { ALERT_COLORS } from "./alerts-chart";

const ExplorerMiniMap = dynamic(() => import("../../explorer/components/explorer-mini-map"), { ssr: false });
import {
  ALERT_SEVERITIES,
  ALERT_TYPES,
  acknowledgeAlert,
  alertOptions,
  closedStatus,
  coordLabel,
  createAlertTicket,
  formatAlertDate,
  formatSeen,
  listAlerts,
  listOpenSos,
  readAlert,
  resolveAlert,
  summarizeAlerts,
  toAlertParams,
  type AlertOptions,
  type AlertQuery,
  type AlertRecord,
  type AlertSummary,
  type AlertType,
} from "@/lib/alerts";

function soldierIdText(alert: AlertRecord) {
  if (alert.soldier_id != null) return String(alert.soldier_id);
  return alert.entity_id ?? "—";
}

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

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
  const [searchText, setSearchText] = useState("");
  const [range, setRange] = useState("all");
  const [severities, setSeverities] = useState<string[]>([...ALERT_SEVERITIES]);
  const [types, setTypes] = useState<string[]>(
    ALERT_TYPES.includes(startingType as AlertType) ? [startingType] : [...ALERT_TYPES],
  );
  const [groups, setGroups] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({
    q: "",
    range: "all",
    severities: [...ALERT_SEVERITIES] as string[],
    types: (ALERT_TYPES.includes(startingType as AlertType) ? [startingType] : [...ALERT_TYPES]) as string[],
    groups: [] as string[],
    status: "",
    soldierId: (() => {
      const value = Number(initialSoldier);
      return Number.isFinite(value) && value > 0 ? value : undefined;
    })() as number | undefined,
  });
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
  /** Deep-link from dashboard: show only this alert until filters reset. */
  const [focusId, setFocusId] = useState<number | null>(() => {
    const value = Number(initialId);
    return Number.isFinite(value) && value > 0 ? value : null;
  });
  const [tick, setTick] = useState(0);
  const [fresh, setFresh] = useState<Record<number, { until: number; order: number }>>({});
  const [now, setNow] = useState(() => Date.now());
  const itemsRef = useRef<AlertRecord[]>([]);
  const alertsBootstrapped = useRef(false);

  function exitFocus() {
    if (focusId != null) {
      setFocusId(null);
      router.replace("/alerts");
    }
  }

  const knownTypes = options?.alert_types?.length ? options.alert_types : [...ALERT_TYPES];
  const knownSeverities = options?.severities?.length ? options.severities : [...ALERT_SEVERITIES];
  const knownGroups = options?.groups?.length ? options.groups : groups;

  const filters = useMemo<Omit<AlertQuery, "limit" | "offset">>(() => {
    const next: Omit<AlertQuery, "limit" | "offset"> = { timeRange: applied.range };
    if (applied.q) next.q = applied.q;
    if (applied.severities.length && applied.severities.length < knownSeverities.length) {
      next.severity = applied.severities;
    }
    if (applied.types.length && applied.types.length < knownTypes.length) next.alert_type = applied.types;
    if (applied.groups.length && knownGroups.length && applied.groups.length < knownGroups.length) {
      next.group_id = applied.groups;
    }
    if (applied.status) next.status = applied.status;
    if (applied.soldierId) next.soldier_id = applied.soldierId;
    return next;
  }, [applied, knownSeverities.length, knownTypes.length, knownGroups.length]);

  function applyFilters() {
    exitFocus();
    setPage(1);
    setApplied({
      q: searchText.trim(),
      range,
      severities: [...severities],
      types: [...types],
      groups: [...groups],
      status,
      soldierId,
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    alertOptions(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setOptions(next);
        setGroups((current) => (current.length ? current : next.groups));
        setApplied((current) =>
          current.groups.length ? current : { ...current, groups: [...next.groups] },
        );
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
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    alertsBootstrapped.current = false;
    setFresh({});
  }, [filters, page, pageSize]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!Object.keys(fresh).length) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setFresh((current) => {
        const next: Record<number, { until: number; order: number }> = {};
        for (const [key, meta] of Object.entries(current)) {
          if (meta.until > t) next[Number(key)] = meta;
        }
        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 400);
    return () => window.clearInterval(id);
  }, [fresh]);

  useEffect(() => {
    if (focusId != null) return;
    if (!applied.severities.length || !applied.types.length) {
      setItems([]);
      setTotal(0);
      setSummary(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const silent = alertsBootstrapped.current;
    if (!silent) setLoading(true);
    setError("");
    Promise.all([
      listAlerts({ ...filters, limit: pageSize, offset: (page - 1) * pageSize }, controller.signal),
      summarizeAlerts(filters, controller.signal),
    ])
      .then(([list, nextSummary]) => {
        if (controller.signal.aborted) return;
        const previous = itemsRef.current;
        const prevIds = new Set(previous.map((row) => row.id));
        const newcomers = alertsBootstrapped.current
          ? list.items.filter((row) => !prevIds.has(row.id))
          : [];
        if (newcomers.length) {
          const stamped = Date.now();
          setNow(stamped);
          setFresh((current) => {
            const next = { ...current };
            newcomers.forEach((row, index) => {
              next[row.id] = { until: stamped + 10_000, order: index };
            });
            return next;
          });
        }
        alertsBootstrapped.current = true;
        itemsRef.current = list.items;
        setItems(list.items);
        setTotal(list.total);
        setSummary(nextSummary);
        setSelectedId((current) => current ?? list.items[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (!silent) {
          setItems([]);
          setTotal(0);
          setSummary(null);
        }
        setError(reason instanceof Error ? reason.message : "Couldn't load alerts");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, focusId, page, pageSize, applied.severities.length, applied.types.length, tick]);

  useEffect(() => {
    if (focusId == null) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setActionError("");
    readAlert(focusId, controller.signal)
      .then(async (alert) => {
        if (controller.signal.aborted) return;
        if (!alert) {
          setItems([]);
          setTotal(0);
          setSummary(null);
          setSelectedId(null);
          setSelected(null);
          setRelated([]);
          setError("Alert not available");
          return;
        }
        itemsRef.current = [alert];
        setItems([alert]);
        setTotal(1);
        setSummary(null);
        setSelectedId(alert.id);
        setSelected(alert);
        setDetailTab("Details");
        if (alert.soldier_id == null) {
          setRelated([]);
          return;
        }
        const list = await listAlerts({ soldier_id: alert.soldier_id, limit: 6 }, controller.signal);
        if (!controller.signal.aborted) {
          setRelated(list.items.filter((item) => item.id !== alert.id).slice(0, 5));
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setSummary(null);
        setSelectedId(null);
        setSelected(null);
        setRelated([]);
        setError(reason instanceof Error ? reason.message : "Couldn't load alert");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [focusId]);

  useEffect(() => {
    if (focusId != null) return;
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
  }, [focusId, selectedId]);

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
    const nextGroups = knownGroups.length ? [...knownGroups] : [];
    setFocusId(null);
    setSearchText("");
    setRange("all");
    setSeverities([...knownSeverities]);
    setTypes([...knownTypes]);
    setGroups(nextGroups);
    setStatus("");
    setSoldierId(undefined);
    setApplied({
      q: "",
      range: "all",
      severities: [...knownSeverities],
      types: [...knownTypes],
      groups: nextGroups,
      status: "",
      soldierId: undefined,
    });
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
      <TopHeader />
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
                <span>CRITICAL</span>
                <strong>{severityCounts.CRITICAL ?? 0}</strong>
              </article>
              <article className="is-warning">
                <span>WARNING</span>
                <strong>{severityCounts.WARNING ?? 0}</strong>
              </article>
              <article className="is-info">
                <span>INFO</span>
                <strong>{severityCounts.INFO ?? 0}</strong>
              </article>
              <article>
                <span>total</span>
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
                {soldierIdText(alert)} · {alert.message}
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
              {(["CRITICAL", "WARNING", "INFO"] as const).map((name) => (
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
            <div className="al-filter-scroll">
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
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>

              <p className="al-label">Status</p>
              <select
                className="al-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All</option>
                {(options?.statuses?.length ? options.statuses : ["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "CLEARED"]).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <p className="al-label">Time Range</p>
              <div className="al-range-toggle">
                <button type="button" className={range === "all" ? "is-active" : undefined} onClick={() => setRange("all")}>
                  All time
                </button>
                <button type="button" className={range === "30d" ? "is-active" : undefined} onClick={() => setRange("30d")}>
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
                          setSeverities((current) =>
                            current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
                          );
                        }}
                      />
                      <i style={{ background: ALERT_COLORS[name as keyof typeof ALERT_COLORS] ?? "#94a3b8" }} />
                      {name}
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
                          setTypes((current) =>
                            current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
                          );
                        }}
                      />
                      <span className="al-type-ico"><AlertGlyph type={name} /></span>
                      {name}
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
                        }}
                      />
                      {name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="al-filter-foot">
              <button type="button" className="al-apply" onClick={applyFilters}>
                Apply
              </button>
            </div>
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
                    const meta = fresh[row.id];
                    const isFresh = Boolean(meta && meta.until > now);
                    return (
                      <tr
                        key={row.id}
                        className={[
                          row.id === selectedId ? "is-selected" : "",
                          isFresh ? "is-fresh is-enter" : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined}
                        style={
                          isFresh && meta
                            ? ({ ["--alert-delay"]: `${meta.order * 90}ms` } as CSSProperties)
                            : undefined
                        }
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>
                          <b>{when.date}</b>
                          <small>{when.time}</small>
                        </td>
                        <td>
                          <span className={`cmd-sev is-${String(row.severity).toLowerCase()}`}>{row.severity}</span>
                        </td>
                        <td>
                          <span className="al-row-type">
                            <AlertGlyph type={row.alert_type} />
                            {row.alert_type}
                          </span>
                        </td>
                        <td>
                          <span className="al-soldier-cell">
                            <b>{soldierIdText(row)}</b>
                            {isFresh ? <span className="al-row-new">NEW</span> : null}
                          </span>
                        </td>
                        <td>{dash(row.group_id)}</td>
                        <td>{dash(row.message)}</td>
                        <td>{dash(row.position_source)}</td>
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
                <span className={`al-detail-ico is-${String(selected.severity).toLowerCase()}`}>
                  <AlertGlyph type={selected.alert_type} />
                </span>
                <div>
                  <h2>{selected.alert_type}</h2>
                  <small>{selected.alert_code}</small>
                </div>
                <span className={`cmd-sev is-${String(selected.severity).toLowerCase()}`}>{selected.severity}</span>
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
                    <div><dt>event_time</dt><dd>{clock.date} {clock.time}</dd></div>
                    <div><dt>alert_type</dt><dd>{selected.alert_type}</dd></div>
                    <div><dt>soldier_id</dt><dd>{dash(selected.soldier_id)}</dd></div>
                    <div><dt>group_id</dt><dd>{dash(selected.group_id)}</dd></div>
                    <div><dt>status</dt><dd className="is-active-status">{selected.status}</dd></div>
                    <div><dt>position_source</dt><dd>{dash(selected.position_source)}</dd></div>
                    <div><dt>last_seen_at</dt><dd>{formatSeen(selected.last_seen_at)}</dd></div>
                    <div><dt>message</dt><dd>{dash(selected.message)}</dd></div>
                  </dl>

                  <div className="al-location">
                    <div className="al-location-head">
                      <strong>latitude / longitude</strong>
                      <small>{coordLabel(selected)}</small>
                    </div>
                    <div className="al-mini-map">
                      {selected.latitude != null && selected.longitude != null ? (
                        <ExplorerMiniMap lat={selected.latitude} lng={selected.longitude} />
                      ) : (
                        <div className="al-mini-map-empty">No fix</div>
                      )}
                    </div>
                    <Link
                      href={
                        selected.soldier_id != null
                          ? `/dashboard?soldier=${encodeURIComponent(String(selected.soldier_id))}`
                          : "/dashboard"
                      }
                      className="al-map-link"
                    >
                      Open on main map
                    </Link>
                  </div>

                  <div className="al-vitals">
                    <div className="al-vitals-head">
                      <strong>details</strong>
                      <small>
                        batt {details?.batt != null ? `${details.batt}%` : "—"} · gateway_id {dash(selected.gateway_id)} ·
                        source_record_id {dash(selected.source_record_id)}
                      </small>
                    </div>
                    <div className="al-vital-grid">
                      <article>
                        <span>hr</span>
                        <strong>{details?.hr != null ? String(details.hr) : "—"}</strong>
                        <small className={vitalTone("hr", selected) ? "is-bad" : undefined}>
                          {details?.hr != null ? "bpm" : "—"}
                        </small>
                      </article>
                      <article>
                        <span>hrv</span>
                        <strong>{details?.hrv != null ? String(details.hrv) : "—"}</strong>
                        <small className={vitalTone("hrv", selected) ? "is-warn" : undefined}>
                          {details?.hrv != null ? "ms" : "—"}
                        </small>
                      </article>
                      <article>
                        <span>temp</span>
                        <strong>{details?.temp != null ? String(details.temp) : "—"}</strong>
                        <small className={vitalTone("temp", selected) ? "is-bad" : undefined}>
                          {details?.temp != null ? "°C" : "—"}
                        </small>
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
                  <p>Related alerts for soldier_id {dash(selected.soldier_id)}</p>
                  <ul>
                    {related.map((row) => (
                      <li key={row.id}>
                        <button type="button" onClick={() => setSelectedId(row.id)}>
                          <strong>{row.alert_type}</strong>
                          <small>
                            {formatAlertDate(row.event_time).date} {formatAlertDate(row.event_time).time} · {row.status}
                          </small>
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
