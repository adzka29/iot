export type AccessUser = {
  id: number;
  identity_type: string;
  name: string;
  username: string;
  email: string;
  department: string | null;
  verification: string;
  status: string;
  access_binding: string;
};

export type UserSummary = {
  total_humans: number;
  active_humans: number;
  inactive_humans: number;
  total_services: number;
  pending_verification: number;
};

export type AccessRole = {
  id: number;
  name: string;
  display_name: string;
  duty_category: string;
  description: string;
  privilege_narrative: string;
  least_privilege_baseline: string;
  is_system: boolean;
  is_protected: boolean;
  assigned_users: number;
};

export type RoleSummary = {
  total: number;
  system_roles: number;
  protected_roles: number;
  custom_roles: number;
};

export type AccessBinding = {
  id: number;
  user_id: number;
  role_id: number;
  role: string;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  description: string | null;
  access_binding: string;
  user_status: string;
};

export type EffectiveAccess = {
  user_id: number;
  binding_id: number | null;
  binding_status: string | null;
  role_id: number | null;
  role: string | null;
  permissions: string[];
};

export type UserQuery = {
  page?: number;
  limit?: number;
  q?: string;
  identity_type?: string;
  status?: string;
  verification?: string;
  access_binding?: string;
};

export function accessLabel(value: string | null | undefined) {
  if (!value) return "—";
  if (value === "BOUND") return "Bound";
  if (value === "NO_BINDING") return "Unbound";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function bindingPeriod(row: Pick<AccessBinding, "valid_from" | "valid_until">) {
  if (!row.valid_from && !row.valid_until) return "Open-ended";
  const stamp = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${row.valid_from ? stamp(row.valid_from) : "…"} – ${row.valid_until ? stamp(row.valid_until) : "…"}`;
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
  if (response.status === 403) return "This role can't be changed";
  if (response.status === 409) return "That record already exists";
  return `Request failed (${response.status})`;
}

async function send<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { ...init, signal, cache: "no-store" });
  if (response.status === 204) return undefined as T;
  if (!response.ok) throw new Error(await readError(response));
  if (response.headers.get("content-length") === "0") return undefined as T;
  return (await response.json()) as T;
}

function userParams(query: UserQuery) {
  const params = new URLSearchParams();
  const append = (key: string, value?: string | number) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  };
  append("page", query.page);
  append("limit", query.limit);
  append("q", query.q);
  append("identity_type", query.identity_type);
  append("status", query.status);
  append("verification", query.verification);
  append("access_binding", query.access_binding);
  return params;
}

export function listUsers(query: UserQuery, signal?: AbortSignal) {
  return send<{ items: AccessUser[]; total: number; page: number; limit: number }>(`/api/users?${userParams(query)}`, undefined, signal);
}

export function summarizeUsers(signal?: AbortSignal) {
  return send<UserSummary>("/api/users/summary", undefined, signal);
}

export function createHuman(body: {
  name: string;
  username: string;
  email: string;
  password: string;
  department?: string;
  title?: string;
}) {
  return send<AccessUser>("/api/users/human", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateHuman(id: number, body: Record<string, string>) {
  return send<AccessUser>(`/api/users/${id}/human`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function readUserAccess(id: number, signal?: AbortSignal) {
  return send<EffectiveAccess>(`/api/users/${id}/permissions`, undefined, signal);
}

export function listRoles(signal?: AbortSignal) {
  return send<{ items: AccessRole[] }>("/api/roles", undefined, signal);
}

export function summarizeRoles(signal?: AbortSignal) {
  return send<RoleSummary>("/api/roles/summary", undefined, signal);
}

export function readRole(id: number, signal?: AbortSignal) {
  return send<AccessRole>(`/api/roles/${id}/detail`, undefined, signal);
}

export function createRole(body: {
  name: string;
  duty_category: string;
  description: string;
  privilege_narrative: string;
  least_privilege_baseline: string;
}) {
  return send<AccessRole>("/api/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateRole(id: number, body: {
  name: string;
  duty_category: string;
  description: string;
  privilege_narrative: string;
  least_privilege_baseline: string;
}) {
  return send<AccessRole>(`/api/roles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteRole(id: number) {
  return send<void>(`/api/roles/${id}`, { method: "DELETE" });
}

export function listBindings(userId?: number, signal?: AbortSignal) {
  const params = userId ? `?user_id=${userId}` : "";
  return send<{ items: AccessBinding[] }>(`/api/user-roles${params}`, undefined, signal);
}

export function assignRole(body: { user_id: number; role_id: number; description?: string }) {
  return send<AccessBinding>("/api/user-roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function setBindingStatus(id: number, status: "ACTIVE" | "SUSPENDED" | "REVOKED") {
  return send<AccessBinding>(`/api/user-roles/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
