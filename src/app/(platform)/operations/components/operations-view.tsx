"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";
import { readSessionId } from "@/lib/session";
import CreateOperationModal from "./create-operation-modal";
import OperationDetail from "./operation-detail";
import {
  createOperation,
  deleteOperation as deleteOperationApi,
  draftToCreateBody,
  formatOpRange,
  listItemToOperation,
  listOperations,
  mapPayloadToFences,
  mapPayloadToMarkers,
  operationMap,
  operationsFilterOptions,
  operationsSummary,
  statusCss,
  statusLabel,
  type Operation,
  type OperationDraft,
  type OperationsSummary,
  type OperationStatus,
  type OpGeofence,
  type OpMarker,
} from "@/lib/operations";

const OperationsMap = dynamic(() => import("./operations-map"), { ssr: false });

type FilterTab = "all" | OperationStatus;

const FALLBACK_STATUSES: FilterTab[] = [
  "all",
  "ACTIVE",
  "PLANNING",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
];

export default function OperationsView() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [groupFilter, setGroupFilter] = useState<number | "all">("all");
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapFences, setMapFences] = useState<OpGeofence[]>([]);
  const [mapMarkers, setMapMarkers] = useState<OpMarker[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const reloadSummary = useCallback((signal?: AbortSignal) => {
    if (!readSessionId()) return Promise.resolve();
    return operationsSummary(signal)
      .then((next) => {
        if (!signal?.aborted) setSummary(next);
      })
      .catch(() => {
        if (!signal?.aborted) setSummary(null);
      });
  }, []);

  const reloadList = useCallback(
    (signal?: AbortSignal) => {
      if (!readSessionId()) {
        setError("Login required for Operations (operations.read).");
        setOperations([]);
        setLoading(false);
        return Promise.resolve();
      }
      setLoading(true);
      setError("");
      return Promise.all([
        listOperations(
          {
            q: debouncedQuery || undefined,
            status: filter === "all" ? undefined : filter,
            group_id: groupFilter === "all" ? undefined : groupFilter,
            page: 1,
            limit: 50,
          },
          signal,
        ),
        reloadSummary(signal),
      ])
        .then(([page]) => {
          if (signal?.aborted) return;
          const items = page.items.map(listItemToOperation);
          setOperations(items);
          setHighlightId((current) => {
            if (current != null && items.some((op) => op.id === current)) return current;
            return items[0]?.id ?? null;
          });
        })
        .catch((reason: unknown) => {
          if (signal?.aborted) return;
          setOperations([]);
          setError(reason instanceof Error ? reason.message : "Couldn't load operations");
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [debouncedQuery, filter, groupFilter, reloadSummary],
  );

  useEffect(() => {
    if (!readSessionId()) return;
    const controller = new AbortController();
    operationsFilterOptions(controller.signal)
      .then((opts) => {
        if (controller.signal.aborted) return;
        setStatusOptions(opts.statuses ?? []);
        setGroupOptions(opts.groups ?? []);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatusOptions([]);
        setGroupOptions([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void reloadList(controller.signal);
    return () => controller.abort();
  }, [reloadList]);

  useEffect(() => {
    if (highlightId == null) {
      setMapFences([]);
      setMapMarkers([]);
      return;
    }
    const controller = new AbortController();
    operationMap(highlightId, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return;
        setMapFences(mapPayloadToFences(payload));
        setMapMarkers(mapPayloadToMarkers(payload));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setMapFences([]);
        setMapMarkers([]);
      });
    return () => controller.abort();
  }, [highlightId]);

  const highlight = useMemo(
    () => operations.find((op) => op.id === highlightId) ?? operations[0] ?? null,
    [operations, highlightId],
  );

  function openCreate() {
    setWizardOpen(true);
  }

  async function handleSubmit(draft: OperationDraft) {
    setSubmitting(true);
    setError("");
    try {
      const created = await createOperation(draftToCreateBody(draft));
      setWizardOpen(false);
      await reloadList();
      setHighlightId(created.id);
      setDetailId(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't create operation");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete operation "${name}"?`)) return;
    try {
      await deleteOperationApi(id);
      if (detailId === id) setDetailId(null);
      await reloadList();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't delete operation");
    }
  }

  if (detailId != null) {
    return (
      <div className="cmd op">
        <TopHeader />
        <div className="op-body is-detail">
          <OperationDetail
            operationId={detailId}
            onBack={() => {
              setDetailId(null);
              void reloadList();
            }}
            onChanged={() => void reloadList()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cmd op">
      <TopHeader />
      <div className="op-body">
        <aside className="op-sidebar">
          <button type="button" className="op-create" onClick={openCreate} disabled={submitting}>
            <span aria-hidden="true">+</span> Create Operation
          </button>

          {summary ? (
            <div className="op-summary" aria-label="Operations summary">
              <span>
                <strong>{summary.total}</strong> total
              </span>
              <span>
                <strong>{summary.active}</strong> active
              </span>
              <span>
                <strong>{summary.planning}</strong> planning
              </span>
              <span>
                <strong>{summary.on_hold}</strong> hold
              </span>
            </div>
          ) : null}

          <div className="op-filter-row">
            <label className="op-filters">
              <span className="sr-only">Operation status</span>
              <select
                value={filter}
                aria-label="Operation status"
                onChange={(event) => setFilter(event.target.value as FilterTab)}
              >
                <option value="all">All statuses</option>
                {(statusOptions.length ? statusOptions : FALLBACK_STATUSES.filter((s) => s !== "all")).map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="op-filters">
              <span className="sr-only">Group</span>
              <select
                value={groupFilter === "all" ? "all" : String(groupFilter)}
                aria-label="Filter by group"
                onChange={(event) => {
                  const value = event.target.value;
                  setGroupFilter(value === "all" ? "all" : Number(value));
                }}
              >
                <option value="all">All groups</option>
                {groupOptions.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="op-search">
            <svg className="op-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or code…"
              aria-label="Search operations"
            />
          </div>

          {error ? <p className="op-empty">{error}</p> : null}

          <ul className="op-card-list">
            {loading && !operations.length ? <li className="op-empty">Loading operations…</li> : null}
            {operations.map((op) => {
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
                      <span className={`op-status is-${statusCss(op.status)}`}>{statusLabel(op.status)}</span>
                    </div>
                    <p>
                      <em className="op-card-code">{op.operation_code}</em>
                      {op.description ? ` · ${op.description}` : ""}
                    </p>
                    <div className="op-card-meta">
                      <span>{formatOpRange(op.startAt, op.endAt)}</span>
                      <span>
                        {op.group_count} groups · {op.personnel_count} personnel · {op.geofence_count} zones
                      </span>
                    </div>
                    <div className="op-card-actions">
                      <button
                        type="button"
                        className="op-btn is-danger is-compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(op.id, op.name);
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
            {!loading && operations.length === 0 && !error ? (
              <li className="op-empty">No operations match this filter.</li>
            ) : null}
          </ul>
        </aside>

        <main className="op-stage">
          {highlight ? (
            <OperationsMap fences={mapFences} markers={mapMarkers} />
          ) : (
            <div className="op-placeholder">
              <h2>No operation selected</h2>
              <p>Create an operation or adjust filters to begin.</p>
            </div>
          )}
        </main>
      </div>

      <CreateOperationModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={(draft) => void handleSubmit(draft)}
        submitting={submitting}
      />
    </div>
  );
}
