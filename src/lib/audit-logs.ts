export type AuditActor = {
  id: number | string | null;
  name: string | null;
  role: string | null;
};

export type AuditTarget = {
  id: string | null;
  name: string | null;
  type: string | null;
};

export type AuditListItem = {
  eventId: string;
  timestamp: string;
  event: string;
  category: string;
  actor: AuditActor;
  target: AuditTarget;
  action: string;
  outcome: string;
  description: string;
};

export type AuditList = {
  items: AuditListItem[];
  total: number;
  page: number;
  limit: number;
};

export type AuditSummary = {
  total_activities: number;
  user_actions: number;
  system_actions: number;
  failed_actions: number;
};

export type AuditCategory = {
  code: string;
  name: string;
  count: number;
};

export type AuditDetail = {
  eventId: string;
  timestamp: string;
  actor: AuditActor;
  actorType: string | null;
  category: string;
  eventType: string;
  action: string;
  target: AuditTarget;
  outcome: string;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
};

export type AuditQuery = {
  page?: number;
  limit?: number;
  timeRange?: string;
  from_time?: string;
  to_time?: string;
  search?: string;
  action?: string;
  category?: string;
  outcome?: string;
  actor?: string;
  resource?: string;
  ip?: string;
  userId?: string;
};

export const AUDIT_ACTIONS = [
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
  "ASSIGN",
  "REVOKE",
  "ACKNOWLEDGE",
  "RESOLVE",
  "EXPORT",
  "LOGIN",
  "LOGOUT",
  "ACCESS",
] as const;

export const AUDIT_TIME_RANGES = [
  { value: "", label: "All time" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const;

export function auditLabel(value: string | null | undefined) {
  if (!value) return "—";
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function auditClass(value: string | null | undefined) {
  return auditLabel(value).toLowerCase().replaceAll(" ", "-");
}

export function formatAuditStamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: iso, time: "", full: iso };
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(2);
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const full = date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return { date: `${month}/${day}/${year}`, time, full };
}

export function toAuditParams(query: AuditQuery) {
  const params = new URLSearchParams();
  const append = (key: string, value?: string | number) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  };
  append("page", query.page);
  append("limit", query.limit);
  append("timeRange", query.timeRange);
  append("from_time", query.from_time);
  append("to_time", query.to_time);
  append("search", query.search);
  append("action", query.action);
  append("category", query.category);
  append("outcome", query.outcome);
  append("actor", query.actor);
  append("resource", query.resource);
  append("ip", query.ip);
  append("userId", query.userId);
  return params;
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    if (body.error) return body.error;
    if (typeof body.detail === "string") return body.detail;
  } catch {
    /* not json */
  }
  if (response.status === 401) return "Login required";
  return `Request failed (${response.status})`;
}

async function getJson<T>(path: string, signal?: AbortSignal, auth = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) {
    const session = window.localStorage.getItem("session_id");
    if (!session) throw new Error("Login required to view your activity");
    headers.Authorization = `Bearer ${session}`;
  }
  const response = await fetch(path, { signal, headers, cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export function listAuditLogs(query: AuditQuery, signal?: AbortSignal) {
  return getJson<AuditList>(`/api/audit-logs?${toAuditParams(query)}`, signal);
}

export function summarizeAuditLogs(signal?: AbortSignal) {
  return getJson<AuditSummary>("/api/audit-logs/summary", signal);
}

export function auditCategories(signal?: AbortSignal) {
  return getJson<{ categories: AuditCategory[] }>("/api/audit-logs/categories", signal);
}

export function readAuditLog(eventId: string, signal?: AbortSignal) {
  return getJson<AuditDetail>(`/api/audit-logs/${encodeURIComponent(eventId)}`, signal);
}

export function listMyAuditLogs(query: Pick<AuditQuery, "page" | "limit"> = {}, signal?: AbortSignal) {
  return getJson<AuditList>(`/api/audit-logs/me?${toAuditParams(query)}`, signal, true);
}
