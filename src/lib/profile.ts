import { clearSessionId, readSessionId, storeSessionId } from "@/lib/session";

export type ProfileUser = {
  id: number;
  identityType: string;
  fullName: string;
  username: string;
  email: string;
  profileImageUrl: string | null;
  department: string | null;
  status: string;
  verification: string;
  accessBinding: string;
  role: { id: number; name: string } | null;
  accountType: string;
  lastLoginAt: string | null;
  loginMethod: string | null;
  memberSince: string | null;
};

export const PROFILE_UPDATED = "synapse-profile-updated";

export function notifyProfileUpdated() {
  window.dispatchEvent(new Event(PROFILE_UPDATED));
}

export function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "—";
}

export function profileTitle(value: string | null | undefined) {
  if (!value) return "—";
  if (value !== value.toUpperCase()) {
    if (value === value.toLowerCase()) return value.charAt(0).toUpperCase() + value.slice(1);
    return value;
  }
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatProfileDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const text = date.toLocaleString("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return `${text} WIB`;
}

function authHeaders() {
  const session = readSessionId();
  if (!session) throw new Error("Login required");
  return { Authorization: `Bearer ${session}` };
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

export async function loginAccount(account: string, password: string) {
  const response = await fetch("/api/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { session_id?: string; access?: unknown };
  if (!body.session_id) throw new Error("Login failed");
  storeSessionId(body.session_id);
  if (body.access) window.localStorage.setItem("access", JSON.stringify(body.access));
}

export async function logoutAccount() {
  const headers = (() => {
    try {
      return authHeaders();
    } catch {
      return null;
    }
  })();
  if (headers) {
    await fetch("/api/users/logout", { method: "POST", headers }).catch(() => undefined);
  }
  clearSessionId();
}

export async function readProfile(signal?: AbortSignal) {
  const response = await fetch("/api/auth/me", { headers: authHeaders(), signal, cache: "no-store" });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { user: ProfileUser };
  return body.user;
}

export async function updateProfile(fields: { fullname?: string; email?: string; profile_image?: File }) {
  const form = new FormData();
  if (fields.fullname !== undefined) form.append("fullname", fields.fullname);
  if (fields.email !== undefined) form.append("email", fields.email);
  if (fields.profile_image) form.append("profile_image", fields.profile_image);
  const response = await fetch("/api/users/me", {
    method: "PATCH",
    headers: authHeaders(),
    body: form,
  });
  if (!response.ok) throw new Error(await readError(response));
  const body = (await response.json()) as { user: ProfileUser };
  notifyProfileUpdated();
  return body.user;
}

export async function loadProfileImage(signal?: AbortSignal) {
  const response = await fetch("/api/users/me/profile-image", {
    headers: authHeaders(),
    signal,
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readError(response));
  return URL.createObjectURL(await response.blob());
}

export async function deleteProfileImage() {
  const response = await fetch("/api/users/me/profile-image", {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error(await readError(response));
  notifyProfileUpdated();
}
