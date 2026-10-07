"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import CreateOperationModal from "./create-operation-modal";
import OperationDetail from "./operation-detail";
import {
  SEED_GEOFENCES,
  SEED_GROUPS,
  SEED_OPERATIONS,
  STATUS_LABELS,
  MAP_SOLDIERS,
  applyDraftToOperation,
  assignmentPersonCount,
  createOperationFromDraft,
  draftFromOperation,
  formatOpRange,
  geofenceTotals,
  mapSoldierMarkers,
  type OpGeofence,
  type Operation,
  type OperationDraft,
  type OperationStatus,
} from "@/lib/operations";

const OperationsMap = dynamic(() => import("./operations-map"), { ssr: false });

type FilterTab = "all" | OperationStatus;

const FILTERS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "planning", label: "Planning" },
  { id: "completed", label: "Completed" },
];

export default function OperationsView() {
  const [operations, setOperations] = useState<Operation[]>(SEED_OPERATIONS);
  const [catalog, setCatalog] = useState<OpGeofence[]>(SEED_GEOFENCES);
  const groups = SEED_GROUPS;
  const [filter, setFilter] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string>(SEED_OPERATIONS[0]?.id ?? "");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [editDraft, setEditDraft] = useState<OperationDraft | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return operations.filter((op) => {
      if (filter !== "all" && op.status !== filter) return false;
      if (!q) return true;
      return (
        op.name.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        STATUS_LABELS[op.status].toLowerCase().includes(q)
      );
    });
  }, [operations, filter, query]);

  const highlight = operations.find((op) => op.id === highlightId) ?? filtered[0] ?? null;
  const detail = detailId ? operations.find((op) => op.id === detailId) ?? null : null;
  const mapFences = highlight ? geofenceTotals(highlight.geofenceIds, catalog).items : [];
  const mapMarkers = highlight?.markers?.length
    ? highlight.markers
    : mapSoldierMarkers(MAP_SOLDIERS);

  function openCreate() {
    setWizardMode("create");
    setEditDraft(null);
    setWizardOpen(true);
  }

  function openEdit(op: Operation) {
    setWizardMode("edit");
    setEditDraft(draftFromOperation(op, catalog));
    setWizardOpen(true);
  }

  function mergeGeofences(incoming: OpGeofence[]) {
    setCatalog((current) => {
      const map = new Map(current.map((g) => [g.id, g]));
      for (const g of incoming) map.set(g.id, g);
      return [...map.values()];
    });
  }

  function handleSubmit(draft: OperationDraft) {
    if (wizardMode === "edit" && detailId) {
      const existing = operations.find((op) => op.id === detailId);
      if (!existing) return;
      const { operation, geofences } = applyDraftToOperation(existing, draft);
      mergeGeofences(geofences);
      setOperations((items) => items.map((item) => (item.id === operation.id ? operation : item)));
      setWizardOpen(false);
      return;
    }
    const { operation, geofences } = createOperationFromDraft(draft);
    mergeGeofences(geofences);
    setOperations((items) => [operation, ...items]);
    setHighlightId(operation.id);
    setDetailId(operation.id);
    setWizardOpen(false);
  }

  function endOperation(id: string) {
    setOperations((items) =>
      items.map((item) => (item.id === id ? { ...item, status: "completed" as const } : item)),
    );
  }

  function deleteOperation(id: string) {
    const next = operations.filter((item) => item.id !== id);
    setOperations(next);
    if (highlightId === id) setHighlightId(next[0]?.id ?? "");
    if (detailId === id) setDetailId(null);
  }

  return (
    <div className="cmd op">
      <TopHeader />
      {detail ? (
        <div className="op-body is-detail">
          <OperationDetail
            operation={detail}
            groups={groups}
            catalog={catalog}
            onBack={() => setDetailId(null)}
            onEdit={() => openEdit(detail)}
            onEnd={() => endOperation(detail.id)}
          />
        </div>
      ) : (
        <div className="op-body">
          <aside className="op-sidebar">
            <button type="button" className="op-create" onClick={openCreate}>
              <span aria-hidden="true">+</span> Create Operation
            </button>

            <div className="op-filters" role="tablist" aria-label="Operation status">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  className={filter === item.id ? "is-active" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="op-search">
              <svg className="op-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search operations…"
                aria-label="Search operations"
              />
            </div>

            <ul className="op-card-list">
              {filtered.map((op) => {
                const personCount = assignmentPersonCount(op.assignments);
                const geo = geofenceTotals(op.geofenceIds, catalog);
                const active = highlight?.id === op.id;
                return (
                  <li key={op.id}>
                    <article
                      className={`op-card${active ? " is-active" : ""}`}
                      onClick={() => setHighlightId(op.id)}
                      onDoubleClick={() => setDetailId(op.id)}
                    >
                      <div className="op-card-top">
                        <strong>{op.name}</strong>
                        <span className={`op-status is-${op.status}`}>{STATUS_LABELS[op.status]}</span>
                      </div>
                      <p>{op.description}</p>
                      <div className="op-card-meta">
                        <span>{formatOpRange(op.startAt, op.endAt)}</span>
                        <span>
                          {personCount} personnel · {geo.count} zones
                        </span>
                      </div>
                      {geo.items.length > 0 ? (
                        <div className="op-card-zones">
                          {geo.items.slice(0, 3).map((fence) => (
                            <span key={fence.id} className="op-zone-chip">
                              <i style={{ background: fence.color }} aria-hidden="true" />
                              {fence.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="op-card-actions">
                        <button
                          type="button"
                          className="op-btn is-danger is-compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete operation "${op.name}"?`)) {
                              deleteOperation(op.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="op-btn is-ghost is-compact"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(op.id);
                          }}
                        >
                          Open detail
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
              {filtered.length === 0 ? <li className="op-empty">No operations match this filter.</li> : null}
            </ul>
          </aside>

          <main className="op-stage">
            {highlight ? (
              <>
                {!wizardOpen ? (
                  <div className="op-stage-banner">
                    <div>
                      <strong>{highlight.name}</strong>
                      <span className={`op-status is-${highlight.status}`}>{STATUS_LABELS[highlight.status]}</span>
                    </div>
                    <button type="button" className="op-btn is-ghost" onClick={() => setDetailId(highlight.id)}>
                      View Operation
                    </button>
                  </div>
                ) : null}
                <OperationsMap fences={mapFences} markers={mapMarkers} />
              </>
            ) : (
              <div className="op-placeholder">
                <h2>No operation selected</h2>
                <p>Create an operation or adjust filters to begin.</p>
              </div>
            )}
          </main>
        </div>
      )}

      <CreateOperationModal
        open={wizardOpen}
        mode={wizardMode}
        initial={editDraft}
        groups={groups}
        catalog={catalog}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
