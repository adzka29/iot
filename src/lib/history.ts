import { readSessionId } from "@/lib/session";

/**
 * Types mirror be-nest HistoryController item/detail/track/summary/options.
 * Operational History domain = TELEMETRY only.
 */

export type HistoryScope = "SOLDIER" | "GROUP";

export type HistoryItem = {
  id: string;
  source_type: string;
  source_id: number;
  event_time: string;
  received_at: string;
  /** History maps category → label (TELEMETRY), not DB SOLDIER_TELEMETRY */
  data_type: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  soldier_id: number | null;
  group_id: string | null;
  gateway_id: string | null;
  position_source: string | null;
  latitude: number | null;
  longitude: number | null;
  transport?: string | null;
};

export type HistoryPointDetail = HistoryItem & {
  details: {
    position: {
      latitude: number | null;
      longitude: number | null;
      position_source: string | null;
    };
    vitals: {
      hr?: number | null;
      hrv?: number | null;
      spo2?: number | null;
      temp?: number | null;
    };
    device: {
      batt?: number | null;
      flags?: Record<string, unknown>;
    };
    packet_reference: {
      transport: string | null;
      gateway_id: string | null;
      seq: number | null;
      burst_id: string | null;
      burst_index: number | null;
    };
    timing: {
      event_time: string;
      received_at: string;
    };
    raw_data: {
      raw_hex: string | null;
      raw_format: string | null;
      raw_bytes_length: number | null;
    };
  };
};

export type HistoryList = {
  items: HistoryItem[];
  limit: number;
  offset: number;
  count: number;
  total: number;
};

export type HistoryTrackPoint = {
  id: string;
  source_id: number;
  soldier_id: number | null;
  event_time: string;
  latitude: number;
  longitude: number;
  position_source: string | null;
};

export type HistoryTrack = {
  points: HistoryTrackPoint[];
};

export type HistorySummary = {
  cards: {
    total_distance_km: number;
    distance_is_derived: boolean;
    heart_rate_avg_bpm: number | null;
    battery_avg_percent: number | null;
    total_records: number;
    telemetry_count: number;
  };
};

export type HistoryStatistics = {
  telemetry_count: number;
  total_records: number;
  position_points: number;
  soldiers: number;
  by_position_source: { name: string; count: number }[];
  by_soldier: { soldier_id: number; count: number }[];
};

export type HistoryChartBucket = {
  time: string;
  heart_rate_avg_bpm: number | null;
  battery_avg_percent: number | null;
  samples: number;
};

export type HistoryCharts = {
  buckets: HistoryChartBucket[];
};

export type HistoryOptions = {
  data_types: string[];
  position_sources: string[];
  soldiers: number[];
  groups: string[];
  time_ranges: string[];
};

export type HistoryQuery = {
  scope: HistoryScope;
  soldier_id?: number;
  group_id?: string;
  /** Operational FE: TELEMETRY only */
  history_data_type?: string | string[];
  position_source?: string | string[];
  timeRange?: string;
  from_time?: string;
  to_time?: string;
  limit?: number;
  offset?: number;
};

function authHeaders(): HeadersInit {
  const session = readSessionId();
  if (!session) throw new Error("Login required");
  return { Authorization: `Bearer ${session}` };
}

export function toHistoryParams(query: HistoryQuery) {
  const params = new URLSearchParams();
  params.set("scope", query.scope);
  if (query.soldier_id != null) params.set("soldier_id", String(query.soldier_id));
  if (query.group_id) params.set("group_id", query.group_id);
  if (query.timeRange) params.set("timeRange", query.timeRange);
  if (query.from_time) params.set("from_time", query.from_time);
  if (query.to_time) params.set("to_time", query.to_time);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));

  const dataTypes = Array.isArray(query.history_data_type)
    ? query.history_data_type
    : query.history_data_type
      ? [query.history_data_type]
      : [];
  for (const value of dataTypes) params.append("history_data_type", value);

  const sources = Array.isArray(query.position_source)
    ? query.position_source
    : query.position_source
      ? [query.position_source]
      : [];
  for (const value of sources) params.append("position_source", value);

  return params;
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string; detail?: string; message?: string };
    if (body.error) return body.error;
    if (typeof body.detail === "string") return body.detail;
    if (body.message) return body.message;
  } catch {
    /* not json */
  }
  if (response.status === 401) return "Login required";
  if (response.status === 403) return "Permission denied";
  return `Request failed (${response.status})`;
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

export function listHistory(query: HistoryQuery, signal?: AbortSignal) {
  return getJson<HistoryList>(`/api/history?${toHistoryParams(query)}`, signal);
}

export function historyOptions(query: HistoryQuery, signal?: AbortSignal) {
  return getJson<HistoryOptions>(`/api/history/filters/options?${toHistoryParams(query)}`, signal);
}

export function summarizeHistory(query: HistoryQuery, signal?: AbortSignal) {
  return getJson<HistorySummary>(`/api/history/summary?${toHistoryParams(query)}`, signal);
}

export function historyStatistics(query: HistoryQuery, signal?: AbortSignal) {
  return getJson<HistoryStatistics>(`/api/history/statistics?${toHistoryParams(query)}`, signal);
}

export function historyCharts(query: HistoryQuery, signal?: AbortSignal) {
  return getJson<HistoryCharts>(`/api/history/charts?${toHistoryParams(query)}`, signal);
}

export function listHistoryTrack(query: HistoryQuery, signal?: AbortSignal) {
  return getJson<HistoryTrack>(`/api/history/track?${toHistoryParams(query)}`, signal);
}

export function readHistoryPoint(recordId: number, signal?: AbortSignal) {
  return getJson<HistoryPointDetail>(`/api/history/point/${recordId}`, signal);
}

export async function downloadHistoryCsv(query: HistoryQuery) {
  const response = await fetch(`/api/history/export.csv?${toHistoryParams(query)}`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "history.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function titleizeHistory(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatHistoryTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function formatHistoryClock(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function soldierHistoryLabel(soldierId: number | null | undefined) {
  if (soldierId == null) return "—";
  return `S-${soldierId}`;
}

export function positionSourceColor(source: string | null | undefined) {
  const key = (source ?? "").toUpperCase();
  if (key === "GNSS") return "#4ade80";
  if (key === "DEAD_RECKONING") return "#60a5fa";
  if (key === "TRILATERATION") return "#f59e0b";
  if (key === "STALE") return "#94a3b8";
  return "#38bdf8";
}

/** Keep map/playback responsive — BE track can be thousands of points. */
export function downsampleTrackPoints(
  points: HistoryTrackPoint[],
  maxPoints = 400,
  keepSourceId?: number | null,
): HistoryTrackPoint[] {
  if (points.length <= maxPoints) return points;
  const picked = new Map<number, HistoryTrackPoint>();
  const last = maxPoints - 1;
  for (let i = 0; i <= last; i += 1) {
    const idx = Math.round((i * (points.length - 1)) / last);
    const point = points[idx];
    picked.set(point.source_id, point);
  }
  if (keepSourceId != null) {
    const keep = points.find((point) => point.source_id === keepSourceId);
    if (keep) picked.set(keep.source_id, keep);
  }
  return [...picked.values()].sort((a, b) =>
    a.event_time === b.event_time
      ? a.source_id - b.source_id
      : a.event_time < b.event_time
        ? -1
        : 1,
  );
}
