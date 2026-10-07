import { readSessionId } from "@/lib/session";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "CLEARED";
export type AlertType =
  | "SOS"
  | "CASUALTY"
  | "ARRHYTHMIA"
  | "LOW_BATTERY"
  | "HEAT_STRESS"
  | "STRAP_DISCONNECTED"
  | "NO_CONTACT";

export type AlertDetails = {
  seq?: number;
  hr?: number;
  hrv?: number;
  spo2?: number;
  temp?: number;
  batt?: number;
  flags?: Record<string, unknown>;
};

export type AlertRecord = {
  id: number;
  alert_code: string;
  alert_type: AlertType | string;
  severity: AlertSeverity | string;
  status: AlertStatus | string;
  entity_type: string | null;
  entity_id: string | null;
  soldier_id: number | null;
  group_id: string | null;
  gateway_id: string | null;
  source_record_id: number | null;
  event_time: string;
  first_seen_at: string;
  last_seen_at: string;
  position_source: string | null;
  latitude: number | null;
  longitude: number | null;
  message: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  derived_from: string | null;
  record_origin: string | null;
  created_at: string;
  updated_at: string;
  details: AlertDetails | null;
  source_record: Record<string, unknown> | null;
};

export type AlertList = {
  items: AlertRecord[];
  limit: number;
  offset: number;
  count: number;
  total: number;
};

export type AlertSummary = {
  total: number;
  timeline: { time: string; count: number }[];
  by_severity: { severity: string; count: number }[];
  by_type: { alert_type: string; count: number }[];
};

export type AlertOptions = {
  alert_types: string[];
  severities: string[];
  statuses: string[];
  groups: string[];
  gateways: string[];
  derived_from: string[];
  record_origins: string[];
  time_ranges: string[];
};

export type AlertQuery = {
  q?: string;
  alert_type?: string[];
  severity?: string[];
  status?: string;
  soldier_id?: number;
  group_id?: string[];
  gateway_id?: string;
  from_time?: string;
  to_time?: string;
  timeRange?: string;
  limit?: number;
  offset?: number;
};

export const ALERT_TYPES: AlertType[] = [
  "SOS",
  "CASUALTY",
  "ARRHYTHMIA",
  "LOW_BATTERY",
  "HEAT_STRESS",
  "STRAP_DISCONNECTED",
  "NO_CONTACT",
];

export const ALERT_SEVERITIES: AlertSeverity[] = ["CRITICAL", "WARNING", "INFO"];

const TYPE_LABEL: Record<string, string> = {
  SOS: "SOS",
  CASUALTY: "Casualty",
  ARRHYTHMIA: "Arrhythmia",
  LOW_BATTERY: "Low Battery",
  HEAT_STRESS: "Heat Stress",
  STRAP_DISCONNECTED: "Strap Disconnected",
  NO_CONTACT: "No Contact",
};

const TITLE: Record<string, string> = {
  SOS: "SOS Signal Received",
  CASUALTY: "Casualty Alert",
  ARRHYTHMIA: "Arrhythmia Detected",
  LOW_BATTERY: "Low Battery Warning",
  HEAT_STRESS: "Heat Stress Warning",
  STRAP_DISCONNECTED: "Strap Disconnected",
  NO_CONTACT: "No Contact",
};

export function alertTypeLabel(value: string) {
  return TYPE_LABEL[value] ?? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function alertTitle(value: string) {
  return TITLE[value] ?? alertTypeLabel(value);
}

export function severityLabel(value: string) {
  const text = value.toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function statusLabel(value: string) {
  const text = value.toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toAlertParams(query: AlertQuery) {
  const params = new URLSearchParams();
  const append = (key: string, value?: string | number | string[]) => {
    if (value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    params.set(key, String(value));
  };
  append("q", query.q);
  append("alert_type", query.alert_type);
  append("severity", query.severity);
  append("status", query.status);
  append("soldier_id", query.soldier_id);
  append("group_id", query.group_id);
  append("gateway_id", query.gateway_id);
  append("from_time", query.from_time);
  append("to_time", query.to_time);
  append("timeRange", query.timeRange);
  append("limit", query.limit);
  append("offset", query.offset);
  return params;
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    if (body.error) return body.error;
    if (body.detail) return typeof body.detail === "string" ? body.detail : "Request failed";
  } catch {
    /* not json */
  }
  if (response.status === 401) return "Login required";
  if (response.status === 409) return "This alert can no longer be changed";
  return `Request failed (${response.status})`;
}

function authHeaders(required = true): HeadersInit {
  const session = readSessionId();
  if (!session) {
    if (required) throw new Error("Login required");
    return {};
  }
  return { Authorization: `Bearer ${session}` };
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    signal,
    cache: "no-store",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export function listAlerts(query: AlertQuery, signal?: AbortSignal) {
  return getJson<AlertList>(`/api/alerts?${toAlertParams(query)}`, signal);
}

export function summarizeAlerts(query: Omit<AlertQuery, "limit" | "offset">, signal?: AbortSignal) {
  return getJson<AlertSummary>(`/api/alerts/summary?${toAlertParams(query)}`, signal);
}

export function alertOptions(signal?: AbortSignal) {
  return getJson<AlertOptions>("/api/alerts/filters/options", signal);
}

export function listOpenSos(signal?: AbortSignal) {
  return getJson<AlertList | AlertRecord[]>("/api/alerts/sos", signal);
}

export function readAlert(id: number, signal?: AbortSignal) {
  return getJson<AlertRecord>(`/api/alerts/${id}`, signal);
}

async function postAlert(path: string, body?: unknown) {
  const headers: Record<string, string> = {
    ...(authHeaders() as Record<string, string>),
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json().catch(() => null);
}

/** BE fills acknowledged_by from the session user — no body. */
export function acknowledgeAlert(id: number) {
  return postAlert(`/api/alerts/${id}/acknowledge`);
}

/** BE fills resolved_by from the session user — no body. */
export function resolveAlert(id: number) {
  return postAlert(`/api/alerts/${id}/resolve`);
}

export function createAlertTicket(id: number) {
  return postAlert(`/api/alerts/${id}/ticket`);
}

export function formatAlertDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: iso, time: "" };
  return {
    date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

export function formatSeen(iso: string) {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return "—";
  const minutes = Math.round((Date.now() - stamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function soldierLabel(alert: AlertRecord) {
  if (alert.soldier_id != null) return `S-${String(alert.soldier_id).padStart(2, "0")}`;
  return alert.entity_id ?? "—";
}

export function coordLabel(alert: AlertRecord) {
  if (alert.latitude == null || alert.longitude == null) return "—";
  return `${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}`;
}

export function closedStatus(status: string) {
  return status === "RESOLVED" || status === "CLEARED";
}
