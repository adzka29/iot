"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  MAP_SOLDIERS,
  STATUS_LABELS,
  assignmentPersonCount,
  formatOpRange,
  geofenceTotals,
  resolveAssignments,
  typeLabel,
  type OpGeofence,
  type OpGroup,
  type Operation,
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

type OperationDetailProps = {
  operation: Operation;
  groups: OpGroup[];
  catalog: OpGeofence[];
  onBack: () => void;
  onEdit: () => void;
  onEnd: () => void;
};

export default function OperationDetail({
  operation,
  groups,
  catalog,
  onBack,
  onEdit,
  onEnd,
}: OperationDetailProps) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const builtGroups = resolveAssignments(operation.assignments, MAP_SOLDIERS, groups);
  const personTotal = assignmentPersonCount(operation.assignments);
  const personOnline = builtGroups.reduce((sum, item) => sum + item.online, 0);
  const geo = geofenceTotals(operation.geofenceIds, catalog);

  return (
    <div className="op-detail">
      <header className="op-detail-head">
        <div className="op-detail-title">
          <button type="button" className="op-back" onClick={onBack}>
            ← Operations
          </button>
          <div className="op-detail-name">
            <h1>{operation.name}</h1>
            <span className={`op-status is-${operation.status}`}>{STATUS_LABELS[operation.status]}</span>
          </div>
          <p>{operation.description}</p>
        </div>
        <div className="op-detail-actions">
          <button type="button" className="op-btn is-ghost" onClick={onEdit}>
            Edit Operation
          </button>
          <button
            type="button"
            className="op-btn is-danger"
            onClick={onEnd}
            disabled={operation.status === "completed"}
          >
            End Operation
          </button>
        </div>
      </header>

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
          <div className="op-stat-grid">
            <article className="op-stat">
              <span>Personnel</span>
              <strong>
                {personOnline}/{personTotal}
              </strong>
              <small>online</small>
            </article>
            <article className="op-stat is-alert">
              <span>Alerts</span>
              <strong>{operation.alerts.total}</strong>
              <small>{operation.alerts.critical} critical</small>
            </article>
            <article className="op-stat">
              <span>Geofences</span>
              <strong>{geo.count}</strong>
              <small>active zones</small>
            </article>
            <article className="op-stat">
              <span>Area Coverage</span>
              <strong>{geo.areaKm2}</strong>
              <small>km²</small>
            </article>
          </div>

          <div className="op-overview-grid">
            <section className="op-panel">
              <h2>Operation Information</h2>
              <dl className="op-info-list">
                <div>
                  <dt>Type</dt>
                  <dd>{typeLabel(operation.type)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className={`op-status is-${operation.status}`}>{STATUS_LABELS[operation.status]}</span>
                  </dd>
                </div>
                <div>
                  <dt>Schedule</dt>
                  <dd>{formatOpRange(operation.startAt, operation.endAt)}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{operation.description}</dd>
                </div>
              </dl>
            </section>

            <section className="op-panel">
              <h2>Assigned Groups</h2>
              <ul className="op-group-cards">
                {builtGroups.map(({ group, members, leader, online }) => (
                  <li key={group.id} className="is-roster">
                    <div className="op-group-card-top">
                      <strong>{group.name}</strong>
                      <em className="op-pill is-active">
                        {online}/{members.length} online
                      </em>
                    </div>
                    <span>Leader {leader?.label ?? "—"}</span>
                    <div className="op-member-chips">
                      {members.map((person) => (
                        <span key={person.id} className={leader?.id === person.id ? "is-leader" : ""}>
                          {person.label}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="op-panel">
              <h2>Geofences</h2>
              <ul className="op-fence-cards">
                {geo.items.map((fence) => (
                  <li key={fence.id}>
                    <i style={{ background: fence.color }} />
                    <div>
                      <strong>{fence.name}</strong>
                      <span>
                        {fence.areaKm2} km² · {fence.kind}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}

      {tab === "map" ? (
        <div className="op-detail-map">
          <OperationsMap fences={geo.items} markers={operation.markers} />
        </div>
      ) : null}

      {tab === "groups" ? (
        <div className="op-overview">
          <div className="op-overview-grid" style={{ gridTemplateColumns: "1fr" }}>
            {builtGroups.map(({ group, members, leader, online }) => (
              <section key={group.id} className="op-panel">
                <h2>
                  Group {group.name} · {online}/{members.length} online
                </h2>
                <ul className="op-built-members">
                  {members.map((person) => (
                    <li key={person.id}>
                      <span>
                        <strong>
                          {person.label} · {person.name}
                        </strong>
                        <em>{person.status}</em>
                      </span>
                      {leader?.id === person.id ? <span className="op-pill is-deployed">Leader</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {tab !== "overview" && tab !== "map" && tab !== "groups" ? (
        <div className="op-placeholder">
          <h2>{TABS.find((t) => t.id === tab)?.label}</h2>
          <p>This section will connect to live {tab} data in a later iteration.</p>
        </div>
      ) : null}
    </div>
  );
}
