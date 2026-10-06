"use client";

import { useState } from "react";
import TopHeader from "../dashboard/top-header";

const activities = [
  { time: "06 Oct 2026, 15:10", text: "Signed in with Email & Password" },
  { time: "06 Oct 2026, 14:02", text: "Viewed the command dashboard" },
  { time: "05 Oct 2026, 16:37", text: "Account created" },
];

export default function ProfileView() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"profile" | "activity">("profile");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("Superadmin");
  const [email, setEmail] = useState("superadmin@trackforge.id");
  const [photo, setPhoto] = useState<string | null>(null);

  function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;
    const url = URL.createObjectURL(file);
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current);
      return url;
    });
  }

  return (
    <div className="cmd pf">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className="pf-body">
        <header className="pf-head">
          <h1>My Profile</h1>
          <p>Manage your personal information and how others see you on the platform.</p>
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
            <ul>
              {activities.map((item) => (
                <li key={item.text}>
                  <time>{item.time}</time>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="pf-layout">
            <aside className="pf-card pf-identity">
              <div className="pf-avatar">
                {photo ? <img src={photo} alt="" /> : <span>SU</span>}
                <i />
              </div>
              <strong>{fullName}</strong>
              <em>ACTIVE</em>
              <small>Superadmin</small>
              <ul>
                <li>
                  <Mail />
                  {email}
                </li>
                <li>
                  <Building />
                  Platform Administration
                </li>
                <li>
                  <Clock />
                  06 Oct 2026, 15:10:53 WIB
                </li>
                <li>
                  <Calendar />
                  Member since 05 Oct 2026, 16:37:13 WIB
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
                  <button type="button" className="pf-edit" onClick={() => setEditing((value) => !value)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 20h4.2L19.4 8.8a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L4 15.8V20Z" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    {editing ? "Save" : "Edit"}
                  </button>
                </div>
                <div className="pf-fields">
                  <label>
                    Full Name
                    <input value={fullName} readOnly={!editing} onChange={(event) => setFullName(event.target.value)} />
                  </label>
                  <label>
                    Username
                    <input value="superadmin" readOnly />
                    <small>Username cannot be changed.</small>
                  </label>
                  <label>
                    Email Address
                    <input value={email} readOnly={!editing} onChange={(event) => setEmail(event.target.value)} />
                  </label>
                  <label>
                    Department
                    <input value="Platform Administration" readOnly />
                    <small>Department cannot be changed.</small>
                  </label>
                  <label>
                    Position / Role
                    <input value="Superadmin" readOnly />
                    <small>Role cannot be changed.</small>
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
                      onChange={(event) => onPhoto(event.target.files?.[0])}
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
                        onChange={(event) => onPhoto(event.target.files?.[0])}
                      />
                      Change Photo
                    </label>
                    <button type="button" className="pf-danger" onClick={() => setPhoto(null)} disabled={!photo}>
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
                      <dd><b className="is-green">ACTIVE</b></dd>
                    </div>
                    <div>
                      <dt>Verification</dt>
                      <dd><b className="is-blue">VERIFIED</b></dd>
                    </div>
                    <div>
                      <dt>Access Binding</dt>
                      <dd><b className="is-cyan">Bound</b></dd>
                    </div>
                    <div>
                      <dt>Account Type</dt>
                      <dd>Human</dd>
                    </div>
                    <div>
                      <dt>Last Login</dt>
                      <dd>06 Oct 2026, 15:10:53 WIB</dd>
                    </div>
                    <div>
                      <dt>Login Method</dt>
                      <dd>Email & Password</dd>
                    </div>
                    <div>
                      <dt>Member Since</dt>
                      <dd>05 Oct 2026, 16:37:13 WIB</dd>
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
