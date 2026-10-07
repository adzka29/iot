"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DateTimePicker from "./datetime-picker";
import {
  FENCE_COLORS,
  MAP_SOLDIERS,
  OPERATION_TYPES,
  STATUS_LABELS,
  assignedPersonIds,
  assignmentPersonCount,
  circleToPolygon,
  emptyDraft,
  estimatePolygonAreaKm2,
  formatOpRange,
  mapSoldierMarkers,
  resolveAssignments,
  typeLabel,
  type DrawMode,
  type FenceKind,
  type OpGeofence,
  type OpGroup,
  type OperationDraft,
  type OperationStatus,
  type OperationType,
} from "@/lib/operations";

const OperationsMap = dynamic(() => import("./operations-map"), { ssr: false });

const STEPS = [
  { id: 1, title: "Basic Information", note: "Name, schedule, and type" },
  { id: 2, title: "Create Groups", note: "Build groups from selected members" },
  { id: 3, title: "Geofences", note: "Zones for those groups" },
  { id: 4, title: "Review & Create", note: "Confirm before saving" },
] as const;

type CreateOperationModalProps = {
  open: boolean;
  mode?: "create" | "edit";
  initial?: OperationDraft | null;
  groups: OpGroup[];
  catalog: OpGeofence[];
  onClose: () => void;
  onSubmit: (draft: OperationDraft) => void;
};

export default function CreateOperationModal({
  open,
  mode = "create",
  initial = null,
  groups,
  catalog,
  onClose,
  onSubmit,
}: CreateOperationModalProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<OperationDraft>(() => initial ?? emptyDraft());
  const [personQuery, setPersonQuery] = useState("");
  const [pickedPeople, setPickedPeople] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [fenceQuery, setFenceQuery] = useState("");
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [newFenceName, setNewFenceName] = useState("New Zone");
  const [newFenceKind, setNewFenceKind] = useState<FenceKind>("recon");
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraft(initial ?? emptyDraft());
    setPersonQuery("");
    setPickedPeople([]);
    setNewGroupName("");
    setFenceQuery("");
    setDrawMode("none");
    setDraftPoints([]);
    setCircleCenter(null);
    setNewFenceName("New Zone");
    setNewFenceKind("recon");
    setSelectedFenceId(null);
  }, [open, initial, groups]);

  if (!open || !mounted) return null;

  const takenIds = assignedPersonIds(draft.assignments);
  const availablePeople = MAP_SOLDIERS.filter((person) => {
    if (takenIds.has(person.id)) return false;
    const q = personQuery.trim().toLowerCase();
    if (!q) return true;
    return person.label.toLowerCase().includes(q) || person.name.toLowerCase().includes(q);
  });
  const mapMarkers = mapSoldierMarkers(availablePeople);
  const builtGroups = resolveAssignments(draft.assignments, MAP_SOLDIERS, groups);
  const availableCatalog = catalog.filter(
    (g) =>
      g.name.toLowerCase().includes(fenceQuery.toLowerCase()) &&
      !draft.geofences.some((d) => d.id === g.id),
  );
  const draftArea = Math.round(draft.geofences.reduce((sum, g) => sum + g.areaKm2, 0) * 10) / 10;
  const assignMarkers = [
    ...mapMarkers,
    ...builtGroups.flatMap(({ members, group, leader }) =>
      members.map((person) => ({
        id: person.id,
        label: person.label,
        position: person.position,
        group: group.name,
        role: leader?.id === person.id ? ("danru" as const) : undefined,
        tone:
          person.status === "critical"
            ? ("critical" as const)
            : person.status === "standby"
              ? ("idle" as const)
              : ("ok" as const),
      })),
    ),
  ];

  function togglePickPerson(id: string) {
    if (takenIds.has(id)) return;
    setPickedPeople((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function createGroupFromPicked() {
    if (!pickedPeople.length) return;
    const name =
      newGroupName.trim() ||
      `Group ${String.fromCharCode(65 + draft.assignments.length)}`;
    const groupId = `g-${Date.now().toString(36)}`;
    const leaderCandidate =
      pickedPeople.find((id) => MAP_SOLDIERS.find((p) => p.id === id)?.role === "danru") ??
      pickedPeople[0] ??
      null;
    setDraft((current) => {
      const nextAssignments = [
        ...current.assignments,
        {
          groupId,
          groupName: name,
          personIds: [...pickedPeople],
          leaderId: leaderCandidate,
        },
      ];
      return {
        ...current,
        assignments: nextAssignments,
        groupIds: nextAssignments.map((a) => a.groupId),
      };
    });
    setPickedPeople([]);
    setNewGroupName("");
  }

  function removePersonFromGroup(groupId: string, personId: string) {
    setDraft((current) => {
      const nextAssignments = current.assignments
        .map((a) => {
          if (a.groupId !== groupId) return a;
          const personIds = a.personIds.filter((id) => id !== personId);
          if (!personIds.length) return null;
          return {
            ...a,
            personIds,
            leaderId: a.leaderId === personId ? personIds[0] ?? null : a.leaderId,
          };
        })
        .filter((a): a is NonNullable<typeof a> => a !== null);
      return {
        ...current,
        assignments: nextAssignments,
        groupIds: nextAssignments.map((a) => a.groupId),
      };
    });
  }

  function setGroupLeader(groupId: string, personId: string) {
    setDraft((current) => ({
      ...current,
      assignments: current.assignments.map((a) =>
        a.groupId === groupId ? { ...a, leaderId: personId } : a,
      ),
    }));
  }

  function clearGroup(groupId: string) {
    setDraft((current) => {
      const nextAssignments = current.assignments.filter((a) => a.groupId !== groupId);
      return {
        ...current,
        assignments: nextAssignments,
        groupIds: nextAssignments.map((a) => a.groupId),
      };
    });
  }

  function addCatalogFence(fence: OpGeofence) {
    setDraft((current) => ({
      ...current,
      geofences: [...current.geofences, { ...fence, points: [...fence.points] }],
    }));
  }

  function removeDraftFence(id: string) {
    setDraft((current) => ({
      ...current,
      geofences: current.geofences.filter((g) => g.id !== id),
    }));
    if (selectedFenceId === id) setSelectedFenceId(null);
  }

  function finishPolygon() {
    if (draftPoints.length < 3) {
      setDraftPoints([]);
      setDrawMode("none");
      return;
    }
    const areaKm2 = estimatePolygonAreaKm2(draftPoints);
    const fence: OpGeofence = {
      id: `gf-new-${Date.now().toString(36)}`,
      name: newFenceName.trim() || "New Zone",
      kind: newFenceKind,
      color: FENCE_COLORS[newFenceKind],
      areaKm2,
      points: [...draftPoints],
    };
    setDraft((current) => ({ ...current, geofences: [...current.geofences, fence] }));
    setDraftPoints([]);
    setDrawMode("none");
    setSelectedFenceId(fence.id);
  }

  function saveCircle() {
    if (!circleCenter) return;
    const points = circleToPolygon(circleCenter, 400);
    const areaKm2 = estimatePolygonAreaKm2(points);
    const fence: OpGeofence = {
      id: `gf-new-${Date.now().toString(36)}`,
      name: newFenceName.trim() || "New Zone",
      kind: newFenceKind,
      color: FENCE_COLORS[newFenceKind],
      areaKm2,
      points,
    };
    setDraft((current) => ({ ...current, geofences: [...current.geofences, fence] }));
    setCircleCenter(null);
    setDrawMode("none");
    setSelectedFenceId(fence.id);
  }

  function canNext() {
    if (step === 1) return draft.name.trim().length > 0 && !!draft.startAt && !!draft.endAt;
    if (step === 2) return assignmentPersonCount(draft.assignments) > 0;
    if (step === 3) return draft.geofences.length > 0;
    return true;
  }

  return createPortal(
    <div className="op-modal" role="presentation" onClick={onClose}>
      <div
        className="op-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="op-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="op-modal-steps">
          <h2 id="op-modal-title">{mode === "edit" ? "Edit Operation" : "Create Operation"}</h2>
          <ol>
            {STEPS.map((item) => (
              <li key={item.id} className={step === item.id ? "is-active" : step > item.id ? "is-done" : ""}>
                <span className="op-step-index">{item.id}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.note}</small>
                </span>
              </li>
            ))}
          </ol>
        </aside>

        <div className="op-modal-main">
          <div className="op-modal-body">
            {step === 1 ? (
              <div className="op-form">
                <label>
                  <span>Operation Name</span>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))}
                    placeholder="e.g. Night Watch Alpha"
                  />
                </label>
                <label>
                  <span>Description</span>
                  <textarea
                    rows={4}
                    value={draft.description}
                    onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                    placeholder="Mission intent, sector, and constraints"
                  />
                </label>
                <div className="op-form-row">
                  <DateTimePicker
                    label="Start Date & Time"
                    value={draft.startAt}
                    onChange={(startAt) => setDraft((c) => ({ ...c, startAt }))}
                  />
                  <DateTimePicker
                    label="End Date & Time"
                    value={draft.endAt}
                    min={draft.startAt}
                    onChange={(endAt) => setDraft((c) => ({ ...c, endAt }))}
                  />
                </div>
                <div className="op-form-row">
                  <label>
                    <span>Operation Type</span>
                    <select
                      value={draft.type}
                      onChange={(e) => setDraft((c) => ({ ...c, type: e.target.value as OperationType }))}
                    >
                      {OPERATION_TYPES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Status</span>
                    <select
                      value={draft.status}
                      onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value as OperationStatus }))}
                    >
                      {(Object.keys(STATUS_LABELS) as OperationStatus[]).map((id) => (
                        <option key={id} value={id}>
                          {STATUS_LABELS[id]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="op-assign is-stack">
                <section className="op-assign-top">
                  <div className="op-assign-head">
                    <div>
                      <h3>Map personnel</h3>
                      <small>Klik marker atau pilih member di bawah untuk membentuk group</small>
                    </div>
                    <span className="op-assign-count">{pickedPeople.length} selected</span>
                  </div>
                  <div className="op-assign-map">
                    <OperationsMap
                      fences={[]}
                      markers={assignMarkers}
                      selectedMarkerIds={pickedPeople}
                      onSelectMarker={togglePickPerson}
                      interactive={false}
                    />
                  </div>
                </section>

                <section className="op-assign-bottom">
                  <div className="op-assign-list">
                    <div className="op-assign-head">
                      <h3>Pilih member</h3>
                      <div className="op-search op-search-inline">
                        <svg className="op-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        </svg>
                        <input
                          value={personQuery}
                          onChange={(e) => setPersonQuery(e.target.value)}
                          placeholder="Cari member…"
                        />
                      </div>
                    </div>
                    <ul className="op-person-list is-grid">
                      {availablePeople.map((person) => {
                        const checked = pickedPeople.includes(person.id);
                        return (
                          <li key={person.id}>
                            <label className={checked ? "is-checked" : ""}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePickPerson(person.id)}
                              />
                              <span className="op-person-avatar" aria-hidden="true">
                                {person.label.replace(/^S-/, "")}
                              </span>
                              <span className="op-group-main">
                                <strong>{person.label}</strong>
                                <small>
                                  {person.name}
                                  {person.role === "danru" ? " · Danru" : ""}
                                </small>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                      {availablePeople.length === 0 ? (
                        <li className="op-empty">Semua member map sudah masuk group.</li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="op-assign-actions">
                    <div className="op-create-group-box">
                      <div className="op-create-group-title">Buat group dari member terpilih</div>
                      {pickedPeople.length > 0 ? (
                        <div className="op-picked-chips">
                          {pickedPeople.map((id) => {
                            const person = MAP_SOLDIERS.find((item) => item.id === id);
                            return (
                              <span key={id} className="op-picked-chip">
                                {person?.label ?? id}
                                <button type="button" onClick={() => togglePickPerson(id)} aria-label={`Hapus ${person?.label ?? id}`}>
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="op-empty">Belum ada member dipilih.</p>
                      )}
                      <div className="op-assign-target">
                        <label>
                          <span>Nama group baru</span>
                          <input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder={`mis. Patrol Team ${draft.assignments.length + 1}`}
                          />
                        </label>
                        <button
                          type="button"
                          className="op-btn is-primary is-compact"
                          disabled={!pickedPeople.length}
                          onClick={createGroupFromPicked}
                        >
                          Buat group
                        </button>
                      </div>
                    </div>

                    <aside className="op-assign-selected">
                      <div className="op-assign-head">
                        <h3>Group yang dibuat</h3>
                        <small>{assignmentPersonCount(draft.assignments)} personnel</small>
                      </div>
                      {builtGroups.length === 0 ? (
                        <p className="op-empty">Group muncul di sini setelah dibuat dari member terpilih.</p>
                      ) : (
                        <ul className="op-built-groups">
                          {builtGroups.map(({ group, members, leader }) => (
                            <li key={group.id} className="op-built-group">
                              <div className="op-built-group-head">
                                <strong>{group.name}</strong>
                                <button type="button" onClick={() => clearGroup(group.id)}>
                                  Clear
                                </button>
                              </div>
                              <small>
                                Leader {leader?.label ?? "—"} · {members.length} personnel
                              </small>
                              <ul className="op-built-members">
                                {members.map((person) => (
                                  <li key={person.id}>
                                    <span>
                                      <strong>{person.label}</strong>
                                      <em>{person.name}</em>
                                    </span>
                                    <div className="op-built-member-actions">
                                      {leader?.id === person.id ? (
                                        <span className="op-pill is-deployed">Leader</span>
                                      ) : (
                                        <button type="button" onClick={() => setGroupLeader(group.id, person.id)}>
                                          Make leader
                                        </button>
                                      )}
                                      <button type="button" onClick={() => removePersonFromGroup(group.id, person.id)}>
                                        Remove
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      )}
                    </aside>
                  </div>
                </section>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="op-geo-step">
                <div className="op-geo-list">
                  <div className="op-search">
                    <input
                      value={fenceQuery}
                      onChange={(e) => setFenceQuery(e.target.value)}
                      placeholder="Search geofences…"
                    />
                  </div>
                  <div className="op-geo-tools">
                    <label>
                      <span>Name</span>
                      <input value={newFenceName} onChange={(e) => setNewFenceName(e.target.value)} />
                    </label>
                    <label>
                      <span>Color / Kind</span>
                      <select value={newFenceKind} onChange={(e) => setNewFenceKind(e.target.value as FenceKind)}>
                        <option value="recon">Recon</option>
                        <option value="restricted">Restricted</option>
                        <option value="safe">Safe</option>
                      </select>
                    </label>
                    <div className="op-draw-btns">
                      <button
                        type="button"
                        className={drawMode === "polygon" ? "is-active" : ""}
                        onClick={() => {
                          setDrawMode((m) => (m === "polygon" ? "none" : "polygon"));
                          setCircleCenter(null);
                          setDraftPoints([]);
                        }}
                      >
                        Polygon
                      </button>
                      <button
                        type="button"
                        className={drawMode === "circle" ? "is-active" : ""}
                        onClick={() => {
                          setDrawMode((m) => (m === "circle" ? "none" : "circle"));
                          setDraftPoints([]);
                          setCircleCenter(null);
                        }}
                      >
                        Circle
                      </button>
                      {drawMode === "polygon" && draftPoints.length >= 3 ? (
                        <button type="button" className="is-save" onClick={finishPolygon}>
                          Save Geofence
                        </button>
                      ) : null}
                      {drawMode === "circle" && circleCenter ? (
                        <button type="button" className="is-save" onClick={saveCircle}>
                          Save Geofence
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <h3>Available</h3>
                  <ul className="op-fence-pick">
                    {availableCatalog.map((fence) => (
                      <li key={fence.id}>
                        <button type="button" onClick={() => addCatalogFence(fence)}>
                          <i style={{ background: fence.color }} />
                          <span>
                            <strong>{fence.name}</strong>
                            <small>
                              {fence.areaKm2} km² · {fence.kind}
                            </small>
                          </span>
                          <em>+ Add</em>
                        </button>
                      </li>
                    ))}
                    {availableCatalog.length === 0 ? <li className="op-empty">No matching geofences.</li> : null}
                  </ul>
                  <h3>Selected</h3>
                  <ul className="op-fence-pick">
                    {draft.geofences.map((fence) => (
                      <li key={fence.id}>
                        <button
                          type="button"
                          className={selectedFenceId === fence.id ? "is-active" : ""}
                          onClick={() => setSelectedFenceId(fence.id)}
                        >
                          <i style={{ background: fence.color }} />
                          <span>
                            <strong>{fence.name}</strong>
                            <small>
                              {fence.areaKm2} km² · {fence.kind}
                            </small>
                          </span>
                        </button>
                        <button type="button" className="op-fence-remove" onClick={() => removeDraftFence(fence.id)}>
                          Remove
                        </button>
                      </li>
                    ))}
                    {draft.geofences.length === 0 ? <li className="op-empty">Select or draw a geofence.</li> : null}
                  </ul>
                </div>
                <div className="op-geo-map">
                  <OperationsMap
                    fences={draft.geofences}
                    markers={builtGroups.flatMap(({ members, group, leader }) =>
                      members.map((person) => ({
                        id: person.id,
                        label: person.label,
                        position: person.position,
                        group: group.name,
                        role: leader?.id === person.id ? ("danru" as const) : undefined,
                        tone: "ok" as const,
                      })),
                    )}
                    selectedFenceId={selectedFenceId}
                    drawMode={drawMode}
                    draftPoints={draftPoints}
                    circleCenter={circleCenter}
                    onSelectFence={setSelectedFenceId}
                    onDraftPoint={(pos) => setDraftPoints((pts) => [...pts, pos])}
                    onFinishPolygon={finishPolygon}
                    onMapClick={(pos) => {
                      if (drawMode === "circle") setCircleCenter(pos);
                    }}
                  />
                  <p className="op-geo-hint">
                    {drawMode === "polygon"
                      ? "Click to place vertices. Double-click or Save to finish."
                      : drawMode === "circle"
                        ? "Click the map to place a circle, then Save."
                        : "Draw zones for the groups formed from map soldiers."}
                  </p>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="op-review">
                <section>
                  <h3>Basic Info</h3>
                  <dl>
                    <div>
                      <dt>Name</dt>
                      <dd>{draft.name || "—"}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{typeLabel(draft.type)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span className={`op-status is-${draft.status}`}>{STATUS_LABELS[draft.status]}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Schedule</dt>
                      <dd>{formatOpRange(draft.startAt, draft.endAt)}</dd>
                    </div>
                    <div className="is-wide">
                      <dt>Description</dt>
                      <dd>{draft.description || "—"}</dd>
                    </div>
                  </dl>
                </section>
                <section>
                  <h3>Assigned Groups</h3>
                  <ul>
                    {builtGroups.map(({ group, members, leader }) => (
                      <li key={group.id}>
                        <strong>{group.name}</strong>
                        <span>
                          {members.length} personnel · Leader {leader?.label ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    Total: <strong>{assignmentPersonCount(draft.assignments)}</strong> personnel
                  </p>
                </section>
                <section>
                  <h3>Geofences</h3>
                  <ul>
                    {draft.geofences.map((g) => (
                      <li key={g.id}>
                        <i style={{ background: g.color }} />
                        <strong>{g.name}</strong>
                        <span>{g.areaKm2} km²</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    Coverage: <strong>{draftArea}</strong> km²
                  </p>
                </section>
              </div>
            ) : null}
          </div>

          <footer className="op-modal-foot">
            <button type="button" className="op-btn is-ghost" onClick={onClose}>
              Cancel
            </button>
            <div className="op-modal-foot-right">
              {step > 1 ? (
                <button type="button" className="op-btn is-ghost" onClick={() => setStep((s) => s - 1)}>
                  Back
                </button>
              ) : null}
              {step < 4 ? (
                <button type="button" className="op-btn is-primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="op-btn is-create"
                  onClick={() => onSubmit(draft)}
                  disabled={!canNext()}
                >
                  {mode === "edit" ? "Save Changes" : "Create Operation"}
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
