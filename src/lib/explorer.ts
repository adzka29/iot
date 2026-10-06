import type { ChartBucket } from "@/app/(platform)/explorer/components/explorer-chart";

export type ExplorerCategory = "TELEMETRY" | "MESH" | "UPLINK" | "BEACON" | "SPECIAL" | "SYSTEM";

export type ExplorerRecord = {
  id: number;
  category: ExplorerCategory | string;
  data_type: string;
  entity_type: string | null;
  entity_id: string | null;
  soldier_id: number | null;
  group_id: string | null;
  gateway_id: string | null;
  event_time: string;
  received_at: string;
  position_source: string | null;
  transport: string | null;
  freshness: string | null;
  severity: string | null;
  record_origin: string | null;
  raw_format: string | null;
  raw_hex: string | null;
  raw_bytes_length: number | null;
  created_at: string;
  data: Record<string, unknown>;
};

export type ExplorerList = {
  items: ExplorerRecord[];
  limit: number;
  offset: number;
  count: number;
  total: number;
};

export type ExplorerTimelineBucket = {
  time: string;
  count: number;
  segments: { category: string; count: number }[];
};

export type ExplorerSummary = {
  total: number;
  timeline: ExplorerTimelineBucket[];
  by_category: { category: string; count: number }[];
  by_data_type: { data_type: string; count: number }[];
};

export type ExplorerOptions = {
  categories: string[];
  data_types: string[];
  entity_types: string[];
  groups: string[];
  gateways: string[];
  position_sources: string[];
  transports: string[];
  freshness: string[];
  severity: string[];
  record_origins: string[];
  raw_formats: string[];
  time_ranges: string[];
};

export type ExplorerQuery = {
  q?: string;
  category?: string;
  data_type?: string;
  entity_type?: string;
  entity_id?: string;
  soldier_id?: number;
  group_id?: string;
  gateway_id?: string;
  position_source?: string;
  transport?: string;
  freshness?: string;
  severity?: string;
  record_origin?: string;
  raw_format?: string;
  from_time?: string;
  to_time?: string;
  timeRange?: string;
  limit?: number;
  offset?: number;
};

const CATEGORY_LEVEL = {
  TELEMETRY: "Telemetry",
  MESH: "Mesh",
  UPLINK: "Uplink",
  BEACON: "Beacon",
  SPECIAL: "Special",
  SYSTEM: "System",
} as const;

type LevelName = (typeof CATEGORY_LEVEL)[keyof typeof CATEGORY_LEVEL];

export function categoryLabel(category: string) {
  return CATEGORY_LEVEL[category as keyof typeof CATEGORY_LEVEL] ?? titleize(category);
}

export function titleize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function entityTypeLabel(value: string) {
  if (value === "SOLDIER") return "Personnel";
  return titleize(value);
}

export function toSearchParams(query: ExplorerQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    /* response was not JSON */
  }
  return `Request failed (${response.status})`;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export function listExplorer(query: ExplorerQuery, signal?: AbortSignal) {
  return getJson<ExplorerList>(`/api/explorer?${toSearchParams(query)}`, signal);
}

export function summarizeExplorer(query: Omit<ExplorerQuery, "limit" | "offset">, signal?: AbortSignal) {
  return getJson<ExplorerSummary>(`/api/explorer/summary?${toSearchParams(query)}`, signal);
}

export function explorerOptions(signal?: AbortSignal) {
  return getJson<ExplorerOptions>("/api/explorer/filters/options", signal);
}

export async function readExplorer(id: number, signal?: AbortSignal) {
  const response = await fetch(`/api/explorer/${id}`, { signal, cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readError(response));
  return stripHidden(await response.json()) as ExplorerRecord;
}

export async function downloadExplorerCsv(query: Omit<ExplorerQuery, "limit" | "offset">) {
  const response = await fetch(`/api/explorer/export.csv?${toSearchParams(query)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "explorer.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function stripHidden<T extends { data?: Record<string, unknown> }>(record: T) {
  const copy = { ...record } as T & { is_sos?: unknown; beacon_id?: unknown };
  delete copy.is_sos;
  delete copy.beacon_id;
  return copy;
}

export function formatEventTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function entityLabel(record: ExplorerRecord) {
  if (record.entity_id) return record.entity_id;
  if (record.soldier_id != null) return `P-${record.soldier_id}`;
  return "—";
}

export function recordSummary(record: ExplorerRecord) {
  const data = record.data ?? {};
  if (record.category === "TELEMETRY") {
    const flags = data.flags as { position_source?: string } | undefined;
    const source = record.position_source ?? flags?.position_source;
    const vital = typeof data.vital === "string" ? data.vital : null;
    return [source, vital].filter(Boolean).join(" · ") || "Telemetry";
  }
  if (record.category === "MESH") return `TTL ${data.ttl ?? "—"} · hop ${data.hop_count ?? "—"}`;
  if (record.category === "UPLINK") return `${data.packet_count ?? "—"} packets · ${data.payload_size_bytes ?? "—"} B`;
  if (record.category === "BEACON") return data.rssi != null ? `${data.rssi} dBm` : "Beacon";
  if (record.category === "SPECIAL") return String(data.special_type ?? titleize(record.data_type));
  if (record.category === "SYSTEM") return String(data.event_type ?? titleize(record.data_type));
  return titleize(record.data_type);
}

export function communicationBody(record: ExplorerRecord) {
  const data = record.data ?? {};
  if (record.category === "UPLINK") return data;
  return {
    transport: record.transport,
    position_source: record.position_source,
    freshness: record.freshness,
    severity: record.severity,
    record_origin: record.record_origin,
    gateway_id: record.gateway_id,
    group_id: record.group_id,
  };
}

export function timelineChart(timeline: ExplorerTimelineBucket[]): ChartBucket[] {
  return timeline.map((bucket) => {
    const row: ChartBucket = {
      time: Date.parse(bucket.time),
      label: formatEventTime(bucket.time),
      Mesh: 0,
      Telemetry: 0,
      Beacon: 0,
      System: 0,
      Special: 0,
      Uplink: 0,
    };
    for (const segment of bucket.segments) {
      const level = CATEGORY_LEVEL[segment.category as keyof typeof CATEGORY_LEVEL] as LevelName | undefined;
      if (level) row[level] += segment.count;
    }
    return row;
  });
}

export function categoryCounts(summary: ExplorerSummary | null) {
  const counts: Record<LevelName, number> = {
    Mesh: 0,
    Telemetry: 0,
    Beacon: 0,
    System: 0,
    Special: 0,
    Uplink: 0,
  };
  for (const row of summary?.by_category ?? []) {
    const level = CATEGORY_LEVEL[row.category as keyof typeof CATEGORY_LEVEL];
    if (level) counts[level] = row.count;
  }
  return counts;
}
