"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import ExplorerChart, { COLORS } from "./explorer-chart";
import {
  categoryCounts,
  categoryLabel,
  communicationBody,
  downloadExplorerCsv,
  entityLabel,
  entityTypeLabel,
  explorerOptions,
  formatEventTime,
  listExplorer,
  readExplorer,
  recordSummary,
  stripHidden,
  summarizeExplorer,
  timelineChart,
  titleize,
  type ExplorerOptions,
  type ExplorerQuery,
  type ExplorerRecord,
  type ExplorerSummary,
} from "@/lib/explorer";

const LEVELS = ["Uplink", "Mesh", "Telemetry", "Beacon", "System", "Special"] as const;
const PAGE_OPTIONS = [8, 25, 50, 100];
const EMPTY_OPTIONS: ExplorerOptions = {
  categories: [],
  data_types: [],
  entity_types: [],
  groups: [],
  gateways: [],
  position_sources: [],
  transports: [],
  freshness: [],
  severity: [],
  record_origins: [],
  raw_formats: [],
  time_ranges: ["all", "30d"],
};

function jsonTone(text: string) {
  return text.split(/("(?:\\.|[^"\\])*")/g).map((part, index) => (
    <span key={`${part}-${index}`} className={index % 2 ? "is-str" : undefined}>
      {part}
    </span>
  ));
}

function LevelMark({ category }: { category: string }) {
  const label = categoryLabel(category);
  return (
    <span className={`ex-level is-${label.toLowerCase()}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 18c3.2-3 5.2-7.5 5.2-12M9.5 18c2.2-2.2 3.4-5.2 3.4-8.8M14 18c1.4-1.4 2.1-3.3 2.1-5.6M18.2 18c.7-.7 1.1-1.7 1.1-2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

function rangeLabel(value: string) {
  if (value === "all") return "All time";
  if (value === "30d") return "30 days";
  return value;
}

export default function ExplorerView({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState("");
  const [recordQuery, setRecordQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [entityType, setEntityType] = useState("");
  const [group, setGroup] = useState("");
  const [level, setLevel] = useState("");
  const [recordType, setRecordType] = useState("");
  const [source, setSource] = useState("");
  const [gateway, setGateway] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [range, setRange] = useState("all");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [options, setOptions] = useState<ExplorerOptions>(EMPTY_OPTIONS);
  const [items, setItems] = useState<ExplorerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ExplorerRecord | null>(null);
  const [detailError, setDetailError] = useState("");

  const filters = useMemo<Omit<ExplorerQuery, "limit" | "offset">>(
    () => ({
      q: debouncedQuery.trim() || undefined,
      category: level || undefined,
      data_type: recordType || undefined,
      entity_type: entityType || undefined,
      group_id: group || undefined,
      gateway_id: gateway || undefined,
      transport: source || undefined,
      timeRange: range,
    }),
    [debouncedQuery, entityType, group, level, recordType, gateway, source, range],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(recordQuery), 300);
    return () => window.clearTimeout(timer);
  }, [recordQuery]);

  useEffect(() => {
    const controller = new AbortController();
    explorerOptions(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setOptions({ ...EMPTY_OPTIONS, ...next, time_ranges: next.time_ranges?.length ? next.time_ranges : ["all", "30d"] });
      })
      .catch(() => {
        /* filters stay on the built-in time ranges until the service answers */
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const started = performance.now();
    setLoading(true);
    setError("");
    Promise.all([
      listExplorer({ ...filters, limit: pageSize, offset: (page - 1) * pageSize }, controller.signal),
      summarizeExplorer(filters, controller.signal),
    ])
      .then(([list, nextSummary]) => {
        if (controller.signal.aborted) return;
        setItems(list.items.map((item) => stripHidden(item)));
        setTotal(list.total);
        setSummary(nextSummary);
        setElapsed(Math.round(performance.now() - started));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setSummary(null);
        setError(reason instanceof Error ? reason.message : "Couldn't load records");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (selectedId == null) {
      setSelected(null);
      setDetailError("");
      return;
    }
    const controller = new AbortController();
    setDetailError("");
    readExplorer(selectedId, controller.signal)
      .then((record) => {
        if (controller.signal.aborted) return;
        setSelected(record);
        if (!record) setDetailError("Record not available");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSelected(null);
        setDetailError(reason instanceof Error ? reason.message : "Couldn't load record");
      });
    return () => controller.abort();
  }, [selectedId]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pages);

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const pageWindow = Math.min(pages, 7);
  const pageStart = Math.min(Math.max(currentPage - Math.floor(pageWindow / 2), 1), Math.max(pages - pageWindow + 1, 1));
  const counts = categoryCounts(summary);
  const chartData = timelineChart(summary?.timeline ?? []);
  const ranges = options.time_ranges.length ? options.time_ranges : ["all", "30d"];
  const axisStart = chartData[0]?.label ?? "";
  const axisEnd = chartData[chartData.length - 1]?.label ?? "";

  function clearFilters() {
    setRecordQuery("");
    setDebouncedQuery("");
    setEntityType("");
    setGroup("");
    setLevel("");
    setRecordType("");
    setSource("");
    setGateway("");
    setPage(1);
  }

  async function exportCsv() {
    try {
      await downloadExplorerCsv(filters);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't export records");
    }
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
                {rangeLabel(range)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {rangeOpen ? (
                <div className="ex-range-menu" role="listbox">
                  {ranges.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="option"
                      className={range === value ? "is-active" : undefined}
                      onClick={() => {
                        setRange(value);
                        setRangeOpen(false);
                        setPage(1);
                      }}
                    >
                      {rangeLabel(value)}
                    </button>
                  ))}
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
              <small>{total} records · {rangeLabel(range)}</small>
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
            <span>{axisStart}</span>
            <span>{axisEnd}</span>
          </div>
        </section>

        <div className={`ex-main${selected || detailError ? " is-open" : ""}`}>
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
                <option value="">All</option>
                {options.entity_types.map((value) => (
                  <option key={value} value={value}>{entityTypeLabel(value)}</option>
                ))}
              </select>
            </label>
            <label>
              Group
              <select value={group} onChange={(event) => { setGroup(event.target.value); setPage(1); }}>
                <option value="">All Groups</option>
                {options.groups.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Level
              <select value={level} onChange={(event) => { setLevel(event.target.value); setPage(1); }}>
                <option value="">All Levels</option>
                {options.categories.map((value) => (
                  <option key={value} value={value}>{categoryLabel(value)}</option>
                ))}
              </select>
            </label>
            <label>
              Record
              <select value={recordType} onChange={(event) => { setRecordType(event.target.value); setPage(1); }}>
                <option value="">All Records</option>
                {options.data_types.map((value) => (
                  <option key={value} value={value}>{titleize(value)}</option>
                ))}
              </select>
            </label>
            <label>
              Source
              <select value={source} onChange={(event) => { setSource(event.target.value); setPage(1); }}>
                <option value="">All Sources</option>
                {options.transports.map((value) => (
                  <option key={value} value={value}>{titleize(value)}</option>
                ))}
              </select>
            </label>
            <label>
              Gateway
              <select value={gateway} onChange={(event) => { setGateway(event.target.value); setPage(1); }}>
                <option value="">All Gateways</option>
                {options.gateways.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <button type="button" className="ex-clear" onClick={clearFilters}>
              Clear
            </button>
          </aside>

          <section className="ex-results">
            <h2>Results ({total} records)</h2>
            {error ? <p className="ex-status">{error}</p> : null}
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
                  {items.length === 0 ? (
                    <tr>
                      <td className="ex-empty" colSpan={7}>{loading ? "Loading records…" : "No records"}</td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr
                        key={row.id}
                        className={selectedId === row.id ? "is-selected" : undefined}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>{formatEventTime(row.event_time)}</td>
                        <td>{formatEventTime(row.received_at)}</td>
                        <td>{entityLabel(row)}</td>
                        <td>
                          <LevelMark category={row.category} />
                        </td>
                        <td>{titleize(row.data_type)}</td>
                        <td>{row.gateway_id ?? "—"}</td>
                        <td>{recordSummary(row)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="ex-pager">
              <small>
                {total} records{elapsed ? ` · ${elapsed} ms` : ""}
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

          {selected || detailError ? (
            <aside className="ex-detail">
              <header>
                <h2>Record</h2>
                <button type="button" aria-label="Close record" onClick={() => setSelectedId(null)}>
                  ×
                </button>
              </header>
              {detailError ? <p>{detailError}</p> : null}
              {selected ? (
                <>
                  <h3>Raw payload</h3>
                  <pre className="ex-json">
                    {jsonTone(
                      JSON.stringify(
                        {
                          raw_hex: selected.raw_hex,
                          raw_format: selected.raw_format,
                          raw_bytes_length: selected.raw_bytes_length,
                        },
                        null,
                        2,
                      ),
                    )}
                  </pre>
                  <h3>Decoded</h3>
                  <pre className="ex-json">{jsonTone(JSON.stringify(selected.data ?? {}, null, 2))}</pre>
                  <h3>Communication</h3>
                  <pre className="ex-json">{jsonTone(JSON.stringify(communicationBody(selected), null, 2))}</pre>
                </>
              ) : null}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}
