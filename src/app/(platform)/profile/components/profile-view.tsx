"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopHeader from "@/components/TopHeader";
import { formatAuditStamp, listMyAuditLogs, type AuditListItem } from "@/lib/audit-logs";
import {
  deleteProfileImage,
  formatProfileDate,
  loadProfileImage,
  profileInitials,
  profileTitle,
  readProfile,
  updateProfile,
  type ProfileUser,
} from "@/lib/profile";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function ProfileView() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"profile" | "activity">("profile");
  const [editing, setEditing] = useState(false);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myActivity, setMyActivity] = useState<AuditListItem[]>([]);
  const [activityNote, setActivityNote] = useState("");

  function rememberPhoto(url: string | null) {
    setPhoto((current) => {
      if (current && current !== url) URL.revokeObjectURL(current);
      return url;
    });
  }

  function applyUser(next: ProfileUser, image: string | null) {
    setUser(next);
    setFullName(next.fullName);
    setEmail(next.email);
    rememberPhoto(next.profileImageUrl ? image : null);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNote("");
    readProfile(controller.signal)
      .then(async (next) => {
        if (controller.signal.aborted) return;
        const image = next.profileImageUrl ? await loadProfileImage(controller.signal) : null;
        if (controller.signal.aborted) {
          if (image) URL.revokeObjectURL(image);
          return;
        }
        applyUser(next, image);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setUser(null);
        setNote(reason instanceof Error ? reason.message : "Couldn't load your profile");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (tab !== "activity") return;
    const controller = new AbortController();
    setActivityNote("");
    listMyAuditLogs({ page: 1, limit: 20 }, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setMyActivity(list.items);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setMyActivity([]);
        setActivityNote(reason instanceof Error ? reason.message : "Couldn't load your activity");
      });
    return () => controller.abort();
  }, [tab]);

  async function onPhoto(file: File | undefined) {
    if (!file || saving) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setNote("Photo must be PNG, JPEG, or WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNote("Photo must be 5 MB or smaller");
      return;
    }
    setSaving(true);
    setNote("");
    try {
      const next = await updateProfile({ profile_image: file });
      const image = next.profileImageUrl ? await loadProfileImage() : null;
      applyUser(next, image);
    } catch (reason) {
      setNote(reason instanceof Error ? reason.message : "Couldn't update the photo");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto() {
    if (!photo || saving) return;
    setSaving(true);
    setNote("");
    try {
      await deleteProfileImage();
      const next = await readProfile();
      applyUser(next, null);
    } catch (reason) {
      setNote(reason instanceof Error ? reason.message : "Couldn't remove the photo");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!user || saving) return;
    if (!editing) {
      setEditing(true);
      setNote("");
      return;
    }
    const name = fullName.trim();
    const mail = email.trim();
    if (!name) {
      setNote("fullname is required");
      return;
    }
    const fields: { fullname?: string; email?: string } = {};
    if (name !== user.fullName) fields.fullname = name;
    if (mail.toLowerCase() !== user.email.toLowerCase()) fields.email = mail;
    if (!fields.fullname && !fields.email) {
      setNote("No profile changes");
      return;
    }
    setSaving(true);
    setNote("");
    try {
      const next = await updateProfile(fields);
      setUser(next);
      setFullName(next.fullName);
      setEmail(next.email);
      setEditing(false);
    } catch (reason) {
      setNote(reason instanceof Error ? reason.message : "Couldn't save your profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cmd pf">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className="pf-body">
        <header className="pf-head">
          <div className="cmd-page-head">
            <span className="cmd-page-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="cmd-page-title is-split">
                <span>My</span>
                <span className="cmd-page-title-accent">Profile</span>
              </h1>
              <p>Manage your personal information and how others see you on the platform.</p>
            </div>
          </div>
        </header>

        <div className="pf-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "profile"} className={tab === "profile" ? "is-active" : undefined} onClick={() => setTab("profile")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M5.5 19.2c.8-3.2 3.2-4.8 6.5-4.8s5.7 1.6 6.5 4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Profile
          </button>
          <button type="button" role="tab" aria-selected={tab === "activity"} className={tab === "activity" ? "is-active" : undefined} onClick={() => setTab("activity")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
              <path d="M12 8v4.2l2.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Activity
          </button>
        </div>

        {tab === "activity" ? (
          <section className="pf-card pf-activity">
            <h2>Activity</h2>
            {activityNote ? <p className="pf-note">{activityNote}</p> : null}
            <ul>
              {myActivity.map((item) => (
                <li key={item.eventId}>
                  <time>{formatAuditStamp(item.timestamp).full}</time>
                  <span>{item.event}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : !user ? (
          <section className="pf-card">
            <p className="pf-note">{loading ? "Loading profile…" : note || "Login required"}</p>
            {!loading ? <Link href="/login">Sign in</Link> : null}
          </section>
        ) : (
          <div className="pf-layout">
            <aside className="pf-card pf-identity">
              <div className="pf-avatar">
                {photo ? <img src={photo} alt="" /> : <span>{profileInitials(user.fullName)}</span>}
                <i />
              </div>
              <strong>{user.fullName}</strong>
              <em>{user.status}</em>
              <small>{profileTitle(user.role?.name)}</small>
              <ul>
                <li>
                  <Mail />
                  {user.email}
                </li>
                <li>
                  <Building />
                  {user.department ?? "—"}
                </li>
                <li>
                  <Clock />
                  {formatProfileDate(user.lastLoginAt)}
                </li>
                <li>
                  <Calendar />
                  Member since {formatProfileDate(user.memberSince)}
                </li>
              </ul>
            </aside>

            <div className="pf-main">
              <section className="pf-card">
                <div className="pf-card-head">
                  <div>
                    <h2>Personal Information</h2>
                    <p>Update your name, email, and profile photo.</p>
                  </div>
                  <button type="button" className="pf-edit" onClick={saveProfile} disabled={saving}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 20h4.2L19.4 8.8a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L4 15.8V20Z" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    {saving ? "Saving..." : editing ? "Save" : "Edit"}
                  </button>
                </div>
                {note ? <p className="pf-note">{note}</p> : null}
                <div className="pf-fields">
                  <label>
                    Full Name
                    <input value={fullName} readOnly={!editing} onChange={(event) => setFullName(event.target.value)} />
                  </label>
                  <label>
                    Username
                    <input value={user.username} readOnly />
                  </label>
                  <label>
                    Email Address
                    <input value={email} readOnly={!editing} onChange={(event) => setEmail(event.target.value)} />
                  </label>
                  <label>
                    Department
                    <input value={user.department ?? ""} readOnly />
                  </label>
                  <label>
                    Position / Role
                    <input value={profileTitle(user.role?.name)} readOnly />
                  </label>
                </div>
              </section>

              <div className="pf-split">
                <section className="pf-card">
                  <h2>Profile Picture</h2>
                  <p>Upload a new profile picture. Recommended size is 400×400 px.</p>
                  <label className="pf-drop">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={saving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void onPhoto(file);
                      }}
                    />
                    {photo ? <img src={photo} alt="" /> : <Upload />}
                    <span>{photo ? "Click to replace the photo." : "Drag and drop an image here or click to browse."}</span>
                    <small>PNG, JPG, or WEBP (max 5MB)</small>
                  </label>
                  <div className="pf-photo-actions">
                    <label className="pf-ghost">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={saving}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          void onPhoto(file);
                        }}
                      />
                      Change Photo
                    </label>
                    <button type="button" className="pf-danger" onClick={() => void removePhoto()} disabled={!photo || saving}>
                      Remove Photo
                    </button>
                  </div>
                </section>

                <section className="pf-card">
                  <h2>Account Information</h2>
                  <p>View your account details and status.</p>
                  <dl>
                    <div>
                      <dt>Account Status</dt>
                      <dd><b className="is-green">{user.status}</b></dd>
                    </div>
                    <div>
                      <dt>Verification</dt>
                      <dd><b className="is-blue">{user.verification}</b></dd>
                    </div>
                    <div>
                      <dt>Access Binding</dt>
                      <dd><b className="is-cyan">{profileTitle(user.accessBinding)}</b></dd>
                    </div>
                    <div>
                      <dt>Account Type</dt>
                      <dd>{user.accountType}</dd>
                    </div>
                    <div>
                      <dt>Last Login</dt>
                      <dd>{formatProfileDate(user.lastLoginAt)}</dd>
                    </div>
                    <div>
                      <dt>Login Method</dt>
                      <dd>{user.loginMethod ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Member Since</dt>
                      <dd>{formatProfileDate(user.memberSince)}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Mail() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function Building() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V6.5L12 3l8 3.5V20" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 20v-5h6v5M9 9h.01M12 9h.01M15 9h.01M9 12.5h.01M12 12.5h.01M15 12.5h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Clock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4.2l2.6 1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Calendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Upload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
