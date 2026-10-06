"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";

type Severity = "Critical" | "Warning" | "Info";
type AlertType =
  | "SOS"
  | "Casualty"
  | "Arrhythmia"
  | "Low Battery"
  | "Heat Stress"
  | "Strap Disconnected"
  | "No Contact";

type Alert = {
  id: string;
  date: string;
  time: string;
  severity: Severity;
  type: AlertType;
  soldier: string;
  soldierId: string;
  group: string;
  details: string;
  position: string;
  seen: string;
};

const ALERTS: Alert[] = [
  { id: "a1", date: "03 Oct 2026", time: "22:38", severity: "Critical", type: "SOS", soldier: "S-04", soldierId: "104", group: "Alpha", details: "SOS button pressed", position: "GNSS (±12 m)", seen: "2 minutes ago" },
  { id: "a2", date: "03 Oct 2026", time: "22:21", severity: "Critical", type: "Casualty", soldier: "S-01", soldierId: "101", group: "Alpha", details: "No movement detected (algorithm)", position: "GNSS (±15 m)", seen: "5 minutes ago" },
  { id: "a3", date: "03 Oct 2026", time: "21:56", severity: "Critical", type: "Arrhythmia", soldier: "S-03", soldierId: "103", group: "Bravo", details: "Irregular heart rhythm detected", position: "GNSS (±15 m)", seen: "3 minutes ago" },
  { id: "a4", date: "03 Oct 2026", time: "21:42", severity: "Warning", type: "Low Battery", soldier: "S-07", soldierId: "107", group: "Bravo", details: "Device battery 18%", position: "Mesh (RSSI)", seen: "12 minutes ago" },
  { id: "a5", date: "03 Oct 2026", time: "20:18", severity: "Warning", type: "Heat Stress", soldier: "S-06", soldierId: "106", group: "Charlie", details: "Body temperature high threshold", position: "GNSS (±20 m)", seen: "8 minutes ago" },
  { id: "a6", date: "03 Oct 2026", time: "19:33", severity: "Info", type: "Strap Disconnected", soldier: "S-08", soldierId: "108", group: "Charlie", details: "Chest strap disconnected", position: "GNSS (±25 m)", seen: "18 minutes ago" },
  { id: "a7", date: "03 Oct 2026", time: "18:27", severity: "Info", type: "No Contact", soldier: "S-02", soldierId: "102", group: "Alpha", details: "No data received for > 30 minutes", position: "Last seen 18:26", seen: "(N/A)" },
  { id: "a8", date: "03 Oct 2026", time: "16:04", severity: "Warning", type: "Low Battery", soldier: "S-05", soldierId: "105", group: "Delta", details: "Device battery 20%", position: "Mesh (RSSI)", seen: "12 minutes ago" },
  { id: "a9", date: "03 Oct 2026", time: "14:22", severity: "Info", type: "No Contact", soldier: "S-09", soldierId: "109", group: "Delta", details: "No data received for > 30 minutes", position: "Last seen 14:21", seen: "(N/A)" },
  { id: "a10", date: "03 Oct 2026", time: "12:11", severity: "Info", type: "Strap Disconnected", soldier: "S-10", soldierId: "107b", group: "Bravo", details: "Chest strap disconnected", position: "GNSS (±30 m)", seen: "18 minutes ago" },
  { id: "a11", date: "03 Oct 2026", time: "11:01", severity: "Critical", type: "SOS", soldier: "S-11", soldierId: "104", group: "Alpha", details: "SOS button pressed", position: "GNSS (±12 m)", seen: "2 minutes ago" },
  { id: "a12", date: "03 Oct 2026", time: "09:31", severity: "Critical", type: "SOS", soldier: "S-12", soldierId: "104", group: "Alpha", details: "SOS button pressed", position: "GNSS (±12 m)", seen: "2 minutes ago" },
  { id: "a13", date: "03 Oct 2026", time: "08:01", severity: "Critical", type: "Arrhythmia", soldier: "S-13", soldierId: "103", group: "Bravo", details: "Irregular heart rhythm detected", position: "GNSS (±15 m)", seen: "3 minutes ago" },
  { id: "a14", date: "03 Oct 2026", time: "06:31", severity: "Warning", type: "Low Battery", soldier: "S-14", soldierId: "101", group: "Alpha", details: "Device battery low", position: "Mesh (RSSI)", seen: "12 minutes ago" },
];

function AlertGlyph({ type }: { type: AlertType }) {
  if (type === "SOS") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.2 1.4 5.6 1.4 5.6H4.8s1.4-1.4 1.4-5.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Casualty") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Arrhythmia") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12h3l2-4 3 8 2-4h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "Low Battery") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="7.5" width="14" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <path d="M19.5 10.2v3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M6.2 12h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Heat Stress") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4v7.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M12 11.2a3.4 3.4 0 1 0 3.1 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Strap Disconnected") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 8.5 5.2 11.3a4 4 0 0 0 5.5 5.5L13.5 14M16 15.5l2.8-2.8a4 4 0 0 0-5.5-5.5L10.5 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 18h4.2A11 11 0 0 1 20 8.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 14.5h2.8A7.6 7.6 0 0 1 16.8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

type TopHeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  hits?: { id: string; title: string; hint: string }[];
  onPick?: (id: string) => void;
};

function Shield() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.2 19 6v5.5c0 4.2-2.8 7.2-7 8.6-4.2-1.4-7-4.4-7-8.6V6l7-2.8Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function TopHeader({ query, onQueryChange, hits = [], onPick }: TopHeaderProps) {
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

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
      <div className="cmd-search-wrap">
      <label className="cmd-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          placeholder="Search personnel, weapons, area, or location..."
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && hits[0] && onPick) {
              event.preventDefault();
              onPick(hits[0].id);
            }
            if (event.key === "Escape") onQueryChange("");
          }}
          aria-label="Search map"
          autoComplete="off"
        />
      </label>
      {query.trim() && onPick ? (
        <div className="cmd-search-menu" role="listbox">
          {hits.length ? (
            hits.map((hit) => (
              <button key={hit.id} type="button" role="option" onClick={() => onPick(hit.id)}>
                <b>{hit.title}</b>
                <small>{hit.hint}</small>
              </button>
            ))
          ) : (
            <p>No matches on the map</p>
          )}
        </div>
      ) : null}
      </div>
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
          <span className="cmd-notify-badge">{ALERTS.filter((alert) => alert.severity !== "Info").length}</span>
        </button>
        {notesOpen ? (
          <div className="cmd-notify-menu" role="dialog" aria-label="Alerts">
            <p className="cmd-notify-head">Alerts</p>
            <div className="cmd-notify-table">
              <table>
                <thead>
                  <tr>
                    <th>Event Time</th>
                    <th>Severity</th>
                    <th>Alert Type</th>
                    <th>Soldier</th>
                    <th>Group</th>
                    <th>Details</th>
                    <th>Position / Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {ALERTS.map((alert) => (
                    <tr
                      key={alert.id}
                      onClick={() => {
                        setNotesOpen(false);
                        onPick?.(alert.soldierId);
                      }}
                    >
                      <td>
                        <span className="cmd-notify-time">
                          {alert.date}
                          <small>{alert.time}</small>
                        </span>
                      </td>
                      <td>
                        <span className={`cmd-sev is-${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                      </td>
                      <td>
                        <span className="cmd-notify-type">
                          <AlertGlyph type={alert.type} />
                          {alert.type}
                        </span>
                      </td>
                      <td>{alert.soldier}</td>
                      <td>{alert.group}</td>
                      <td>{alert.details}</td>
                      <td>
                        <span className="cmd-notify-seen">
                          <b>{alert.position}</b>
                          {alert.seen}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
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
