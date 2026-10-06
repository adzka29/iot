"use client";

import { useMemo, useState } from "react";
import TopHeader from "../dashboard/top-header";

type Tab = "Identity Registry" | "Role Model" | "Access Binding";

type Identity = {
  id: string;
  name: string;
  username: string;
  email: string;
  department: string;
  title: string;
  type: "Human" | "Service";
  status: "Active" | "Inactive";
  verification: "Verified" | "Pending" | "Unverified";
  binding: "Bound" | "Unbound";
};

type Role = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  narrative: string;
  baseline: string;
  bindings: number;
  system: boolean;
};

type Binding = {
  id: string;
  identity: string;
  role: string;
  period: string;
  status: "Active" | "Suspended" | "Revoked";
  description: string;
  userStatus: string;
};

const IDENTITIES: Identity[] = [
  {
    id: "id-1",
    name: "Superadmin",
    username: "superadmin",
    email: "superadmin@trackforge.id",
    department: "Platform Administration",
    title: "—",
    type: "Human",
    status: "Active",
    verification: "Verified",
    binding: "Bound",
  },
];

const ROLES: Role[] = [
  {
    id: "r1",
    name: "Superadmin",
    slug: "superadmin",
    category: "Platform Administration",
    description: "Full platform authority.",
    narrative: "Owns identity, role, and binding administration across TrackForge.",
    baseline: "Reserved for platform owners.",
    bindings: 1,
    system: true,
  },
  {
    id: "r2",
    name: "Operations Commander",
    slug: "operations-commander",
    category: "Command Operations",
    description: "Operational command and oversight.",
    narrative: "Operational visibility and authority over live units and incidents.",
    baseline: "Minimum command authority for shift leads.",
    bindings: 0,
    system: true,
  },
  {
    id: "r3",
    name: "Ops Controller",
    slug: "ops-controller",
    category: "Operations Control",
    description: "Watch floor control and ticket flow.",
    narrative: "Controls alert triage and ticket routing during active operations.",
    baseline: "Scoped to operations workspace menus.",
    bindings: 0,
    system: true,
  },
  {
    id: "r4",
    name: "Field Supervisor",
    slug: "field-supervisor",
    category: "Field Operations",
    description: "Field unit supervision.",
    narrative: "Monitors personnel and weapons layers in the field.",
    baseline: "Field maps and soldier detail only.",
    bindings: 0,
    system: true,
  },
  {
    id: "r5",
    name: "Comms Officer",
    slug: "comms-officer",
    category: "Fleet & Communications",
    description: "Gateway and uplink oversight.",
    narrative: "Reads explorer and gateway health without identity admin rights.",
    baseline: "Communications and explorer read access.",
    bindings: 0,
    system: true,
  },
  {
    id: "r6",
    name: "Observer",
    slug: "observer",
    category: "Read Only",
    description: "Read-only situational awareness.",
    narrative: "Can view dashboards without mutating records.",
    baseline: "Read-only across shared operational surfaces.",
    bindings: 0,
    system: true,
  },
];

const BINDINGS: Binding[] = [
  {
    id: "b1",
    identity: "Superadmin",
    role: "Superadmin",
    period: "Open-ended",
    status: "Active",
    description: "Platform administration",
    userStatus: "Active",
  },
];

const CATEGORY_CLASS: Record<string, string> = {
  "Platform Administration": "is-blue",
  "Command Operations": "is-green",
  "Operations Control": "is-red",
  "Field Operations": "is-orange",
  "Fleet & Communications": "is-teal",
  "Read Only": "is-purple",
};

export default function AccessView() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("Identity Registry");
  const [search, setSearch] = useState("");
  const [selectedIdentity, setSelectedIdentity] = useState(IDENTITIES[0]?.id ?? null);
  const [selectedRole, setSelectedRole] = useState(ROLES[1]?.id ?? ROLES[0]?.id ?? null);
  const [selectedBinding, setSelectedBinding] = useState(BINDINGS[0]?.id ?? null);

  const identities = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text || tab !== "Identity Registry") return IDENTITIES;
    return IDENTITIES.filter((row) =>
      `${row.name} ${row.username} ${row.email} ${row.department}`.toLowerCase().includes(text),
    );
  }, [search, tab]);

  const roles = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text || tab !== "Role Model") return ROLES;
    return ROLES.filter((row) =>
      `${row.name} ${row.slug} ${row.category} ${row.description}`.toLowerCase().includes(text),
    );
  }, [search, tab]);

  const bindings = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text || tab !== "Access Binding") return BINDINGS;
    return BINDINGS.filter((row) =>
      `${row.identity} ${row.role} ${row.description}`.toLowerCase().includes(text),
    );
  }, [search, tab]);

  const identity = IDENTITIES.find((row) => row.id === selectedIdentity) ?? null;
  const role = ROLES.find((row) => row.id === selectedRole) ?? null;
  const binding = BINDINGS.find((row) => row.id === selectedBinding) ?? null;

  return (
    <div className="cmd ua">
      <TopHeader query={query} onQueryChange={setQuery} />
      <main className="ua-body">
        <header className="ua-head">
          <div className="cmd-page-head">
            <span className="cmd-page-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M3.8 18.2c.7-2.6 2.6-3.9 5.2-3.9s4.5 1.3 5.2 3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="17.2" cy="9.2" r="2.2" stroke="currentColor" strokeWidth="1.7" />
                <path d="M20.8 17.2c-.4-1.6-1.6-2.5-3.6-2.5s-3.2.9-3.6 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="cmd-page-title is-split">
                <span>User</span>
                <span className="cmd-page-title-accent">Access</span>
              </h1>
              <p>Identities, roles, and the permissions that open each menu.</p>
            </div>
          </div>
        </header>

        <nav className="ua-tabs" aria-label="User access sections">
          {(["Identity Registry", "Role Model", "Access Binding"] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              className={tab === item ? "is-active" : undefined}
              onClick={() => {
                setTab(item);
                setSearch("");
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        {tab === "Identity Registry" ? (
          <div className={`ua-layout${identity ? " has-detail" : ""}`}>
            <section className="ua-panel">
              <div className="ua-panel-head">
                <div className="cmd-section-head">
                  <span className="cmd-section-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M3.8 18.2c.7-2.6 2.6-3.9 5.2-3.9s4.5 1.3 5.2 3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <circle cx="17.2" cy="9.2" r="2.2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M20.8 17.2c-.4-1.6-1.6-2.5-3.6-2.5s-3.2.9-3.6 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="cmd-section-title">Identity Registry</h2>
                    <p>Humans and services that can sign in or call TrackForge APIs.</p>
                  </div>
                </div>
                <div className="ua-actions">
                  <button type="button" className="ua-ghost">Refresh</button>
                  <button type="button" className="ua-primary">+ Add Identity</button>
                </div>
              </div>

              <div className="ua-stats">
                <article><strong>1</strong><span>Active Humans</span></article>
                <article><strong>0</strong><span>Inactive Humans</span></article>
                <article><strong>0</strong><span>Pending Verification</span></article>
                <article><strong>0</strong><span>Services</span></article>
              </div>

              <div className="ua-toolbar">
                <label className="ua-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    value={search}
                    placeholder="Search identity, username, email, department..."
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <select defaultValue="Type"><option>Type</option><option>Human</option><option>Service</option></select>
                <select defaultValue="Status"><option>Status</option><option>Active</option><option>Inactive</option></select>
                <select defaultValue="Verification"><option>Verification</option><option>Verified</option><option>Pending</option></select>
                <select defaultValue="Access Binding"><option>Access Binding</option><option>Bound</option><option>Unbound</option></select>
              </div>

              <div className="ua-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Identity</th>
                      <th>Department</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Verification</th>
                      <th>Access Binding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {identities.map((row) => (
                      <tr
                        key={row.id}
                        className={row.id === selectedIdentity ? "is-selected" : undefined}
                        onClick={() => setSelectedIdentity(row.id)}
                      >
                        <td>
                          <span className="ua-id-cell">
                            <i>S</i>
                            <span>
                              <b>{row.name}</b>
                              <small>{row.username}</small>
                            </span>
                          </span>
                        </td>
                        <td>{row.department}</td>
                        <td>{row.email}</td>
                        <td><span className="ua-status is-active">{row.status}</span></td>
                        <td><span className="ua-linkish">{row.verification}</span></td>
                        <td><span className="ua-bound">{row.binding}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="ua-foot">Showing 1-{identities.length} of {identities.length} identities</footer>
            </section>

            {identity ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <strong>Identity</strong>
                  <button type="button" className="ua-ghost">Edit</button>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => setSelectedIdentity(null)}>×</button>
                </div>
                <div className="ua-profile">
                  <i>S</i>
                  <div>
                    <h3>{identity.name}</h3>
                    <p>Human identity</p>
                    <span className="ua-status is-active">{identity.status}</span>
                  </div>
                </div>
                <dl>
                  <div><dt>Name</dt><dd>{identity.name}</dd></div>
                  <div><dt>Username</dt><dd>{identity.username}</dd></div>
                  <div><dt>Email</dt><dd>{identity.email}</dd></div>
                  <div><dt>Department</dt><dd>{identity.department}</dd></div>
                  <div><dt>Title</dt><dd>{identity.title}</dd></div>
                  <div><dt>Verification</dt><dd>{identity.verification}</dd></div>
                  <div><dt>Status</dt><dd>{identity.status}</dd></div>
                  <div><dt>Access Binding</dt><dd>{identity.binding}</dd></div>
                </dl>
              </aside>
            ) : null}
          </div>
        ) : null}

        {tab === "Role Model" ? (
          <div className={`ua-layout${role ? " has-detail" : ""}`}>
            <section className="ua-panel">
              <div className="ua-panel-head">
                <div className="cmd-section-head">
                  <span className="cmd-section-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3.5 19 6.2v4.6c0 4.4-2.9 7.4-7 8.7-4.1-1.3-7-4.3-7-8.7V6.2L12 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      <path d="M9.2 12.1 11 13.9l3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="cmd-section-title">Role Model</h2>
                    <p>Define what each role can do across the platform.</p>
                  </div>
                </div>
                <div className="ua-actions">
                  <button type="button" className="ua-ghost">Refresh</button>
                  <button type="button" className="ua-primary">+ Add Role</button>
                </div>
              </div>

              <div className="ua-stats is-3">
                <article><strong>{ROLES.length}</strong><span>Total Roles</span></article>
                <article><strong>{ROLES.filter((item) => item.system).length}</strong><span>System Roles</span></article>
                <article><strong>{ROLES.filter((item) => !item.system).length}</strong><span>Custom Roles</span></article>
              </div>

              <div className="ua-toolbar">
                <label className="ua-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    value={search}
                    placeholder="Search role, duty category, or description..."
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <select defaultValue="Duty Category">
                  <option>Duty Category</option>
                  {[...new Set(ROLES.map((item) => item.category))].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="ua-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Role Name</th>
                      <th>Duty Category</th>
                      <th>Description</th>
                      <th>Bindings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((row, index) => (
                      <tr
                        key={row.id}
                        className={row.id === selectedRole ? "is-selected" : undefined}
                        onClick={() => setSelectedRole(row.id)}
                      >
                        <td>{index + 1}</td>
                        <td>
                          <span className="ua-role-cell">
                            <b>{row.name}</b>
                            <small>{row.slug}</small>
                          </span>
                        </td>
                        <td><span className={`ua-tag ${CATEGORY_CLASS[row.category] ?? ""}`}>{row.category}</span></td>
                        <td>{row.description}</td>
                        <td>{row.bindings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="ua-foot">Showing 1-{roles.length} of {roles.length} roles</footer>
            </section>

            {role ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <strong>Role Model</strong>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => setSelectedRole(null)}>×</button>
                </div>
                <div className="ua-profile is-role">
                  <div>
                    <h3>{role.name}</h3>
                    <p>{role.slug}</p>
                  </div>
                </div>
                <dl>
                  <div><dt>Duty Category</dt><dd>{role.category}</dd></div>
                  <div><dt>Description</dt><dd>{role.description}</dd></div>
                  <div><dt>Privilege Narrative</dt><dd>{role.narrative}</dd></div>
                  <div><dt>Least Privilege Baseline</dt><dd>{role.baseline}</dd></div>
                  <div><dt>Bindings</dt><dd>{role.bindings}</dd></div>
                </dl>
              </aside>
            ) : null}
          </div>
        ) : null}

        {tab === "Access Binding" ? (
          <div className={`ua-layout${binding ? " has-detail" : ""}`}>
            <section className="ua-panel">
              <div className="ua-panel-head">
                <div className="cmd-section-head">
                  <span className="cmd-section-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M10.2 13.8a3.6 3.6 0 0 1 0-5.1l1.4-1.4a3.6 3.6 0 0 1 5.1 5.1l-.8.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M13.8 10.2a3.6 3.6 0 0 1 0 5.1l-1.4 1.4a3.6 3.6 0 1 1-5.1-5.1l.8-.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="cmd-section-title">Access Binding</h2>
                    <p>One active role for each identity. Revoke before assigning another.</p>
                  </div>
                </div>
                <div className="ua-actions">
                  <button type="button" className="ua-ghost">Refresh</button>
                  <button type="button" className="ua-primary">+ Add Binding</button>
                </div>
              </div>

              <div className="ua-stats">
                <article><strong>1</strong><span>Bindings</span></article>
                <article><strong>1</strong><span>Active</span></article>
                <article><strong>0</strong><span>Suspended</span></article>
                <article><strong>0</strong><span>Revoked</span></article>
              </div>

              <div className="ua-toolbar">
                <label className="ua-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <input
                    value={search}
                    placeholder="Search identity, role, or description..."
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <select defaultValue="Status">
                  <option>Status</option>
                  <option>Active</option>
                  <option>Suspended</option>
                  <option>Revoked</option>
                </select>
              </div>

              <div className="ua-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Identity</th>
                      <th>Role</th>
                      <th>Valid Period</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bindings.map((row) => (
                      <tr
                        key={row.id}
                        className={row.id === selectedBinding ? "is-selected" : undefined}
                        onClick={() => setSelectedBinding(row.id)}
                      >
                        <td>
                          <span className="ua-id-cell">
                            <i>S</i>
                            <b>{row.identity}</b>
                          </span>
                        </td>
                        <td><span className="ua-linkish">{row.role}</span></td>
                        <td>{row.period}</td>
                        <td><span className="ua-badge is-active">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="ua-foot">Showing 1-{bindings.length} of {bindings.length} bindings</footer>
            </section>

            {binding ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <div className="ua-actions">
                    <button type="button" className="ua-ghost">Edit</button>
                    <button type="button" className="ua-danger">Revoke</button>
                  </div>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => setSelectedBinding(null)}>×</button>
                </div>
                <div className="ua-profile">
                  <i>S</i>
                  <div>
                    <h3>{binding.identity}</h3>
                    <p>{binding.role}</p>
                    <span className="ua-badge is-active">{binding.status}</span>
                  </div>
                </div>
                <dl>
                  <div><dt>Identity</dt><dd>{binding.identity}</dd></div>
                  <div><dt>Role</dt><dd>{binding.role}</dd></div>
                  <div><dt>Valid Period</dt><dd>{binding.period}</dd></div>
                  <div><dt>Description</dt><dd>{binding.description}</dd></div>
                  <div><dt>User Status</dt><dd>{binding.userStatus}</dd></div>
                </dl>
              </aside>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
