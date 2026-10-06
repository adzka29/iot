"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { logoutAccount } from "@/lib/profile";
import {
  PROFILE_UPDATED,
  formatProfileDate,
  loadProfileImage,
  profileInitials,
  profileTitle,
  readProfile,
  type ProfileUser,
} from "@/lib/profile";

const HEADER_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/explorer", label: "Explorer" },
  { href: "/alerts", label: "Alerts" },
  { href: "/history", label: "History" },
];

const HEADER_SOON = ["Operations", "Statistic", "Reports"];

export default function TopHeader({ floating = false }: { floating?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [account, setAccount] = useState<ProfileUser | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!window.localStorage.getItem("session_id")) {
        if (!ignore) {
          setAccount(null);
          setAvatar((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
          });
        }
        return;
      }
      try {
        const user = await readProfile();
        if (ignore) return;
        setAccount(user);
        if (!user.profileImageUrl) {
          setAvatar((current) => {
            if (current) URL.revokeObjectURL(current);
            return null;
          });
          return;
        }
        const url = await loadProfileImage();
        if (ignore) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        setAvatar((current) => {
          if (current) URL.revokeObjectURL(current);
          return url;
        });
      } catch {
        if (!ignore) setAccount(null);
      }
    }
    void load();
    window.addEventListener(PROFILE_UPDATED, load);
    return () => {
      ignore = true;
      window.removeEventListener(PROFILE_UPDATED, load);
    };
  }, []);

  return (
    <>
    <header className={`cmd-header${floating ? " is-floating" : ""}`}>
      <Link href="/dashboard" className="cmd-brand">
        <span className="cmd-mark">
          <img src="/images/synapse-t-mark.png" alt="" width={18} height={18} />
        </span>
        <img className="cmd-wordmark" src="/images/synapse-t-wordmark.png" alt="SYNAPSE-T" />
      </Link>
      {floating ? null : (
        <nav className="cmd-nav" aria-label="Main">
          {HEADER_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
          {HEADER_SOON.map((label) => (
            <span key={label} aria-disabled="true">
              {label}
            </span>
          ))}
        </nav>
      )}
      <div className={floating ? "cmd-account-card" : "cmd-header-end"}>
      <div className="cmd-user">
        <button
          className="cmd-user-btn"
          type="button"
          aria-haspopup="menu"
          aria-expanded={userOpen}
          onClick={() => setUserOpen((open) => !open)}
        >
          <span className="cmd-avatar">
            {avatar ? <img src={avatar} alt="" /> : account ? profileInitials(account.fullName) : ""}
            <i />
          </span>
          <span>
            <strong>{account?.fullName ?? "Guest"}</strong>
            <small>{account ? profileTitle(account.role?.name) : "Signed out"}</small>
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
            <button type="button" role="menuitem" onClick={() => router.push("/access")}>
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
              <p>Are you sure you want to log out of SYNAPSE-T?</p>
              <div className="cmd-logout-actions">
                <button type="button" onClick={() => setLogoutOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="is-confirm"
                  onClick={() => {
                    void logoutAccount().finally(() => router.push("/login"));
                  }}
                >
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
