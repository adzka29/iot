import { readSessionId } from "@/lib/session";

/** BE status enum — use for API; CSS via statusCss(). */
export type OperationStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export type OperationType = "reconnaissance" | "patrol" | "security" | "support";
export type FenceKind = "recon" | "restricted" | "safe";
export type DrawMode = "none" | "polygon" | "circle";

export type OperationListItem = {
  id: number;
  operation_code: string;
  name: string;
  description: string | null;
  type: string | null;
  status: OperationStatus | string;
  start_at: string;
  end_at: string;
  group_count: number;
  personnel_count: number;
  geofence_count: number;
  created_at: string;
};

export type GroupRef = {
  id: number;
  name: string;
  leader_soldier_id: number | null;
  personnel_count: number;
  commander_name?: string | null;
};

export type OperationGeofenceRef = {
  id: number;
  name: string;
  kind: string | null;
  color: string | null;
  area_km2: number | null;
};

export type OperationDetail = {
  id: number;
  operation_code: string;
  name: string;
  description: string | null;
  type: string | null;
  status: OperationStatus | string;
  start_at: string;
  end_at: string;
  groups: GroupRef[];
  geofences: OperationGeofenceRef[];
  summary: { group_count: number; personnel_count: number; geofence_count: number };
  counts: { groups: number; personnel: number; geofences: number };
  created_by: { id: number; name: string } | null;
  created_at: string;
};

/** GET .../groups → items[] */
export type GroupItem = {
  id: number;
  name: string;
  leader_soldier_id: number | null;
  commander: { soldier_id: number } | null;
  personnel_count: number;
  status: string;
};

export type OperationListPage = {
  items: OperationListItem[];
  page: number;
  limit: number;
  total: number;
};

export type OperationsSummary = {
  total: number;
  planning: number;
  active: number;
  on_hold: number;
  completed: number;
  cancelled: number;
};

export type OperationsFilterOptions = {
  statuses: string[];
  groups: { id: number; name: string }[];
};

export type PersonnelChoice = {
  soldier_id: number;
  name: string;
  group_id: number | null;
  group_name: string | null;
  access_group: string;
  last_seen: string | null;
  lat: number | null;
  lon: number | null;
};

export type MapGeofence = {
  id: number;
  name: string;
  kind?: string | null;
  color?: string | null;
  polygon: [number, number][]; // [lng, lat] from BE
};

export type MapPosition = {
  soldier_id: number;
  group_id: number | null;
  group_name: string | null;
  latitude: number | null;
  longitude: number | null;
  event_time: string | null;
};

export type OperationMapPayload = {
  operation: { id: number; name: string };
  groups: GroupRef[];
  personnel: { soldier_id: number; group_id: number; group_name: string }[];
  geofences: MapGeofence[];
  positions: MapPosition[];
};

export type OpAlert = {
  id: number;
  type: string;
  severity: string;
  soldier_id: number | null;
  group_id: number | null;
  status: string;
  event_time: string;
};

export type OpTicket = {
  id: number;
  ticket_code: string;
  status: string;
  priority: string;
  source_alert_id: number;
  alert_type: string;
};

export type CreateOperationBody = {
  name: string;
  description?: string | null;
  type?: string | null;
  start_at: string;
  end_at: string;
  group_ids?: number[];
  groups?: {
    name: string;
    member_soldier_ids: number[];
    leader_soldier_id?: number;
    description?: string | null;
  }[];
  geofence_ids?: number[];
  new_geofences?: {
    name: string;
    polygon: [number, number][];
    kind?: string | null;
    color?: string | null;
    description?: string | null;
    area_km2?: number;
  }[];
};

/** UI helpers kept for wizard / map markers */
export type OpGroup = {
  id: string;
  name: string;
  personnel: number;
  online: number;
  leader: string;
  status: string;
};

export type OpPerson = {
  id: string;
  label: string;
  name: string;
  status: "active" | "standby" | "critical";
  role?: "danru" | "member";
  position: [number, number];
};

export type OpAssignment = {
  groupId: string;
  groupName: string;
  personIds: string[];
  leaderId: string | null;
  /** When set, link existing Settings group PK instead of creating inline */
  existingGroupId?: number;
};

export type OpGeofence = {
  id: string;
  name: string;
  kind: FenceKind;
  color: string;
  areaKm2: number;
  /** Leaflet [lat, lng] */
  points: [number, number][];
  existingId?: number;
};

export type OpMarker = {
  id: string;
  label: string;
  position: [number, number];
  group?: string;
  role?: "danru";
  tone?: "ok" | "warn" | "critical" | "info" | "idle";
};

/** @deprecated prefer OperationListItem / OperationDetail — kept for gradual UI migrate */
export type Operation = {
  id: number;
  operation_code: string;
  name: string;
  description: string;
  status: OperationStatus | string;
  type: string;
  startAt: string;
  endAt: string;
  groupIds: string[];
  assignments: OpAssignment[];
  geofenceIds: string[];
  alerts: { total: number; critical: number };
  tickets: { total: number; open: number };
  markers: OpMarker[];
  group_count: number;
  personnel_count: number;
  geofence_count: number;
};

export type OperationDraft = {
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  type: OperationType;
  groupIds: string[];
  assignments: OpAssignment[];
  geofences: OpGeofence[];
};

export const MAP_CENTER: [number, number] = [-6.175421, 106.827312];
export const MAP_ZOOM = 13;
export const NIGHT_TILES = "/tiles/{z}/{x}/{y}.png";

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

export const STATUS_LABELS: Record<string, string> = {
  PLANNING: "PLANNING",
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

export function statusCss(status: string) {
  return String(status).toLowerCase().replaceAll("_", "-");
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function authHeaders(): HeadersInit {
  const session = readSessionId();
  if (!session) throw new Error("Login required");
  return { Authorization: `Bearer ${session}` };
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string; detail?: string; message?: string };
    if (typeof body.detail === "string") return body.detail;
    if (body.error) return body.error;
    if (body.message) return body.message;
  } catch {
    /* not json */
  }
  if (response.status === 401) return "Login required";
  if (response.status === 403) return "Permission denied";
  if (response.status === 409) return "Conflict — complete or cancel ACTIVE/ON_HOLD ops before delete";
  return `Request failed (${response.status})`;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: "no-store", headers: authHeaders() });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

async function sendJson<T>(path: string, method: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { ...(authHeaders() as Record<string, string>) };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export type ListOperationsQuery = {
  q?: string;
  status?: string;
  group_id?: number;
  start_from?: string;
  start_to?: string;
  page?: number;
  limit?: number;
};

export function listOperations(query: ListOperationsQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.group_id != null) params.set("group_id", String(query.group_id));
  if (query.start_from) params.set("start_from", query.start_from);
  if (query.start_to) params.set("start_to", query.start_to);
  if (query.page != null) params.set("page", String(query.page));
  if (query.limit != null) params.set("limit", String(query.limit));
  const qs = params.toString();
  return getJson<OperationListPage>(`/api/operations${qs ? `?${qs}` : ""}`, signal);
}

export function operationsSummary(signal?: AbortSignal) {
  return getJson<OperationsSummary>("/api/operations/summary", signal);
}

export function operationsFilterOptions(signal?: AbortSignal) {
  return getJson<OperationsFilterOptions>("/api/operations/filters/options", signal);
}

export function operationGroupOptions(signal?: AbortSignal) {
  return getJson<{ items: GroupRef[] }>("/api/operations/groups/options", signal);
}

export function operationPersonnelOptions(q = "", signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  const qs = params.toString();
  return getJson<{ items: PersonnelChoice[] }>(
    `/api/operations/personnel/options${qs ? `?${qs}` : ""}`,
    signal,
  );
}

export function readOperation(id: number, signal?: AbortSignal) {
  return getJson<OperationDetail>(`/api/operations/${id}`, signal);
}

export function createOperation(body: CreateOperationBody, signal?: AbortSignal) {
  return sendJson<OperationDetail>("/api/operations", "POST", body, signal);
}

export function updateOperation(
  id: number,
  body: Partial<Pick<CreateOperationBody, "name" | "description" | "type" | "start_at" | "end_at" | "group_ids" | "geofence_ids">>,
  signal?: AbortSignal,
) {
  return sendJson<OperationDetail>(`/api/operations/${id}`, "PATCH", body, signal);
}

export function deleteOperation(id: number, signal?: AbortSignal) {
  return sendJson<void>(`/api/operations/${id}`, "DELETE", undefined, signal);
}

export function activateOperation(id: number, signal?: AbortSignal) {
  return sendJson<OperationDetail>(`/api/operations/${id}/activate`, "POST", undefined, signal);
}

export function holdOperation(id: number, signal?: AbortSignal) {
  return sendJson<OperationDetail>(`/api/operations/${id}/hold`, "POST", undefined, signal);
}

export function resumeOperation(id: number, signal?: AbortSignal) {
  return sendJson<OperationDetail>(`/api/operations/${id}/resume`, "POST", undefined, signal);
}

export function completeOperation(id: number, signal?: AbortSignal) {
  return sendJson<OperationDetail>(`/api/operations/${id}/complete`, "POST", undefined, signal);
}

export function cancelOperation(id: number, signal?: AbortSignal) {
  return sendJson<OperationDetail>(`/api/operations/${id}/cancel`, "POST", undefined, signal);
}

export function operationMap(id: number, signal?: AbortSignal) {
  return getJson<OperationMapPayload>(`/api/operations/${id}/map`, signal);
}

export function operationAlerts(id: number, signal?: AbortSignal) {
  return getJson<{ items: OpAlert[] }>(`/api/operations/${id}/alerts`, signal);
}

export function operationTickets(id: number, signal?: AbortSignal) {
  return getJson<{ items: OpTicket[] }>(`/api/operations/${id}/tickets`, signal);
}

export function operationPersonnel(id: number, signal?: AbortSignal) {
  return getJson<{ items: { soldier_id: number; group_id: number; group_name: string }[] }>(
    `/api/operations/${id}/personnel`,
    signal,
  );
}

export function operationGroups(id: number, signal?: AbortSignal) {
  return getJson<{ items: GroupItem[] }>(`/api/operations/${id}/groups`, signal);
}

export function addOperationGroup(
  id: number,
  body: { group_id: number } | { name: string; member_soldier_ids: number[]; leader_soldier_id?: number; description?: string | null },
  signal?: AbortSignal,
) {
  return sendJson<OperationDetail>(`/api/operations/${id}/groups`, "POST", body, signal);
}

export function removeOperationGroup(id: number, groupId: number, signal?: AbortSignal) {
  return sendJson<OperationDetail>(`/api/operations/${id}/groups/${groupId}`, "DELETE", undefined, signal);
}

export function addOperationGeofence(
  id: number,
  body:
    | { geofence_id: number }
    | {
        name: string;
        polygon?: [number, number][];
        geometry_json?: string;
        kind?: string | null;
        color?: string | null;
        description?: string | null;
        area_km2?: number;
      },
  signal?: AbortSignal,
) {
  return sendJson<OperationDetail>(`/api/operations/${id}/geofences`, "POST", body, signal);
}

export function removeOperationGeofence(id: number, geofenceId: number, signal?: AbortSignal) {
  return sendJson<OperationDetail>(
    `/api/operations/${id}/geofences/${geofenceId}`,
    "DELETE",
    undefined,
    signal,
  );
}

export function detailCounts(detail: OperationDetail) {
  return {
    groups: detail.summary?.group_count ?? detail.counts?.groups ?? detail.groups?.length ?? 0,
    personnel: detail.summary?.personnel_count ?? detail.counts?.personnel ?? 0,
    geofences: detail.summary?.geofence_count ?? detail.counts?.geofences ?? detail.geofences?.length ?? 0,
  };
}

export function toOpPerson(p: PersonnelChoice): OpPerson {
  return {
    id: String(p.soldier_id),
    label: `S-${p.soldier_id}`,
    name: p.name || `S-${p.soldier_id}`,
    status: "active",
    position:
      p.lat != null && p.lon != null ? [p.lat, p.lon] : ([MAP_CENTER[0], MAP_CENTER[1]] as [number, number]),
  };
}

export function listItemToOperation(item: OperationListItem): Operation {
  return {
    id: item.id,
    operation_code: item.operation_code,
    name: item.name,
    description: item.description ?? "",
    status: item.status,
    type: item.type ?? "",
    startAt: item.start_at,
    endAt: item.end_at,
    groupIds: [],
    assignments: [],
    geofenceIds: [],
    alerts: { total: 0, critical: 0 },
    tickets: { total: 0, open: 0 },
    markers: [],
    group_count: item.group_count,
    personnel_count: item.personnel_count,
    geofence_count: item.geofence_count,
  };
}

export function detailToOperation(detail: OperationDetail): Operation {
  return {
    id: detail.id,
    operation_code: detail.operation_code,
    name: detail.name,
    description: detail.description ?? "",
    status: detail.status,
    type: detail.type ?? "",
    startAt: detail.start_at,
    endAt: detail.end_at,
    groupIds: detail.groups.map((g) => String(g.id)),
    assignments: detail.groups.map((g) => ({
      groupId: String(g.id),
      groupName: g.name,
      personIds: [],
      leaderId: g.leader_soldier_id != null ? String(g.leader_soldier_id) : null,
      existingGroupId: g.id,
    })),
    geofenceIds: detail.geofences.map((g) => String(g.id)),
    alerts: { total: 0, critical: 0 },
    tickets: { total: 0, open: 0 },
    markers: [],
    group_count: detail.summary?.group_count ?? detail.counts?.groups ?? detail.groups.length,
    personnel_count: detail.summary?.personnel_count ?? detail.counts?.personnel ?? 0,
    geofence_count: detail.summary?.geofence_count ?? detail.counts?.geofences ?? detail.geofences.length,
  };
}

/** Local datetime-local → ISO UTC for BE */
export function localInputToIso(value: string) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function isoToLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Normalize BE / map polygon payloads into a ring of [lng, lat] pairs. */
export function normalizeBePolygon(raw: unknown): [number, number][] {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const geo = value as { type?: string; coordinates?: unknown };
    if (geo.type === "Polygon" && Array.isArray(geo.coordinates)) {
      value = geo.coordinates[0];
    } else if (Array.isArray((value as { polygon?: unknown }).polygon)) {
      value = (value as { polygon: unknown }).polygon;
    }
  }
  if (!Array.isArray(value)) return [];
  const ring = value
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const a = Number(point[0]);
      const b = Number(point[1]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      return [a, b] as [number, number];
    })
    .filter((point): point is [number, number] => point != null);
  if (ring.length < 3) return [];
  // Drop closing duplicate if present.
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  if (firstLng === lastLng && firstLat === lastLat) ring.pop();
  return ring.length >= 3 ? ring : [];
}

/** BE polygon [lng,lat] → Leaflet [lat,lng] */
export function bePolygonToLatLng(polygon: [number, number][] | unknown): [number, number][] {
  const ring = normalizeBePolygon(polygon);
  if (!ring.length) return [];
  const [a, b] = ring[0];
  // Some older rows may already be Leaflet [lat,lng] (Jakarta lat≈-6, lng≈106).
  const alreadyLatLng = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) > 90;
  if (alreadyLatLng) {
    return ring.map(([lat, lng]) => [lat, lng] as [number, number]);
  }
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
}

/** Leaflet [lat,lng] → BE polygon [lng,lat] */
export function latLngToBePolygon(points: [number, number][]): [number, number][] {
  return points.map(([lat, lng]) => [lng, lat] as [number, number]);
}

export function draftToCreateBody(draft: OperationDraft): CreateOperationBody {
  const existingIds = draft.assignments
    .map((a) => a.existingGroupId)
    .filter((id): id is number => id != null);
  const inlineGroups = draft.assignments
    .filter((a) => a.existingGroupId == null && a.personIds.length > 0)
    .map((a) => ({
      name: a.groupName.trim() || "Group",
      member_soldier_ids: a.personIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
      ...(a.leaderId != null && Number.isFinite(Number(a.leaderId))
        ? { leader_soldier_id: Number(a.leaderId) }
        : {}),
    }))
    .filter((g) => g.member_soldier_ids.length > 0);

  const existingFenceIds = draft.geofences
    .map((g) => g.existingId)
    .filter((id): id is number => id != null);
  const newFences = draft.geofences
    .filter((g) => g.existingId == null && g.points.length >= 3)
    .map((g) => ({
      name: g.name.trim() || "Zone",
      kind: g.kind,
      color: g.color,
      polygon: latLngToBePolygon(g.points),
      area_km2: g.areaKm2,
    }));

  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    type: typeLabel(draft.type),
    start_at: localInputToIso(draft.startAt),
    end_at: localInputToIso(draft.endAt),
    ...(existingIds.length ? { group_ids: existingIds } : {}),
    ...(inlineGroups.length ? { groups: inlineGroups } : {}),
    ...(existingFenceIds.length ? { geofence_ids: existingFenceIds } : {}),
    ...(newFences.length ? { new_geofences: newFences } : {}),
  };
}

export function mapPayloadToMarkers(map: OperationMapPayload): OpMarker[] {
  return map.positions
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: String(p.soldier_id),
      label: `S-${p.soldier_id}`,
      position: [p.latitude as number, p.longitude as number] as [number, number],
      group: p.group_name ?? undefined,
      tone: "ok" as const,
    }));
}

export function mapPayloadToFences(map: OperationMapPayload): OpGeofence[] {
  return (map.geofences ?? [])
    .map((g) => {
      const kind = (g.kind === "restricted" || g.kind === "safe" ? g.kind : "recon") as FenceKind;
      const points = bePolygonToLatLng(g.polygon ?? []);
      if (points.length < 3) return null;
      return {
        id: String(g.id),
        name: g.name,
        kind,
        color: g.color || FENCE_COLORS[kind],
        // Map payload from BE is id/name/polygon only — estimate area client-side.
        areaKm2: estimatePolygonAreaKm2(points),
        points,
        existingId: g.id,
      } satisfies OpGeofence;
    })
    .filter((fence): fence is OpGeofence => fence != null);
}

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
    groupIds: [],
    assignments: [],
    geofences: [],
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

export function typeLabel(type: OperationType | string) {
  return OPERATION_TYPES.find((item) => item.id === type)?.label ?? type;
}

export function assignmentPersonCount(assignments: OpAssignment[]) {
  return assignments.reduce((sum, a) => sum + a.personIds.length, 0);
}

export function assignedPersonIds(assignments: OpAssignment[]) {
  return new Set(assignments.flatMap((a) => a.personIds));
}

export function resolveAssignments(
  assignments: OpAssignment[],
  people: OpPerson[],
  groups: OpGroup[] = [],
) {
  return assignments.map((assignment) => {
    const preset = groups.find((g) => g.id === assignment.groupId);
    const group: OpGroup = {
      id: assignment.groupId,
      name: assignment.groupName || preset?.name || "Group",
      personnel: assignment.personIds.length,
      online: 0,
      leader: "",
      status: preset?.status ?? "active",
    };
    const members = people.filter((p) => assignment.personIds.includes(p.id));
    const leader = people.find((p) => p.id === assignment.leaderId) ?? members[0] ?? null;
    group.leader = leader?.label ?? "—";
    group.online = members.filter((p) => p.status === "active").length;
    return { group, members, leader, online: group.online, assignment };
  });
}

export function mapSoldierMarkers(people: OpPerson[]): OpMarker[] {
  return people.map((person) => ({
    id: person.id,
    label: person.label,
    position: person.position,
    role: person.role === "danru" ? ("danru" as const) : undefined,
    tone:
      person.status === "critical" ? ("critical" as const) : person.status === "standby" ? ("idle" as const) : ("ok" as const),
  }));
}

export function markersFromAssignments(assignments: OpAssignment[], people: OpPerson[]): OpMarker[] {
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
