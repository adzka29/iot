"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type TopHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "06";
  const month = parts.find((part) => part.type === "month")?.value ?? "Oct";
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  return `${day}-${month}-${year}`;
}

function Shield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.2 19 6v5.5c0 4.2-2.8 7.2-7 8.6-4.2-1.4-7-4.4-7-8.6V6l7-2.8Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function TopHeader({ query, onQueryChange }: TopHeaderProps) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
    <header className="cmd-header">
      <Link href="/dashboard" className="cmd-brand">
        <span className="cmd-mark">
          <Shield />
        </span>
        <div>
          <strong>TRACKFORGE</strong>
          <small>Real-time situational awareness</small>
        </div>
      </Link>
      <label className="cmd-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          placeholder="Search personnel, operation, location, or events..."
          onChange={(event) => onQueryChange(event.target.value)}
          aria-label="Search personnel, operation, location, or events"
        />
      </label>
      <div className="cmd-notify">
        <button
          className="cmd-notify-btn"
          type="button"
          aria-label="Notifications"
          aria-haspopup="menu"
          aria-expanded={notesOpen}
          onClick={() => {
            setNotesOpen((open) => !open);
            setUserOpen(false);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.2 1.4 5.6 1.4 5.6H4.8s1.4-1.4 1.4-5.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span className="cmd-notify-badge">3</span>
        </button>
        {notesOpen ? (
          <div className="cmd-notify-menu" role="menu">
            <p>Notifications</p>
            <button type="button" role="menuitem" onClick={() => setNotesOpen(false)}>
              <b>Soldier 104 critical</b>
              <small>Telemetry lost in Alpha Zone</small>
            </button>
            <button type="button" role="menuitem" onClick={() => setNotesOpen(false)}>
              <b>Restricted area</b>
              <small>2 alerts inside the boundary</small>
            </button>
            <button type="button" role="menuitem" onClick={() => setNotesOpen(false)}>
              <b>Soldier 106 warning</b>
              <small>Moved 120 m to northeast</small>
            </button>
          </div>
        ) : null}
      </div>
      <div className="cmd-clock">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 8v4.2l2.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <div>
          <strong>{now ? formatClock(now) : "--:--:--"}</strong>
          <small>Asia/Jakarta · {now ? formatDate(now) : "06-Oct-2026"}</small>
        </div>
      </div>
      <div className="cmd-user">
        <button
          className="cmd-user-btn"
          type="button"
          aria-haspopup="menu"
          aria-expanded={userOpen}
          onClick={() => {
            setUserOpen((open) => !open);
            setNotesOpen(false);
          }}
        >
          <span className="cmd-avatar">
            S
            <i />
          </span>
          <span>
            <strong>Superadmin21</strong>
            <small>Superadmin</small>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {userOpen ? (
          <div className="cmd-user-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => router.push("/profile")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              My Profile
            </button>
            <button type="button" role="menuitem" onClick={() => router.push("/activity")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 6.5h11M8 12h11M8 17.5h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="4.5" cy="6.5" r="1" fill="currentColor" />
                <circle cx="4.5" cy="12" r="1" fill="currentColor" />
                <circle cx="4.5" cy="17.5" r="1" fill="currentColor" />
              </svg>
              Activity Log
            </button>
            <button type="button" role="menuitem" onClick={() => setUserOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M3.8 18.5c.7-2.6 2.6-3.9 5.2-3.9s4.5 1.3 5.2 3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M16 8.2h4.2M18.1 6.1v4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              User Access
            </button>
            <button type="button" role="menuitem" onClick={() => setUserOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M19.4 13a7.7 7.7 0 0 0 0-2l1.7-1.3-1.6-2.8-2 .8a7.8 7.8 0 0 0-1.7-1L15.4 4h-3.2l-.4 2.7a7.8 7.8 0 0 0-1.7 1l-2-.8-1.6 2.8L8.2 11a7.7 7.7 0 0 0 0 2l-1.7 1.3 1.6 2.8 2-.8a7.8 7.8 0 0 0 1.7 1l.4 2.7h3.2l.4-2.7a7.8 7.8 0 0 0 1.7-1l2 .8 1.6-2.8L19.4 13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Settings
            </button>
            <button
              type="button"
              role="menuitem"
              className="is-logout"
              onClick={() => {
                setUserOpen(false);
                setLogoutOpen(true);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10 7.2V5.8A1.8 1.8 0 0 1 11.8 4h6.4A1.8 1.8 0 0 1 20 5.8v12.4A1.8 1.8 0 0 1 18.2 20h-6.4A1.8 1.8 0 0 1 10 18.2v-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <path d="M13.5 12H4.5M7 9.2 4.2 12 7 14.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
    {logoutOpen
      ? createPortal(
          <div
            className="cmd-logout"
            role="presentation"
            onClick={() => setLogoutOpen(false)}
          >
            <div
              className="cmd-logout-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cmd-logout-title"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="cmd-logout-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M10 7.2V5.8A1.8 1.8 0 0 1 11.8 4h6.4A1.8 1.8 0 0 1 20 5.8v12.4A1.8 1.8 0 0 1 18.2 20h-6.4A1.8 1.8 0 0 1 10 18.2v-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  <path d="M13.5 12H4.5M7 9.2 4.2 12 7 14.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h2 id="cmd-logout-title">Log out?</h2>
              <p>Are you sure you want to log out of TRACKFORGE?</p>
              <div className="cmd-logout-actions">
                <button type="button" onClick={() => setLogoutOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="is-confirm" onClick={() => router.push("/login")}>
                  Log out
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}
