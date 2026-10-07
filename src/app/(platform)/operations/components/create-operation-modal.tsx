"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import DateTimePicker from "./datetime-picker";
import {
  FENCE_COLORS,
  OPERATION_TYPES,
  assignedPersonIds,
  assignmentPersonCount,
  circleToPolygon,
  emptyDraft,
  estimatePolygonAreaKm2,
  formatOpRange,
  mapSoldierMarkers,
  operationGroupOptions,
  operationPersonnelOptions,
  resolveAssignments,
  toOpPerson,
  typeLabel,
  type DrawMode,
  type FenceKind,
  type GroupRef,
  type OpGeofence,
  type OpPerson,
  type OperationDraft,
  type OperationType,
} from "@/lib/operations";

const OperationsMap = dynamic(() => import("./operations-map"), { ssr: false });

const STEPS = [
  { id: 1, title: "Basic Information", note: "Name, schedule, and type" },
  { id: 2, title: "Create Groups", note: "Pick map personnel and form groups" },
  { id: 3, title: "Geofences", note: "Draw zones for those groups" },
  { id: 4, title: "Review & Create", note: "Confirm before saving" },
] as const;

type CreateOperationModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: OperationDraft) => void;
  submitting?: boolean;
};

export default function CreateOperationModal({
  open,
  onClose,
  onSubmit,
  submitting = false,
}: CreateOperationModalProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<OperationDraft>(() => emptyDraft());
  const [people, setPeople] = useState<OpPerson[]>([]);
  const [personQuery, setPersonQuery] = useState("");
  const [pickedPeople, setPickedPeople] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [newFenceName, setNewFenceName] = useState("New Zone");
  const [newFenceKind, setNewFenceKind] = useState<FenceKind>("recon");
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [peopleNote, setPeopleNote] = useState("");
  const [existingGroups, setExistingGroups] = useState<GroupRef[]>([]);
  const [linkGroupId, setLinkGroupId] = useState<number | "">("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraft(emptyDraft());
    setPersonQuery("");
    setPickedPeople([]);
    setNewGroupName("");
    setDrawMode("none");
    setDraftPoints([]);
    setCircleCenter(null);
    setNewFenceName("New Zone");
    setNewFenceKind("recon");
    setSelectedFenceId(null);
    setLinkGroupId("");
    setPeopleNote("Loading personnel options…");
    const controller = new AbortController();
    // BE wizard helpers: personnel/options (last TELEMETRY lat/lon) + groups/options.
    Promise.all([
      operationPersonnelOptions("", controller.signal),
      operationGroupOptions(controller.signal),
    ])
      .then(([personnel, groups]) => {
        if (controller.signal.aborted) return;
        setPeople(personnel.items.map(toOpPerson));
        setExistingGroups(groups.items);
        setPeopleNote(
          personnel.items.length
            ? ""
            : "No personnel options — ensure soldiers exist in Personnel with TELEMETRY.",
        );
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setPeople([]);
        setExistingGroups([]);
        setPeopleNote(reason instanceof Error ? reason.message : "Couldn't load personnel options");
      });
    return () => controller.abort();
  }, [open]);

  if (!open || !mounted) return null;

  const takenIds = assignedPersonIds(draft.assignments);
  const availablePeople = people.filter((person) => {
    if (takenIds.has(person.id)) return false;
    const q = personQuery.trim().toLowerCase();
    if (!q) return true;
    return person.label.toLowerCase().includes(q) || person.name.toLowerCase().includes(q);
  });
  const mapMarkers = mapSoldierMarkers(availablePeople);
  const builtGroups = resolveAssignments(draft.assignments, people);
  const draftArea = Math.round(draft.geofences.reduce((sum, g) => sum + g.areaKm2, 0) * 10) / 10;
  const activeStep = STEPS[step - 1] ?? STEPS[0];
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
      pickedPeople.find((id) => people.find((p) => p.id === id)?.role === "danru") ??
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

  function linkExistingGroup() {
    if (linkGroupId === "") return;
    const group = existingGroups.find((item) => item.id === linkGroupId);
    if (!group) return;
    if (draft.assignments.some((a) => a.existingGroupId === group.id)) return;
    setDraft((current) => {
      const nextAssignments = [
        ...current.assignments,
        {
          groupId: `existing-${group.id}`,
          groupName: group.name,
          personIds: [],
          leaderId: group.leader_soldier_id != null ? String(group.leader_soldier_id) : null,
          existingGroupId: group.id,
        },
      ];
      return {
        ...current,
        assignments: nextAssignments,
        groupIds: nextAssignments.map((a) => a.groupId),
      };
    });
    setLinkGroupId("");
  }

  const linkedExistingIds = new Set(
    draft.assignments.map((a) => a.existingGroupId).filter((id): id is number => id != null),
  );
  const linkableGroups = existingGroups.filter((g) => !linkedExistingIds.has(g.id));

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
    if (step === 2) {
      return (
        draft.assignments.some((a) => a.existingGroupId != null) ||
        assignmentPersonCount(draft.assignments) > 0
      );
    }
    if (step === 3) return true;
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
          <h2 id="op-modal-title">Create Operation</h2>
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
          <header className="op-modal-step-head">
            <div>
              <p className="op-modal-step-kicker">
                Step {step} of {STEPS.length}
              </p>
              <h3>{activeStep.title}</h3>
              <p className="op-modal-step-note">{activeStep.note}</p>
            </div>
          </header>

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
                <p className="op-form-hint">
                  Status starts as <span className="op-status is-planning">PLANNING</span> — set by the backend on create.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="op-assign is-stack">
                <section className="op-assign-map-pane">
                  <div className="op-assign-head">
                    <div>
                      <h4>Map personnel</h4>
                      <small>Personnel options with last TELEMETRY position</small>
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
                  <div className="op-assign-panel">
                    <div className="op-assign-head">
                      <h4>Select members</h4>
                    </div>
                    <div className="op-search op-search-inline">
                      <svg className="op-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                      <input
                        value={personQuery}
                        onChange={(e) => setPersonQuery(e.target.value)}
                        placeholder="Search members…"
                      />
                    </div>
                    {peopleNote ? <p className="op-empty">{peopleNote}</p> : null}
                    <ul className="op-person-list is-two">
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
                                <small>{person.name}</small>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                      {!peopleNote && availablePeople.length === 0 ? (
                        <li className="op-empty">
                          {people.length
                            ? "All map members are already in a group."
                            : "No TELEMETRY pins on the map."}
                        </li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="op-assign-actions">
                  <div className="op-create-group-box">
                    <div className="op-create-group-title">Link existing group</div>
                    <div className="op-assign-target">
                      <label>
                        <span>From Settings groups</span>
                        <select
                          value={linkGroupId === "" ? "" : String(linkGroupId)}
                          onChange={(e) =>
                            setLinkGroupId(e.target.value ? Number(e.target.value) : "")
                          }
                        >
                          <option value="">Select group…</option>
                          {linkableGroups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name} · {group.personnel_count} personnel
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="op-btn is-ghost is-compact"
                        disabled={linkGroupId === ""}
                        onClick={linkExistingGroup}
                      >
                        Link group
                      </button>
                    </div>
                    {!linkableGroups.length ? (
                      <p className="op-empty">No more ACTIVE groups to link (or all already linked).</p>
                    ) : null}
                  </div>

                  <div className="op-create-group-box">
                    <div className="op-create-group-title">Create group from selection</div>
                    {pickedPeople.length > 0 ? (
                      <div className="op-picked-chips">
                        {pickedPeople.map((id) => {
                          const person = people.find((item) => item.id === id);
                          return (
                            <span key={id} className="op-picked-chip">
                              {person?.label ?? id}
                              <button
                                type="button"
                                onClick={() => togglePickPerson(id)}
                                aria-label={`Remove ${person?.label ?? id}`}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="op-empty">Select members on the map or list first.</p>
                    )}
                    <div className="op-assign-target">
                      <label>
                        <span>Group name</span>
                        <input
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder={`e.g. Patrol Team ${draft.assignments.length + 1}`}
                        />
                      </label>
                      <button
                        type="button"
                        className="op-btn is-primary is-compact"
                        disabled={!pickedPeople.length}
                        onClick={createGroupFromPicked}
                      >
                        Create group
                      </button>
                    </div>
                  </div>

                  <div className="op-assign-panel is-groups">
                    <div className="op-assign-head">
                      <h4>Groups created</h4>
                      <small>{assignmentPersonCount(draft.assignments)} personnel</small>
                    </div>
                    {draft.assignments.length === 0 ? (
                      <p className="op-empty">Link an existing group or create one from members.</p>
                    ) : (
                      <ul className="op-built-groups">
                        {draft.assignments.map((assignment) => {
                          const resolved = builtGroups.find((item) => item.group.id === assignment.groupId);
                          const members = resolved?.members ?? [];
                          const leader = resolved?.leader ?? null;
                          return (
                          <li key={assignment.groupId} className="op-built-group">
                            <div className="op-built-group-head">
                              <strong>
                                {assignment.groupName}
                                {assignment.existingGroupId != null ? (
                                  <em className="op-pill is-active"> existing</em>
                                ) : null}
                              </strong>
                              <button type="button" onClick={() => clearGroup(assignment.groupId)}>
                                Clear
                              </button>
                            </div>
                            <small>
                              {assignment.existingGroupId != null
                                ? `Settings group #${assignment.existingGroupId}`
                                : `Leader ${leader?.label ?? (assignment.leaderId ? `S-${assignment.leaderId}` : "—")} · ${members.length || assignment.personIds.length} personnel`}
                            </small>
                            {assignment.existingGroupId == null ? (
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
                                        <button
                                          type="button"
                                          onClick={() => setGroupLeader(assignment.groupId, person.id)}
                                        >
                                          Make leader
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removePersonFromGroup(assignment.groupId, person.id)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  </div>
                </section>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="op-geo-step">
                <div className="op-geo-list">
                  <div className="op-geo-tools">
                    <label>
                      <span>Zone name</span>
                      <input value={newFenceName} onChange={(e) => setNewFenceName(e.target.value)} />
                    </label>
                    <label>
                      <span>Kind</span>
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
                          Save zone
                        </button>
                      ) : null}
                      {drawMode === "circle" && circleCenter ? (
                        <button type="button" className="is-save" onClick={saveCircle}>
                          Save zone
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <h4 className="op-geo-section-title">
                    Selected zones <em>{draft.geofences.length}</em>
                  </h4>
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
                    {draft.geofences.length === 0 ? (
                      <li className="op-empty">No zones yet — draw a polygon or circle on the map.</li>
                    ) : null}
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
                      ? "Click to place vertices. Double-click or Save when you have 3+ points."
                      : drawMode === "circle"
                        ? "Click the map to place a circle, then Save zone."
                        : "Choose Polygon or Circle, then draw on the map."}
                  </p>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="op-review">
                <section className="op-review-basic">
                  <h4>Basic info</h4>
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
                        <span className="op-status is-planning">PLANNING</span>
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
                  <h4>Assigned groups</h4>
                  <ul>
                    {draft.assignments.map((assignment) => {
                      const resolved = builtGroups.find((item) => item.group.id === assignment.groupId);
                      const members = resolved?.members ?? [];
                      const leader = resolved?.leader ?? null;
                      return (
                        <li key={assignment.groupId} className="op-review-group">
                          <div>
                            <strong>
                              {assignment.groupName}
                              {assignment.existingGroupId != null ? " (existing)" : ""}
                            </strong>
                            <span>
                              {assignment.existingGroupId != null
                                ? `Settings group #${assignment.existingGroupId}`
                                : `${members.length} personnel · Leader ${leader?.label ?? "—"}`}
                            </span>
                          </div>
                          {members.length ? (
                            <div className="op-member-chips">
                              {members.map((person) => (
                                <span key={person.id} className={leader?.id === person.id ? "is-leader" : ""}>
                                  {person.label}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <p>
                    Groups: <strong>{draft.assignments.length}</strong>
                    {" · "}
                    New members: <strong>{assignmentPersonCount(draft.assignments)}</strong>
                  </p>
                </section>
                <section>
                  <h4>Geofences</h4>
                  {draft.geofences.length === 0 ? (
                    <p className="op-empty">No geofences — you can still create the operation.</p>
                  ) : (
                    <ul>
                      {draft.geofences.map((g) => (
                        <li key={g.id}>
                          <i style={{ background: g.color }} />
                          <strong>{g.name}</strong>
                          <span>
                            {g.areaKm2} km² · {g.kind}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
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
                  disabled={!canNext() || submitting}
                >
                  {submitting ? "Creating…" : "Create Operation"}
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
