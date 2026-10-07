export type OperationStatus = "active" | "planning" | "completed";
export type OperationType = "reconnaissance" | "patrol" | "security" | "support";
export type FenceKind = "recon" | "restricted" | "safe";
export type DrawMode = "none" | "polygon" | "circle";

export type OpGroup = {
  id: string;
  name: string;
  personnel: number;
  online: number;
  leader: string;
  status: "deployed" | "active" | "standby";
};

export type OpPerson = {
  id: string;
  label: string;
  name: string;
  status: "active" | "standby" | "critical";
  role?: "danru" | "member";
  /** Live map position — source of truth for who can be assigned */
  position: [number, number];
};

export type OpAssignment = {
  groupId: string;
  groupName: string;
  personIds: string[];
  leaderId: string | null;
};

export type OpGeofence = {
  id: string;
  name: string;
  kind: FenceKind;
  color: string;
  areaKm2: number;
  points: [number, number][];
};

export type OpMarker = {
  id: string;
  label: string;
  position: [number, number];
  group?: string;
  role?: "danru";
  tone?: "ok" | "warn" | "critical" | "info" | "idle";
};

export type Operation = {
  id: string;
  name: string;
  description: string;
  status: OperationStatus;
  type: OperationType;
  startAt: string;
  endAt: string;
  groupIds: string[];
  assignments: OpAssignment[];
  geofenceIds: string[];
  alerts: { total: number; critical: number };
  tickets: { total: number; open: number };
  markers: OpMarker[];
};

export const MAP_CENTER: [number, number] = [-6.175421, 106.827312];
export const MAP_ZOOM = 13;
export const NIGHT_TILES = "/tiles/{z}/{x}/{y}.png";

/** Match dashboard ops-map fence tones */
export const FENCE_COLORS: Record<FenceKind, string> = {
  recon: "#f59e0b",
  restricted: "#f87171",
  safe: "#4ade80",
};

export const OPERATION_TYPES: { id: OperationType; label: string }[] = [
  { id: "reconnaissance", label: "Reconnaissance" },
  { id: "patrol", label: "Patrol" },
  { id: "security", label: "Security" },
  { id: "support", label: "Support" },
];

export const STATUS_LABELS: Record<OperationStatus, string> = {
  active: "Active",
  planning: "Planning",
  completed: "Completed",
};

export const SEED_GROUPS: OpGroup[] = [
  { id: "g-alpha", name: "Alpha", personnel: 12, online: 10, leader: "S-101", status: "deployed" },
  { id: "g-bravo", name: "Bravo", personnel: 10, online: 8, leader: "S-108", status: "active" },
  { id: "g-charlie", name: "Charlie", personnel: 8, online: 6, leader: "S-120", status: "standby" },
  { id: "g-delta", name: "Delta", personnel: 9, online: 7, leader: "S-130", status: "active" },
];

/** Soldiers currently visible on the live map — only these can be formed into operation groups */
export const MAP_SOLDIERS: OpPerson[] = [
  { id: "101", label: "S-101", name: "Soldier 101", status: "active", position: [-6.182, 106.812] },
  { id: "103", label: "S-103", name: "Soldier 103", status: "active", position: [-6.162, 106.835] },
  { id: "104", label: "S-104", name: "Danru 104", status: "critical", role: "danru", position: [-6.175421, 106.827312] },
  { id: "106", label: "S-106", name: "Soldier 106", status: "standby", position: [-6.181, 106.845] },
  { id: "107", label: "S-107", name: "Danru 107", status: "active", role: "danru", position: [-6.192, 106.821] },
  { id: "108", label: "S-108", name: "Soldier 108", status: "active", position: [-6.168, 106.852] },
  { id: "109", label: "S-109", name: "Soldier 109", status: "active", position: [-6.188, 106.858] },
  { id: "110", label: "S-110", name: "Soldier 110", status: "standby", position: [-6.171, 106.842] },
  { id: "111", label: "S-111", name: "Soldier 111", status: "active", position: [-6.174, 106.85] },
  { id: "112", label: "S-112", name: "Soldier 112", status: "active", position: [-6.179, 106.832] },
];

/** @deprecated use MAP_SOLDIERS */
export const SEED_PERSONNEL = MAP_SOLDIERS;

export function mapSoldierMarkers(people: OpPerson[] = MAP_SOLDIERS): OpMarker[] {
  return people.map((person) => ({
    id: person.id,
    label: person.label,
    position: person.position,
    role: person.role === "danru" ? ("danru" as const) : undefined,
    tone:
      person.status === "critical" ? ("critical" as const) : person.status === "standby" ? ("idle" as const) : ("ok" as const),
  }));
}

export const SEED_GEOFENCES: OpGeofence[] = [
  {
    id: "gf-recon",
    name: "RECON ZONE",
    kind: "recon",
    color: FENCE_COLORS.recon,
    areaKm2: 18.4,
    points: [
      [-6.168, 106.82],
      [-6.168, 106.835],
      [-6.178, 106.838],
      [-6.182, 106.822],
    ],
  },
  {
    id: "gf-restricted",
    name: "RESTRICTED AREA",
    kind: "restricted",
    color: FENCE_COLORS.restricted,
    areaKm2: 14.2,
    points: [
      [-6.172, 106.828],
      [-6.174, 106.842],
      [-6.186, 106.84],
      [-6.184, 106.826],
    ],
  },
  {
    id: "gf-safe",
    name: "SAFE CORRIDOR",
    kind: "safe",
    color: FENCE_COLORS.safe,
    areaKm2: 9.6,
    points: [
      [-6.17, 106.815],
      [-6.17, 106.825],
      [-6.178, 106.825],
      [-6.178, 106.815],
    ],
  },
];

export const SEED_OPERATIONS: Operation[] = [
  {
    id: "op-night-watch",
    name: "Night Watch Alpha",
    description: "Overnight perimeter recon across Merdeka corridor with dual-group coverage.",
    status: "active",
    type: "reconnaissance",
    startAt: "2026-10-06T18:00",
    endAt: "2026-10-07T06:00",
    groupIds: ["g-alpha", "g-bravo"],
    assignments: [
      { groupId: "g-alpha", groupName: "Alpha", personIds: ["101", "103", "104", "106"], leaderId: "104" },
      { groupId: "g-bravo", groupName: "Bravo", personIds: ["107", "108", "109"], leaderId: "107" },
    ],
    geofenceIds: ["gf-recon", "gf-restricted"],
    alerts: { total: 3, critical: 1 },
    tickets: { total: 2, open: 1 },
    markers: [],
  },
  {
    id: "op-bravo-patrol",
    name: "Bravo Urban Patrol",
    description: "Daylight patrol loop covering east sector checkpoints and gateway nodes.",
    status: "planning",
    type: "patrol",
    startAt: "2026-10-08T07:00",
    endAt: "2026-10-08T15:00",
    groupIds: ["g-bravo"],
    assignments: [{ groupId: "g-bravo", groupName: "Bravo", personIds: ["107", "108", "109", "110"], leaderId: "107" }],
    geofenceIds: ["gf-safe"],
    alerts: { total: 0, critical: 0 },
    tickets: { total: 0, open: 0 },
    markers: [],
  },
  {
    id: "op-gate-secure",
    name: "Gateway Secure",
    description: "Completed static security detail for VIP corridor and restricted apron.",
    status: "completed",
    type: "security",
    startAt: "2026-10-04T08:00",
    endAt: "2026-10-05T20:00",
    groupIds: ["g-recon", "g-support"],
    assignments: [
      { groupId: "g-recon", groupName: "Recon Team", personIds: ["101", "103", "111"], leaderId: "101" },
      { groupId: "g-support", groupName: "Support Team", personIds: ["106", "110", "112"], leaderId: "106" },
    ],
    geofenceIds: ["gf-restricted", "gf-safe"],
    alerts: { total: 5, critical: 2 },
    tickets: { total: 4, open: 0 },
    markers: [],
  },
];

export type OperationDraft = {
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  type: OperationType;
  status: OperationStatus;
  groupIds: string[];
  assignments: OpAssignment[];
  geofences: OpGeofence[];
};

export function emptyDraft(): OperationDraft {
  const now = new Date();
  const end = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return {
    name: "",
    description: "",
    startAt: toLocal(now),
    endAt: toLocal(end),
    type: "reconnaissance",
    status: "planning",
    groupIds: [],
    assignments: [],
    geofences: [],
  };
}

export function draftFromOperation(op: Operation, catalog: OpGeofence[]): OperationDraft {
  return {
    name: op.name,
    description: op.description,
    startAt: op.startAt,
    endAt: op.endAt,
    type: op.type,
    status: op.status,
    groupIds: [...op.groupIds],
    assignments: op.assignments.map((a) => ({
      groupId: a.groupId,
      groupName: a.groupName,
      personIds: [...a.personIds],
      leaderId: a.leaderId,
    })),
    geofences: catalog.filter((g) => op.geofenceIds.includes(g.id)).map((g) => ({ ...g, points: [...g.points] })),
  };
}

export function formatOpRange(startAt: string, endAt: string) {
  const fmt = (value: string) =>
    new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(startAt)} — ${fmt(endAt)}`;
}

export function typeLabel(type: OperationType) {
  return OPERATION_TYPES.find((item) => item.id === type)?.label ?? type;
}

export function personnelTotals(groupIds: string[], groups: OpGroup[]) {
  const selected = groups.filter((g) => groupIds.includes(g.id));
  return {
    total: selected.reduce((sum, g) => sum + g.personnel, 0),
    online: selected.reduce((sum, g) => sum + g.online, 0),
    groups: selected,
  };
}

export function assignmentPersonCount(assignments: OpAssignment[]) {
  return assignments.reduce((sum, a) => sum + a.personIds.length, 0);
}

export function assignedPersonIds(assignments: OpAssignment[]) {
  return new Set(assignments.flatMap((a) => a.personIds));
}

export function resolveAssignments(
  assignments: OpAssignment[],
  people: OpPerson[] = MAP_SOLDIERS,
  groups: OpGroup[] = SEED_GROUPS,
) {
  return assignments.map((assignment) => {
    const preset = groups.find((g) => g.id === assignment.groupId);
    const group = {
      id: assignment.groupId,
      name: assignment.groupName || preset?.name || "Group",
      personnel: assignment.personIds.length,
      online: 0,
      leader: "",
      status: preset?.status ?? ("active" as const),
    };
    const members = people.filter((p) => assignment.personIds.includes(p.id));
    const leader = people.find((p) => p.id === assignment.leaderId) ?? members[0] ?? null;
    group.leader = leader?.label ?? "—";
    group.online = members.filter((p) => p.status === "active").length;
    return { group, members, leader, online: group.online, assignment };
  });
}

export function markersFromAssignments(
  assignments: OpAssignment[],
  people: OpPerson[] = MAP_SOLDIERS,
): OpMarker[] {
  return resolveAssignments(assignments, people).flatMap((item) =>
    item.members.map((person) => ({
      id: person.id,
      label: person.label,
      position: person.position,
      group: item.group.name,
      role: item.leader?.id === person.id ? ("danru" as const) : undefined,
      tone:
        person.status === "critical"
          ? ("critical" as const)
          : person.status === "standby"
            ? ("idle" as const)
            : ("ok" as const),
    })),
  );
}

// Resolve seed markers after helpers exist
for (const op of SEED_OPERATIONS) {
  op.markers = markersFromAssignments(op.assignments);
}

export function geofenceTotals(geofenceIds: string[], catalog: OpGeofence[]) {
  const selected = catalog.filter((g) => geofenceIds.includes(g.id));
  return {
    count: selected.length,
    areaKm2: Math.round(selected.reduce((sum, g) => sum + g.areaKm2, 0) * 10) / 10,
    items: selected,
  };
}

export function estimatePolygonAreaKm2(points: [number, number][]) {
  if (points.length < 3) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[(i + 1) % points.length];
    sum += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  const area = Math.abs((sum * R * R) / 2);
  return Math.round(area * 10) / 10;
}

export function circleToPolygon(center: [number, number], radiusM: number, steps = 48): [number, number][] {
  const [lat, lng] = center;
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);
  const points: [number, number][] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    points.push([
      lat + (Math.sin(angle) * radiusM) / metersPerDegLat,
      lng + (Math.cos(angle) * radiusM) / metersPerDegLng,
    ]);
  }
  return points;
}

export function createOperationFromDraft(
  draft: OperationDraft,
  existingMarkers: OpMarker[] = [],
): { operation: Operation; geofences: OpGeofence[] } {
  const id = `op-${Date.now().toString(36)}`;
  const geofences = draft.geofences.map((g) => ({
    ...g,
    id: g.id.startsWith("gf-new-") || g.id.startsWith("gf-") ? g.id : `gf-${Date.now().toString(36)}`,
  }));
  const assignments = draft.assignments
    .filter((a) => a.personIds.length > 0)
    .map((a) => ({
      groupId: a.groupId,
      groupName: a.groupName.trim() || "Group",
      personIds: [...a.personIds],
      leaderId: a.leaderId ?? a.personIds[0] ?? null,
    }));
  const groupIds = assignments.map((a) => a.groupId);
  const markers = existingMarkers.length > 0 ? existingMarkers : markersFromAssignments(assignments);

  return {
    geofences,
    operation: {
      id,
      name: draft.name.trim() || "Untitled Operation",
      description: draft.description.trim() || "No description provided.",
      status: draft.status,
      type: draft.type,
      startAt: draft.startAt,
      endAt: draft.endAt,
      groupIds,
      assignments,
      geofenceIds: geofences.map((g) => g.id),
      alerts: { total: 0, critical: 0 },
      tickets: { total: 0, open: 0 },
      markers,
    },
  };
}

export function applyDraftToOperation(
  op: Operation,
  draft: OperationDraft,
): { operation: Operation; geofences: OpGeofence[] } {
  const geofences = draft.geofences.map((g) => ({ ...g, points: [...g.points] as [number, number][] }));
  const assignments = draft.assignments
    .filter((a) => a.personIds.length > 0)
    .map((a) => ({
      groupId: a.groupId,
      groupName: a.groupName.trim() || "Group",
      personIds: [...a.personIds],
      leaderId: a.leaderId ?? a.personIds[0] ?? null,
    }));
  return {
    geofences,
    operation: {
      ...op,
      name: draft.name.trim() || op.name,
      description: draft.description.trim() || op.description,
      status: draft.status,
      type: draft.type,
      startAt: draft.startAt,
      endAt: draft.endAt,
      groupIds: assignments.map((a) => a.groupId),
      assignments,
      geofenceIds: geofences.map((g) => g.id),
      markers: markersFromAssignments(assignments),
    },
  };
}
