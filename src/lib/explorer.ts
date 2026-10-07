import type { ChartBucket } from "@/app/(platform)/explorer/components/explorer-chart";

/**
 * Types mirror be-nest ExplorerController + DatabaseService.recordToApi().
 * PUBLIC_FIELDS + enrichment `personnel_name` + parsed `data`.
 */

export type ExplorerCategory = "TELEMETRY" | "MESH" | "UPLINK" | "BEACON" | "SPECIAL" | "SYSTEM";

/** be-nest mesh/frame.ts decodeFlags() */
export type TelemetryFlags = {
  raw: number;
  sos: boolean;
  casualty: boolean;
  arrhythmia: boolean;
  position_source: string;
  strap_connected: boolean;
  low_battery: boolean;
  heat_stress: boolean;
};

/** be-nest soldierPayloadAsData() / telemetryData() */
export type SoldierTelemetryData = {
  soldier_id: number;
  seq: number;
  timestamp: number;
  lat: number;
  lon: number;
  hr: number;
  hrv: number;
  spo2: number;
  temp: number;
  batt: number;
  flags: TelemetryFlags;
  /** Present when strap_connected is false */
  vital?: string;
  burst_id?: string;
  burst_record_id?: number;
  burst_index?: number;
};

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
  /** ExplorerController.toApi() enrichment from personnel master */
  personnel_name: string | null;
  data: SoldierTelemetryData | Record<string, unknown>;
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
  /** be-nest TIME_RANGES */
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
  /** be-nest: only `all` | `30d` */
  timeRange?: string;
  include_transport?: string | number;
  limit?: number;
  offset?: number;
};

/** Matches be-nest TIME_RANGES */
export const EXPLORER_TIME_PRESETS = ["30d", "all"] as const;
export type ExplorerTimePreset = (typeof EXPLORER_TIME_PRESETS)[number];

const DEFAULT_CATEGORY = "TELEMETRY";

export function titleize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function categoryLabel(category: string) {
  return titleize(category);
}

export function toSearchParams(query: ExplorerQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}

/**
 * Parse search box into BE query params.
 * Exact soldier tokens → soldier_id; otherwise free-text `q`
 * (BE also searches personnel.name via EXISTS).
 */
export function parseExplorerSearch(raw: string): { q?: string; soldier_id?: number } {
  const text = raw.trim();
  if (!text) return {};

  const soldierMatch = text.match(/^(?:s[\s\-_]*)?(\d{1,6})$/i);
  if (soldierMatch) return { soldier_id: Number(soldierMatch[1]) };

  return { q: text };
}

/** Lean UI query — category defaults to TELEMETRY on BE even if omitted. */
export function buildExplorerQuery(input: {
  search?: string;
  timePreset?: string;
  limit?: number;
  offset?: number;
}): ExplorerQuery {
  const { q, soldier_id } = parseExplorerSearch(input.search ?? "");
  const preset = input.timePreset && EXPLORER_TIME_PRESETS.includes(input.timePreset as ExplorerTimePreset)
    ? input.timePreset
    : "30d";

  return {
    category: DEFAULT_CATEGORY,
    ...(q ? { q } : {}),
    ...(soldier_id != null ? { soldier_id } : {}),
    timeRange: preset,
    ...(input.limit != null ? { limit: input.limit } : {}),
    ...(input.offset != null ? { offset: input.offset } : {}),
  };
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    /* not json */
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
  return (await response.json()) as ExplorerRecord;
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

export function formatChartTick(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export function formatBytes(bytes: number | null | undefined) {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function rangeLabel(value: string) {
  if (value === "all") return "All time";
  if (value === "30d") return "Last 30 Days";
  return value;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function asBool(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function soldierIdLabel(record: ExplorerRecord) {
  if (record.soldier_id != null) return `S-${record.soldier_id}`;
  if (record.entity_id) return record.entity_id.startsWith("S-") ? record.entity_id : `S-${record.entity_id}`;
  return "—";
}

export function groupLabel(record: ExplorerRecord) {
  return record.group_id?.trim() || "—";
}

export function personnelName(record: ExplorerRecord) {
  if (typeof record.personnel_name === "string" && record.personnel_name.trim()) {
    return record.personnel_name.trim();
  }
  return "—";
}

/** Alias kept for older call sites */
export function entityLabel(record: ExplorerRecord) {
  return soldierIdLabel(record);
}

export function payloadSize(record: ExplorerRecord) {
  return record.raw_bytes_length;
}

/** Short summary for dashboard log rows — derived only from BE fields. */
export function recordSummary(record: ExplorerRecord) {
  const data = record.data as Partial<SoldierTelemetryData>;
  if (record.data_type === "SOLDIER_TELEMETRY" || record.category === "TELEMETRY") {
    const parts = [
      record.position_source ?? data.flags?.position_source,
      data.hr != null ? `${data.hr} bpm` : null,
      data.vital ?? null,
    ].filter(Boolean);
    return parts.join(" · ") || record.data_type;
  }
  return record.data_type || titleize(record.category);
}

/** Latest map pin per soldier — built from newest-first explorer TELEMETRY rows. */
export type LiveSoldierPin = {
  soldierId: number;
  label: string;
  position: [number, number];
  group: string | null;
  tone: "ok" | "warn" | "critical";
  eventTime: string;
  telemetry: SoldierTelemetryData;
  positionSource: string | null;
  severity: string | null;
};

export function telemetryTone(data: SoldierTelemetryData, severity?: string | null): LiveSoldierPin["tone"] {
  if (data.flags.sos || data.flags.casualty || severity === "CRITICAL") return "critical";
  if (
    data.flags.low_battery ||
    data.flags.heat_stress ||
    data.flags.arrhythmia ||
    severity === "WARNING" ||
    severity === "HIGH"
  ) {
    return "warn";
  }
  return "ok";
}

/** Collapse explorer list (newest first) → one live pin per soldier_id. */
export function latestPinsFromExplorer(records: ExplorerRecord[]): LiveSoldierPin[] {
  const bySoldier = new Map<number, LiveSoldierPin>();
  for (const record of records) {
    const sid = record.soldier_id;
    if (sid == null || bySoldier.has(sid)) continue;
    const data = decodeTelemetry(record);
    if (!data) continue;
    if (!Number.isFinite(data.lat) || !Number.isFinite(data.lon)) continue;
    if (data.lat === 0 && data.lon === 0) continue;

    bySoldier.set(sid, {
      soldierId: sid,
      label: String(sid),
      position: [data.lat, data.lon],
      group: record.group_id?.trim() || null,
      tone: telemetryTone(data, record.severity),
      eventTime: record.event_time,
      telemetry: data,
      positionSource: record.position_source,
      severity: record.severity,
    });
  }
  return [...bySoldier.values()].sort((a, b) => a.soldierId - b.soldierId);
}

/** Read SOLDIER_TELEMETRY `data` exactly as BE stores it. */
export function decodeTelemetry(record: ExplorerRecord): SoldierTelemetryData | null {
  const data = record.data ?? {};
  const flagsRaw = (data as { flags?: Record<string, unknown> }).flags;
  if (!flagsRaw || typeof flagsRaw !== "object") {
    // Non-telemetry or incomplete payload — still surface numeric fields if present
    const lat = asNumber((data as { lat?: unknown }).lat);
    const lon = asNumber((data as { lon?: unknown }).lon);
    if (lat == null && lon == null && asNumber((data as { hr?: unknown }).hr) == null) return null;
  }

  const flagsObj = (flagsRaw ?? {}) as Record<string, unknown>;
  const flags: TelemetryFlags = {
    raw: asNumber(flagsObj.raw) ?? 0,
    sos: asBool(flagsObj.sos),
    casualty: asBool(flagsObj.casualty),
    arrhythmia: asBool(flagsObj.arrhythmia),
    position_source:
      typeof flagsObj.position_source === "string"
        ? flagsObj.position_source
        : record.position_source ?? "GNSS",
    strap_connected: asBool(flagsObj.strap_connected),
    low_battery: asBool(flagsObj.low_battery),
    heat_stress: asBool(flagsObj.heat_stress),
  };

  const vital = (data as { vital?: unknown }).vital;
  const decoded: SoldierTelemetryData = {
    soldier_id: asNumber((data as { soldier_id?: unknown }).soldier_id) ?? record.soldier_id ?? 0,
    seq: asNumber((data as { seq?: unknown }).seq) ?? 0,
    timestamp: asNumber((data as { timestamp?: unknown }).timestamp) ?? 0,
    lat: asNumber((data as { lat?: unknown }).lat) ?? 0,
    lon: asNumber((data as { lon?: unknown }).lon) ?? 0,
    hr: asNumber((data as { hr?: unknown }).hr) ?? 0,
    hrv: asNumber((data as { hrv?: unknown }).hrv) ?? 0,
    spo2: asNumber((data as { spo2?: unknown }).spo2) ?? 0,
    temp: asNumber((data as { temp?: unknown }).temp) ?? 0,
    batt: asNumber((data as { batt?: unknown }).batt) ?? 0,
    flags,
  };
  if (typeof vital === "string") decoded.vital = vital;
  const burstId = (data as { burst_id?: unknown }).burst_id;
  if (typeof burstId === "string") decoded.burst_id = burstId;
  const burstRecordId = asNumber((data as { burst_record_id?: unknown }).burst_record_id);
  if (burstRecordId != null) decoded.burst_record_id = burstRecordId;
  const burstIndex = asNumber((data as { burst_index?: unknown }).burst_index);
  if (burstIndex != null) decoded.burst_index = burstIndex;
  return decoded;
}

/** Top-level packet metadata from BE public fields (no invented keys). */
export function packetFields(record: ExplorerRecord) {
  return {
    id: record.id,
    category: record.category,
    data_type: record.data_type,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    soldier_id: record.soldier_id,
    group_id: record.group_id,
    gateway_id: record.gateway_id,
    event_time: record.event_time,
    received_at: record.received_at,
    position_source: record.position_source,
    transport: record.transport,
    freshness: record.freshness,
    severity: record.severity,
    record_origin: record.record_origin,
    raw_format: record.raw_format,
    raw_hex: record.raw_hex,
    raw_bytes_length: record.raw_bytes_length,
    created_at: record.created_at,
  };
}

export function timelineChart(timeline: ExplorerTimelineBucket[], intervalMs = 60 * 60 * 1000): ChartBucket[] {
  // BE summary buckets are already hourly (substr event_time, 1, 13).
  // Optional client rebucket only merges those aggregates — never re-fetches list rows.
  const totals = new Map<number, number>();
  for (const bucket of timeline) {
    const stamp = Date.parse(bucket.time);
    if (Number.isNaN(stamp)) continue;
    const key = Math.floor(stamp / intervalMs) * intervalMs;
    totals.set(key, (totals.get(key) ?? 0) + (bucket.count || 0));
  }
  return [...totals.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, count]) => ({
      time,
      label: formatChartTick(new Date(time).toISOString()),
      count,
    }));
}
