"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import TopHeader from "@/components/TopHeader";
import {
  downloadHistoryCsv,
  downsampleTrackPoints,
  formatHistoryClock,
  formatHistoryTime,
  historyOptions,
  listHistoryTrack,
  positionSourceColor,
  readHistoryPoint,
  soldierHistoryLabel,
  summarizeHistory,
  titleizeHistory,
  type HistoryOptions,
  type HistoryPointDetail,
  type HistoryQuery,
  type HistoryScope,
  type HistorySummary,
  type HistoryTrackPoint,
} from "@/lib/history";
import { readSessionId } from "@/lib/session";
import type { TrackPoint } from "./history-track-map";

const HistoryTrackMap = dynamic(() => import("./history-track-map"), { ssr: false });
const ExplorerMiniMap = dynamic(() => import("../../explorer/components/explorer-mini-map"), { ssr: false });

type ViewBy = "Soldier" | "Group";

function parseSoldierInput(raw: string): number | undefined {
  const match = raw.trim().match(/^(?:s[\s\-_]*)?(\d{1,6})$/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function buildQuery(input: {
  scope: HistoryScope;
  soldierId?: number;
  groupId?: string;
  range: string;
  sources: string[];
  allSources: string[];
}): HistoryQuery | null {
  if (input.scope === "SOLDIER") {
    if (input.soldierId == null) return null;
  } else if (!input.groupId?.trim()) {
    return null;
  }

  const query: HistoryQuery = {
    scope: input.scope,
    timeRange: input.range,
  };
  if (input.scope === "SOLDIER" && input.soldierId != null) query.soldier_id = input.soldierId;
  if (input.scope === "GROUP" && input.groupId) query.group_id = input.groupId.trim();
  if (input.sources.length && input.allSources.length && input.sources.length < input.allSources.length) {
    query.position_source = input.sources;
  }
  return query;
}

function dash(value: unknown) {
  if (value == null || value === "") return "—";
  return String(value);
}

export default function HistoryView({
  initialSoldier = "",
  initialId = null,
}: {
  initialSoldier?: string;
  initialId?: number | null;
}) {
  const [viewBy, setViewBy] = useState<ViewBy>("Soldier");
  const [soldierText, setSoldierText] = useState(initialSoldier ? String(initialSoldier).replace(/^S-/i, "") : "");
  const [groupId, setGroupId] = useState("");
  const [range, setRange] = useState("30d");
  const [sources, setSources] = useState<string[]>([]);
  const [options, setOptions] = useState<HistoryOptions | null>(null);
  const [applied, setApplied] = useState<HistoryQuery | null>(null);
  const [points, setPoints] = useState<HistoryTrackPoint[]>([]);
  const [trackTotal, setTrackTotal] = useState(0);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [detail, setDetail] = useState<HistoryPointDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [index, setIndex] = useState(0);
  const focusIdRef = useRef(initialId);
  const [bootstrapped, setBootstrapped] = useState(false);

  const scope: HistoryScope = viewBy === "Group" ? "GROUP" : "SOLDIER";
  const soldierId = parseSoldierInput(soldierText);
  const knownSources = options?.position_sources ?? [];
  const knownGroups = options?.groups ?? [];
  const timeRanges = options?.time_ranges?.length ? options.time_ranges : ["all", "30d"];

  const draftQuery = useMemo(
    () =>
      buildQuery({
        scope,
        soldierId,
        groupId,
        range,
        sources,
        allSources: knownSources,
      }),
    [scope, soldierId, groupId, range, sources, knownSources],
  );

  function applyFilters(next = draftQuery) {
    if (!readSessionId()) {
      setError("Login required. History API needs a Bearer session with history.read.");
      return;
    }
    if (!next) {
      setError(scope === "SOLDIER" ? "Enter a valid soldier ID first (e.g. 104)" : "Enter a group name first");
      return;
    }
    setError("");
    setPlaying(false);
    setApplied({ ...next });
  }

  useEffect(() => {
    if (bootstrapped) return;
    if (!initialSoldier && initialId == null) {
      setBootstrapped(true);
      return;
    }
    const seed = buildQuery({
      scope: "SOLDIER",
      soldierId: parseSoldierInput(String(initialSoldier).replace(/^S-/i, "")),
      groupId: "",
      range: "30d",
      sources: [],
      allSources: [],
    });
    if (seed) setApplied(seed);
    setBootstrapped(true);
  }, [bootstrapped, initialSoldier, initialId]);

  useEffect(() => {
    if (!applied) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const optionsQuery: HistoryQuery = {
      scope: applied.scope,
      timeRange: applied.timeRange,
      ...(applied.soldier_id != null ? { soldier_id: applied.soldier_id } : {}),
      ...(applied.group_id ? { group_id: applied.group_id } : {}),
    };
    Promise.all([
      historyOptions(optionsQuery, controller.signal),
      listHistoryTrack(applied, controller.signal),
      summarizeHistory(applied, controller.signal),
    ])
      .then(([nextOptions, track, nextSummary]) => {
        if (controller.signal.aborted) return;
        setOptions(nextOptions);
        setSources((current) => {
          if (!current.length) return [...nextOptions.position_sources];
          const kept = current.filter((name) => nextOptions.position_sources.includes(name));
          return kept.length ? kept : [...nextOptions.position_sources];
        });
        const focusId = focusIdRef.current;
        const sampled = downsampleTrackPoints(track.points, 400, focusId);
        setTrackTotal(track.points.length);
        setPoints(sampled);
        setSummary(nextSummary);
        if (focusId != null) {
          const found = sampled.findIndex((point) => point.source_id === focusId);
          setIndex(found >= 0 ? found : 0);
          focusIdRef.current = null;
          setDetailOpen(true);
        } else {
          setIndex(0);
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setPoints([]);
        setTrackTotal(0);
        setSummary(null);
        const message = reason instanceof Error ? reason.message : "Couldn't load history";
        setError(
          message === "Login required" || message === "authentication required"
            ? "Login required. Open Login, sign in (e.g. superadmin), then Apply again."
            : message,
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applied]);

  const activePoint = points[Math.min(index, Math.max(points.length - 1, 0))] ?? null;

  useEffect(() => {
    if (!activePoint) {
      setDetail(null);
      return;
    }
    const controller = new AbortController();
    readHistoryPoint(activePoint.source_id, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setDetail(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDetail(null);
      });
    return () => controller.abort();
  }, [activePoint?.source_id]);

  const mapPoints: TrackPoint[] = useMemo(
    () =>
      points.map((point) => ({
        position: [point.latitude, point.longitude],
        time: formatHistoryClock(point.event_time),
        source: point.position_source,
        label: point.position_source
          ? `${titleizeHistory(point.position_source)} · ${formatHistoryClock(point.event_time)}`
          : formatHistoryClock(point.event_time),
      })),
    [points],
  );

  const progress = points.length <= 1 ? 100 : (Math.min(index, points.length - 1) / Math.max(points.length - 1, 1)) * 100;
  const startLabel = points[0] ? formatHistoryTime(points[0].event_time) : "—";
  const endLabel = points.length ? formatHistoryTime(points[points.length - 1].event_time) : "—";

  useEffect(() => {
    setPlaying(false);
  }, [soldierText, groupId, range, viewBy, sources.join("|")]);

  useEffect(() => {
    if (!playing || points.length === 0) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        if (current >= points.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(280, 900 / speed));
    return () => window.clearInterval(id);
  }, [playing, speed, points.length]);

  function toggleSource(name: string) {
    setSources((current) => {
      const base = current.length ? current : knownSources;
      return base.includes(name) ? base.filter((item) => item !== name) : [...base, name];
    });
  }

  function resetFilters() {
    setViewBy("Soldier");
    setRange(timeRanges.includes("30d") ? "30d" : timeRanges[0] ?? "30d");
    setSources(knownSources.length ? [...knownSources] : []);
    setGroupId("");
    setSoldierText(initialSoldier ? String(initialSoldier).replace(/^S-/i, "") : "");
    setApplied(null);
    setPoints([]);
    setTrackTotal(0);
    setSummary(null);
    setDetail(null);
    setIndex(0);
    setError("");
  }

  async function exportCsv() {
    if (!applied) {
      setError("Apply filters first");
      return;
    }
    try {
      await downloadHistoryCsv(applied);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't export history");
    }
  }

  const cards = summary?.cards;
  const vitals = detail?.details.vitals;
  const device = detail?.details.device;
  const packet = detail?.details.packet_reference;
  const flags = device?.flags ?? {};
  const strapConnected = flags.strap_connected === true || flags.strap_connected === 1;

  return (
    <div className="cmd hs">
      <TopHeader />
      <main className="hs-body">
        <aside className="hs-filters">
          <div className="hs-filter-head">
            <strong>Filters</strong>
            <button type="button" className="hs-mini-export" disabled={!applied} onClick={() => void exportCsv()}>
              Export
            </button>
          </div>

          <p className="hs-label">View By</p>
          <div className="hs-segment">
            {(["Soldier", "Group"] as ViewBy[]).map((item) => (
              <button
                key={item}
                type="button"
                className={viewBy === item ? "is-active" : undefined}
                onClick={() => setViewBy(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {viewBy === "Soldier" ? (
            <label className="hs-field">
              Soldier ID
              <input
                value={soldierText}
                placeholder="104 or S-104"
                onChange={(event) => setSoldierText(event.target.value)}
              />
            </label>
          ) : (
            <label className="hs-field">
              Group
              {knownGroups.length ? (
                <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                  <option value="">Select group</option>
                  {knownGroups.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={groupId}
                  placeholder="Group name from enrichment"
                  onChange={(event) => setGroupId(event.target.value)}
                />
              )}
            </label>
          )}

          <p className="hs-label">Time Range</p>
          <div className="hs-range-toggle">
            {timeRanges.map((value) => (
              <button
                key={value}
                type="button"
                className={range === value ? "is-active" : undefined}
                onClick={() => setRange(value)}
              >
                {value === "all" ? "All time" : value === "30d" ? "30 days" : value}
              </button>
            ))}
          </div>

          <p className="hs-label">Data Type</p>
          <ul className="hs-check">
            <li>
              <label>
                <input type="checkbox" checked readOnly />
                <i style={{ background: "#38bdf8" }} />
                TELEMETRY
              </label>
            </li>
          </ul>

          <p className="hs-label">Position Source</p>
          <ul className="hs-check">
            {knownSources.length ? (
              knownSources.map((name) => (
                <li key={name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!sources.length || sources.includes(name)}
                      onChange={() => toggleSource(name)}
                    />
                    <i style={{ background: positionSourceColor(name) }} />
                    {titleizeHistory(name)}
                  </label>
                </li>
              ))
            ) : (
              <li>
                <span className="hs-empty-note">
                  {draftQuery || applied ? "No sources in range" : "Set soldier / group, then Apply"}
                </span>
              </li>
            )}
          </ul>

          <div className="hs-filter-actions">
            <button type="button" className="hs-reset" onClick={resetFilters}>
              Reset
            </button>
            <button
              type="button"
              className="hs-apply"
              disabled={!draftQuery || loading}
              onClick={() => applyFilters()}
            >
              {loading ? "Loading…" : "Apply"}
            </button>
          </div>
        </aside>

        <section className={`hs-main${detailOpen && activePoint ? " has-detail" : ""}`}>
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
                <p>Operational TELEMETRY track from explorer records.</p>
              </div>
            </div>
            <div className="hs-head-end">
              <Link href="/dashboard" className="cmd-back-map">
                Back to Map
              </Link>
            </div>
          </header>

          {error ? (
            <p className="hs-status is-error">
              {error}{" "}
              {/login/i.test(error) ? (
                <Link href="/login" className="hs-login-link">
                  Go to Login
                </Link>
              ) : null}
            </p>
          ) : null}
          {!applied && !loading ? (
            <p className="hs-status">Set filters on the left, then press Apply to load track data.</p>
          ) : null}
          {applied && trackTotal > points.length ? (
            <p className="hs-status">
              Map shows {points.length} of {trackTotal} track points (downsampled for performance).
            </p>
          ) : null}

          <div className="hs-stats">
            <article>
              <span>Total Distance{cards?.distance_is_derived ? " (derived)" : ""}</span>
              <strong>{cards ? `${cards.total_distance_km} km` : "—"}</strong>
            </article>
            <article>
              <span>Heart Rate (avg)</span>
              <strong>{cards?.heart_rate_avg_bpm != null ? `${cards.heart_rate_avg_bpm} bpm` : "—"}</strong>
            </article>
            <article>
              <span>Battery (avg)</span>
              <strong>{cards?.battery_avg_percent != null ? `${cards.battery_avg_percent} %` : "—"}</strong>
            </article>
            <article>
              <span>TELEMETRY records</span>
              <strong>{cards?.telemetry_count ?? "—"}</strong>
            </article>
          </div>

          <div className="hs-stage">
            <div className="hs-map-wrap">
              {mapPoints.length ? (
                <HistoryTrackMap
                  points={mapPoints}
                  index={Math.min(index, Math.max(mapPoints.length - 1, 0))}
                  playing={playing}
                />
              ) : (
                <div className="hs-map-empty">{loading ? "Loading track…" : "No track points"}</div>
              )}
            </div>
            <div className="hs-playback">
              <button
                type="button"
                className="hs-play"
                aria-label={playing ? "Pause" : "Play"}
                disabled={!points.length}
                onClick={() => {
                  if (!playing && index >= points.length - 1) setIndex(0);
                  setPlaying((value) => !value);
                }}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <div className="hs-playback-main">
                <div className="hs-playback-times">
                  <span>{startLabel}</span>
                  <span>{endLabel}</span>
                </div>
                <label className="hs-playback-track">
                  <span className="hs-playback-fill" style={{ width: `${progress}%` }} />
                  {activePoint ? <b style={{ left: `${progress}%` }}>{formatHistoryClock(activePoint.event_time)}</b> : null}
                  <input
                    type="range"
                    min={0}
                    max={Math.max(points.length - 1, 0)}
                    value={Math.min(index, Math.max(points.length - 1, 0))}
                    disabled={!points.length}
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
        </section>

        {detailOpen && activePoint ? (
          <aside className="hs-detail">
            <div className="hs-detail-head">
              <strong>Detail</strong>
              <button type="button" aria-label="Close detail" onClick={() => setDetailOpen(false)}>
                ×
              </button>
            </div>
            <div className="hs-detail-stamp">
              <b>{formatHistoryTime(activePoint.event_time)}</b>
              <small>{detail?.id ?? activePoint.id}</small>
            </div>

            <section>
              <h3>Event</h3>
              <dl>
                <div><dt>data_type</dt><dd>{dash(detail?.data_type ?? "TELEMETRY")}</dd></div>
                <div><dt>position_source</dt><dd>{dash(detail?.position_source ?? activePoint.position_source)}</dd></div>
                <div><dt>soldier_id</dt><dd>{soldierHistoryLabel(detail?.soldier_id ?? activePoint.soldier_id)}</dd></div>
                <div><dt>group_id</dt><dd>{dash(detail?.group_id)}</dd></div>
                <div><dt>gateway_id</dt><dd>{dash(detail?.gateway_id ?? packet?.gateway_id)}</dd></div>
              </dl>
            </section>

            <section>
              <h3>Position</h3>
              <dl>
                <div><dt>latitude</dt><dd>{dash(detail?.details.position.latitude ?? activePoint.latitude)}</dd></div>
                <div><dt>longitude</dt><dd>{dash(detail?.details.position.longitude ?? activePoint.longitude)}</dd></div>
              </dl>
              <div className="hs-detail-map">
                <ExplorerMiniMap lat={activePoint.latitude} lng={activePoint.longitude} />
              </div>
            </section>

            <section>
              <h3>Vitals</h3>
              <dl>
                <div><dt>hr</dt><dd>{vitals?.hr != null ? `${vitals.hr} bpm` : "—"}</dd></div>
                <div><dt>hrv</dt><dd>{vitals?.hrv != null ? `${vitals.hrv} ms` : "—"}</dd></div>
                <div><dt>spo2</dt><dd>{vitals?.spo2 != null ? `${vitals.spo2}%` : "—"}</dd></div>
                <div><dt>temp</dt><dd>{vitals?.temp != null ? `${vitals.temp} °C` : "—"}</dd></div>
              </dl>
            </section>

            <section>
              <h3>Device</h3>
              <dl>
                <div><dt>batt</dt><dd>{device?.batt != null ? `${device.batt}%` : "—"}</dd></div>
                <div>
                  <dt>strap_connected</dt>
                  <dd className={strapConnected ? "is-ok" : "is-warn"}>
                    {device?.flags ? String(Boolean(strapConnected)) : "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Packet reference</h3>
              <dl>
                <div><dt>transport</dt><dd>{dash(packet?.transport ?? detail?.transport)}</dd></div>
                <div><dt>seq</dt><dd>{dash(packet?.seq)}</dd></div>
                <div><dt>burst_id</dt><dd>{dash(packet?.burst_id)}</dd></div>
                <div><dt>burst_index</dt><dd>{dash(packet?.burst_index)}</dd></div>
              </dl>
            </section>
          </aside>
        ) : null}
      </main>
    </div>
  );
}
