"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  activateOperation,
  cancelOperation,
  completeOperation,
  detailCounts,
  formatOpRange,
  holdOperation,
  mapPayloadToFences,
  mapPayloadToMarkers,
  operationAlerts,
  operationGroups,
  operationMap,
  operationPersonnel,
  readOperation,
  resumeOperation,
  statusCss,
  statusLabel,
  type GroupItem,
  type OpAlert,
  type OperationDetail as OperationDetailDto,
  type OpGeofence,
  type OpMarker,
} from "@/lib/operations";

const OperationsMap = dynamic(() => import("./operations-map"), { ssr: false });

type DetailTab = "overview" | "map" | "groups" | "alerts" | "geofences";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "map", label: "Map" },
  { id: "groups", label: "Groups & Personnel" },
  { id: "alerts", label: "Alerts" },
  { id: "geofences", label: "Geofences" },
];

function alertSeverityClass(severity: string) {
  return severity.toLowerCase().replaceAll("_", "-");
}

function formatAlertClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

type OperationDetailProps = {
  operationId: number;
  onBack: () => void;
  onChanged?: () => void;
};

export default function OperationDetail({ operationId, onBack, onChanged }: OperationDetailProps) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [detail, setDetail] = useState<OperationDetailDto | null>(null);
  const [fences, setFences] = useState<OpGeofence[]>([]);
  const [markers, setMarkers] = useState<OpMarker[]>([]);
  const [personnel, setPersonnel] = useState<{ soldier_id: number; group_id: number; group_name: string }[]>([]);
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [alerts, setAlerts] = useState<OpAlert[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const [next, map, people, groups, alertList] = await Promise.all([
        readOperation(operationId, signal),
        operationMap(operationId, signal),
        operationPersonnel(operationId, signal),
        operationGroups(operationId, signal),
        operationAlerts(operationId, signal),
      ]);
      if (signal?.aborted) return;
      setDetail(next);
      setFences(mapPayloadToFences(map));
      setMarkers(mapPayloadToMarkers(map));
      setPersonnel(people.items);
      setGroupItems(groups.items);
      setAlerts(alertList.items);
    } catch (reason) {
      if (signal?.aborted) return;
      setError(reason instanceof Error ? reason.message : "Couldn't load operation");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [operationId]);

  async function runLifecycle(name: string, task: () => Promise<OperationDetailDto>) {
    setPending(name);
    setError("");
    try {
      const next = await task();
      setDetail(next);
      onChanged?.();
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Lifecycle action failed");
    } finally {
      setPending("");
    }
  }

  if (loading && !detail) {
    return (
      <div className="op-detail">
        <p className="op-empty">Loading operation…</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="op-detail">
        <button type="button" className="op-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Operations
        </button>
        <p className="op-empty">{error || "Operation not found"}</p>
      </div>
    );
  }

  const status = String(detail.status);
  const counts = detailCounts(detail);
  const areaKm2 = Math.round(fences.reduce((sum, g) => sum + g.areaKm2, 0) * 10) / 10;
  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <div className="op-detail">
      <header className="op-detail-head">
        <div className="op-detail-title">
          <button type="button" className="op-back" onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Operations
          </button>
          <div className="op-detail-name">
            <h1>{detail.name}</h1>
            <span className={`op-status is-${statusCss(status)}`}>{statusLabel(status)}</span>
          </div>
          <p>
            <span className="op-code-chip">{detail.operation_code}</span>
            {detail.description ? <span className="op-detail-desc">{detail.description}</span> : null}
          </p>
        </div>
        <div className="op-detail-actions">
          {status === "PLANNING" ? (
            <button
              type="button"
              className="op-btn"
              disabled={pending !== ""}
              onClick={() => void runLifecycle("activate", () => activateOperation(detail.id))}
            >
              Activate
            </button>
          ) : null}
          {status === "ACTIVE" ? (
            <button
              type="button"
              className="op-btn is-ghost"
              disabled={pending !== ""}
              onClick={() => void runLifecycle("hold", () => holdOperation(detail.id))}
            >
              Hold
            </button>
          ) : null}
          {status === "ON_HOLD" ? (
            <button
              type="button"
              className="op-btn"
              disabled={pending !== ""}
              onClick={() => void runLifecycle("resume", () => resumeOperation(detail.id))}
            >
              Resume
            </button>
          ) : null}
          {status === "ACTIVE" || status === "ON_HOLD" ? (
            <button
              type="button"
              className="op-btn is-danger"
              disabled={pending !== ""}
              onClick={() => void runLifecycle("complete", () => completeOperation(detail.id))}
            >
              Complete
            </button>
          ) : null}
          {status === "PLANNING" || status === "ACTIVE" || status === "ON_HOLD" ? (
            <button
              type="button"
              className="op-btn is-ghost"
              disabled={pending !== ""}
              onClick={() => void runLifecycle("cancel", () => cancelOperation(detail.id))}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p className="op-empty">{error}</p> : null}

      <nav className="op-detail-tabs" aria-label="Operation sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "is-active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="op-overview">
          <div className="op-stat-grid is-three">
            <article className="op-stat">
              <span>Personnel</span>
              <strong>{counts.personnel}</strong>
              <small>{counts.groups} groups</small>
            </article>
            <article className="op-stat is-alert">
              <span>Alerts</span>
              <strong>{alerts.length}</strong>
              <small>{criticalAlerts} CRITICAL</small>
            </article>
            <article className="op-stat">
              <span>Geofences</span>
              <strong>{counts.geofences}</strong>
              <small>zones</small>
            </article>
          </div>

          <div className="op-overview-grid">
            <section className="op-panel is-info">
              <div className="op-panel-head">
                <h2>Operation Information</h2>
                <span className="op-code-chip">{detail.operation_code}</span>
              </div>
              <dl className="op-info-list is-grid">
                <div>
                  <dt>Type</dt>
                  <dd>{detail.type ?? "—"}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`op-status is-${statusCss(status)}`}>{statusLabel(status)}</span>
                  </dd>
                </div>
                <div className="is-wide">
                  <dt>Schedule</dt>
                  <dd>{formatOpRange(detail.start_at, detail.end_at)}</dd>
                </div>
                <div>
                  <dt>Created by</dt>
                  <dd>{detail.created_by?.name ?? "—"}</dd>
                </div>
                <div className="is-wide">
                  <dt>Description</dt>
                  <dd className={detail.description ? "" : "is-muted"}>{detail.description ?? "No description"}</dd>
                </div>
              </dl>
            </section>

            <section className="op-panel">
              <h2>Assigned Groups</h2>
              <ul className="op-group-cards">
                {detail.groups.map((group) => (
                  <li key={group.id} className="is-roster">
                    <div className="op-group-card-top">
                      <strong>{group.name}</strong>
                      <em className="op-pill is-active">{group.personnel_count} personnel</em>
                    </div>
                    <span>
                      Leader {group.leader_soldier_id != null ? `S-${group.leader_soldier_id}` : "—"}
                    </span>
                  </li>
                ))}
                {detail.groups.length === 0 ? <li className="op-empty">No groups linked.</li> : null}
              </ul>
            </section>

            <section className="op-panel">
              <h2>Geofences</h2>
              <ul className="op-fence-cards">
                {detail.geofences.map((fence) => (
                  <li key={fence.id}>
                    <i style={{ background: fence.color || "#60a5fa" }} />
                    <div>
                      <strong>{fence.name}</strong>
                      <span>
                        {fence.area_km2 ?? "—"} km² · {fence.kind ?? "—"}
                      </span>
                    </div>
                  </li>
                ))}
                {detail.geofences.length === 0 ? <li className="op-empty">No geofences.</li> : null}
              </ul>
            </section>
          </div>
        </div>
      ) : null}

      {tab === "map" ? (
        <div className="op-detail-map">
          <OperationsMap fences={fences} markers={markers} />
        </div>
      ) : null}

      {tab === "groups" ? (
        <div className="op-overview">
          <div className="op-overview-grid" style={{ gridTemplateColumns: "1fr" }}>
            {(groupItems.length ? groupItems : detail.groups).map((group) => {
              const members = personnel.filter((p) => p.group_id === group.id);
              const leaderId = group.leader_soldier_id;
              const groupStatus = "status" in group ? String(group.status) : "ACTIVE";
              return (
                <section key={group.id} className="op-panel">
                  <h2>
                    {group.name} · {members.length || group.personnel_count} personnel
                    <em className="op-pill is-active" style={{ marginLeft: 8 }}>
                      {groupStatus}
                    </em>
                  </h2>
                  <ul className="op-built-members">
                    {members.map((person) => (
                      <li key={person.soldier_id}>
                        <span>
                          <strong>S-{person.soldier_id}</strong>
                          <em>{person.group_name}</em>
                        </span>
                        {leaderId === person.soldier_id ? (
                          <span className="op-pill is-deployed">Leader</span>
                        ) : null}
                      </li>
                    ))}
                    {members.length === 0 ? <li className="op-empty">No personnel rows.</li> : null}
                  </ul>
                </section>
              );
            })}
            {!detail.groups.length && !groupItems.length ? (
              <p className="op-empty">No ACTIVE groups linked (retired groups are hidden).</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "alerts" ? (
        <div className="op-overview">
          <section className="op-panel op-alerts-panel">
            <div className="op-alerts-head">
              <h2>Alerts in scope</h2>
              <small>
                {alerts.length} total · {criticalAlerts} critical
              </small>
            </div>
            {alerts.length === 0 ? (
              <p className="op-empty">No alerts in this operation scope.</p>
            ) : (
              <ul className="op-alert-cards">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <Link href={`/alerts?id=${alert.id}`} className={`op-alert-card is-${alertSeverityClass(alert.severity)}`}>
                      <div className="op-alert-card-top">
                        <strong>{alert.type}</strong>
                        <em className={`op-sev is-${alertSeverityClass(alert.severity)}`}>{alert.severity}</em>
                        <span className="op-alert-status">{alert.status}</span>
                      </div>
                      <p>
                        {alert.soldier_id != null ? `S-${alert.soldier_id}` : "No soldier"}
                        {alert.group_id != null ? ` · Group #${alert.group_id}` : ""}
                        {" · "}
                        {formatAlertClock(alert.event_time)}
                      </p>
                      <span className="op-alert-detail">View Detail</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "geofences" ? (
        <div className="op-overview">
          <section className="op-panel">
            <h2>Geofences · {areaKm2} km²</h2>
            <ul className="op-fence-cards">
              {(fences.length ? fences : detail.geofences.map((fence) => ({
                id: String(fence.id),
                name: fence.name,
                kind: (fence.kind === "restricted" || fence.kind === "safe" ? fence.kind : "recon") as OpGeofence["kind"],
                color: fence.color || "#60a5fa",
                areaKm2: fence.area_km2 ?? 0,
                points: [] as [number, number][],
                existingId: fence.id,
              }))).map((fence) => (
                <li key={fence.id}>
                  <i style={{ background: fence.color }} />
                  <div>
                    <strong>{fence.name}</strong>
                    <span>
                      {fence.areaKm2 || "—"} km² · {fence.kind}
                      {fence.points.length < 3 ? " · polygon missing" : ""}
                    </span>
                  </div>
                </li>
              ))}
              {!fences.length && !detail.geofences.length ? (
                <li className="op-empty">No geofences on map.</li>
              ) : null}
            </ul>
            {detail.geofences.length > 0 && fences.length === 0 ? (
              <p className="op-empty">
                Zones are linked but polygon points didn&apos;t load — check Map tab after refresh, or recreate the zone.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
