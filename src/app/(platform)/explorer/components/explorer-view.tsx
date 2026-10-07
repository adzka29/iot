"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import ExplorerChart from "./explorer-chart";
import {
  buildExplorerQuery,
  decodeTelemetry,
  downloadExplorerCsv,
  EXPLORER_TIME_PRESETS,
  formatBytes,
  formatEventTime,
  groupLabel,
  listExplorer,
  packetFields,
  rangeLabel,
  readExplorer,
  soldierIdLabel,
  summarizeExplorer,
  timelineChart,
  type ExplorerRecord,
  type ExplorerSummary,
} from "@/lib/explorer";

const ExplorerMiniMap = dynamic(() => import("./explorer-mini-map"), { ssr: false });

const PAGE_OPTIONS = [10, 25, 50, 100];
/** Display merge of BE hourly summary buckets */
const INTERVAL_OPTIONS = [
  { value: 60 * 60 * 1000, label: "1 hour" },
  { value: 6 * 60 * 60 * 1000, label: "6 hour" },
  { value: 24 * 60 * 60 * 1000, label: "1 day" },
];
const TIME_PRESETS = [...EXPLORER_TIME_PRESETS];

type DetailTab = "decoded" | "raw" | "packet";

function jsonTone(text: string) {
  return text.split(/("(?:\\.|[^"\\])*")/g).map((part, index) => (
    <span key={`${part}-${index}`} className={index % 2 ? "is-str" : undefined}>
      {part}
    </span>
  ));
}

function pageItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

function FlagChip({ label, active, danger }: { label: string; active?: boolean; danger?: boolean }) {
  return (
    <span className={`ex-flag${active ? (danger ? " is-danger" : " is-on") : ""}`}>
      {label}
    </span>
  );
}

function dash(value: unknown) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default function ExplorerView({ initialQuery = "" }: { initialQuery?: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [range, setRange] = useState<string>("30d");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [intervalMs, setIntervalMs] = useState(60 * 60 * 1000);
  const [items, setItems] = useState<ExplorerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<ExplorerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ExplorerRecord | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailTab, setDetailTab] = useState<DetailTab>("decoded");
  const [checked, setChecked] = useState<number[]>([]);

  const filters = useMemo(
    () => buildExplorerQuery({ search: initialQuery, timePreset: range }),
    [initialQuery, range],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const listQuery = buildExplorerQuery({
      search: initialQuery,
      timePreset: range,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    Promise.all([
      listExplorer(listQuery, controller.signal),
      summarizeExplorer(filters, controller.signal),
    ])
      .then(([list, nextSummary]) => {
        if (controller.signal.aborted) return;
        setItems(list.items);
        setTotal(list.total);
        setSummary(nextSummary);
        setSelectedId((current) => {
          if (current != null && list.items.some((row) => row.id === current)) return current;
          return list.items[0]?.id ?? null;
        });
        setChecked((current) => current.filter((id) => list.items.some((row) => row.id === id)));
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
  }, [filters, initialQuery, page, pageSize, range]);

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

  const chartData = timelineChart(summary?.timeline ?? [], intervalMs);
  const decoded = selected ? decodeTelemetry(selected) : null;
  const allChecked = items.length > 0 && items.every((row) => checked.includes(row.id));

  async function exportCsv() {
    try {
      await downloadExplorerCsv(filters);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't export records");
    }
  }

  function toggleAll() {
    setChecked(allChecked ? [] : items.map((row) => row.id));
  }

  function toggleOne(id: number) {
    setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="cmd ex">
      <TopHeader />
      <main className="ex-body">
        <header className="ex-head is-compact">
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
              <p>Inspect personnel telemetry records</p>
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
                  {TIME_PRESETS.map((value) => (
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
            <button type="button" className="ex-export" onClick={() => void exportCsv()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4v10.5M8.2 10.8 12 14.6l3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Export
            </button>
          </div>
        </header>

        <section className="ex-chart" aria-label="Telemetry records over time">
          <div className="ex-chart-top">
            <div>
              <h2>Telemetry Records Over Time</h2>
              <small>{summary?.total ?? total} records · category=TELEMETRY</small>
            </div>
            <label className="ex-interval">
              <select
                value={intervalMs}
                aria-label="Chart interval"
                onChange={(event) => setIntervalMs(Number(event.target.value))}
              >
                {INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ex-chart-plot">
            <ExplorerChart data={chartData} />
          </div>
        </section>

        <div className={`ex-main${selectedId != null ? " is-open" : ""}`}>
          <section className="ex-results">
            <h2>Results ({total} records)</h2>
            {error ? <p className="ex-status">{error}</p> : null}
            <div className="ex-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="ex-check">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th>
                      Time
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </th>
                    <th>Soldier ID</th>
                    <th>Group</th>
                    <th>Record</th>
                    <th>Size</th>
                    <th className="ex-actions-col" />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td className="ex-empty" colSpan={7}>
                        {loading ? "Loading records…" : "No records"}
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr
                        key={row.id}
                        className={selectedId === row.id ? "is-selected" : undefined}
                        onClick={() => {
                          setSelectedId(row.id);
                          setDetailTab("decoded");
                        }}
                      >
                        <td className="ex-check" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked.includes(row.id)}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`Select ${soldierIdLabel(row)}`}
                          />
                        </td>
                        <td>{formatEventTime(row.event_time)}</td>
                        <td>
                          <span className="ex-soldier-id">{soldierIdLabel(row)}</span>
                        </td>
                        <td>{groupLabel(row)}</td>
                        <td>{row.data_type}</td>
                        <td>{formatBytes(row.raw_bytes_length)}</td>
                        <td className="ex-actions-col">
                          <button type="button" className="ex-row-menu" aria-label="Row actions" onClick={(event) => event.stopPropagation()}>
                            ⋮
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="ex-pager">
              <small>
                {total} records · Page {currentPage} of {pages}
              </small>
              <div className="ex-pager-pages">
                <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  ‹
                </button>
                {pageItems(currentPage, pages).map((item, index) =>
                  item === "…" ? (
                    <span key={`ellipsis-${index}`}>…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={currentPage === item ? "is-active" : undefined}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button type="button" aria-label="Next page" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>
                  ›
                </button>
              </div>
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
          </section>

          {selectedId != null ? (
            <aside className="ex-detail">
              <header className="ex-detail-head">
                <div className="ex-detail-who">
                  <span className="ex-detail-avatar" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M5.5 19c1.6-3.2 4-4.8 6.5-4.8S16.9 15.8 18.5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <strong>{selected ? soldierIdLabel(selected) : "—"}</strong>
                    <small>{selected ? groupLabel(selected) : "Loading…"}</small>
                  </div>
                </div>
                <button type="button" aria-label="Close record" onClick={() => setSelectedId(null)}>
                  ×
                </button>
              </header>

              <div className="ex-detail-tabs" role="tablist">
                {(
                  [
                    ["decoded", "Decoded Data"],
                    ["raw", "Raw Data"],
                    ["packet", "Packet Info"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={detailTab === id}
                    className={detailTab === id ? "is-active" : undefined}
                    onClick={() => setDetailTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {detailError ? <p className="ex-status">{detailError}</p> : null}

              {selected && detailTab === "decoded" && decoded ? (
                <div className="ex-detail-body">
                  <section className="ex-card">
                    <h3>Basic Information</h3>
                    <dl>
                      <div><dt>soldier_id</dt><dd>{decoded.soldier_id}</dd></div>
                      <div><dt>group_id</dt><dd>{groupLabel(selected)}</dd></div>
                      <div><dt>seq</dt><dd>{decoded.seq}</dd></div>
                      <div><dt>event_time</dt><dd>{formatEventTime(selected.event_time)}</dd></div>
                      <div><dt>timestamp</dt><dd>{decoded.timestamp}</dd></div>
                      <div><dt>raw_bytes_length</dt><dd>{formatBytes(selected.raw_bytes_length)}</dd></div>
                      {decoded.vital ? <div><dt>vital</dt><dd>{decoded.vital}</dd></div> : null}
                    </dl>
                  </section>

                  <section className="ex-card">
                    <h3>Position</h3>
                    <div className="ex-position">
                      <dl>
                        <div><dt>lat</dt><dd>{decoded.lat}</dd></div>
                        <div><dt>lon</dt><dd>{decoded.lon}</dd></div>
                        <div><dt>position_source</dt><dd>{decoded.flags.position_source || selected.position_source || "—"}</dd></div>
                      </dl>
                      {Number.isFinite(decoded.lat) && Number.isFinite(decoded.lon) ? (
                        <ExplorerMiniMap lat={decoded.lat} lng={decoded.lon} />
                      ) : (
                        <div className="ex-mini-map is-empty">No fix</div>
                      )}
                    </div>
                  </section>

                  <section className="ex-card">
                    <h3>Vitals</h3>
                    <dl className="ex-vitals">
                      <div><dt>hr</dt><dd>{decoded.hr} bpm</dd></div>
                      <div><dt>hrv</dt><dd>{decoded.hrv} ms</dd></div>
                      <div><dt>spo2</dt><dd>{decoded.spo2}%</dd></div>
                      <div><dt>temp</dt><dd>{decoded.temp} °C</dd></div>
                    </dl>
                  </section>

                  <section className="ex-card">
                    <h3>Device</h3>
                    <div className="ex-device">
                      <div className="ex-batt">
                        <span
                          className={`ex-batt-fill${decoded.flags.low_battery || decoded.batt < 20 ? " is-low" : ""}`}
                          style={{ width: `${Math.min(Math.max(decoded.batt, 0), 100)}%` }}
                        />
                        <em>{decoded.batt}%</em>
                      </div>
                      <div className="ex-flags">
                        <FlagChip label="heat_stress" active={decoded.flags.heat_stress} danger />
                        <FlagChip label="arrhythmia" active={decoded.flags.arrhythmia} danger />
                        <FlagChip label="sos" active={decoded.flags.sos} danger />
                        <FlagChip label="casualty" active={decoded.flags.casualty} danger />
                        <FlagChip label="low_battery" active={decoded.flags.low_battery} danger />
                        <FlagChip label="strap_connected" active={decoded.flags.strap_connected} />
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}

              {selected && detailTab === "decoded" && !decoded ? (
                <div className="ex-detail-body">
                  <p className="ex-status">No SOLDIER_TELEMETRY payload on this record.</p>
                  <pre className="ex-json">{jsonTone(JSON.stringify(selected.data ?? {}, null, 2))}</pre>
                </div>
              ) : null}

              {selected && detailTab === "raw" ? (
                <div className="ex-detail-body">
                  <section className="ex-card">
                    <h3>Raw</h3>
                    <dl>
                      <div><dt>raw_format</dt><dd>{dash(selected.raw_format)}</dd></div>
                      <div><dt>raw_bytes_length</dt><dd>{dash(selected.raw_bytes_length)}</dd></div>
                      <div><dt>raw_hex</dt><dd className="ex-hex">{dash(selected.raw_hex)}</dd></div>
                    </dl>
                  </section>
                  <section className="ex-card">
                    <h3>data</h3>
                    <pre className="ex-json">{jsonTone(JSON.stringify(selected.data ?? {}, null, 2))}</pre>
                  </section>
                </div>
              ) : null}

              {selected && detailTab === "packet" ? (
                <div className="ex-detail-body">
                  <section className="ex-card">
                    <h3>Packet Info</h3>
                    <dl>
                      {Object.entries(packetFields(selected))
                        .filter(([key]) => key !== "personnel_name")
                        .map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd className={key === "raw_hex" ? "ex-hex" : undefined}>
                            {value == null || value === ""
                              ? "—"
                              : key.endsWith("_time") || key === "created_at" || key === "received_at"
                                ? formatEventTime(String(value))
                                : key === "raw_bytes_length"
                                  ? formatBytes(Number(value))
                                  : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}
