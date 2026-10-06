const SESSION_KEY = "session_id";

export function readSessionId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function storeSessionId(sessionId: string) {
  window.localStorage.setItem(SESSION_KEY, sessionId);
}

export function clearSessionId() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem("access");
}
