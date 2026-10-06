"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import TopHeader from "@/components/TopHeader";
import {
  accessLabel,
  assignRole,
  bindingPeriod,
  createHuman,
  createRole,
  deleteRole,
  listBindings,
  listRoles,
  listUsers,
  readRole,
  readUserAccess,
  setBindingStatus as updateBindingStatus,
  summarizeRoles,
  summarizeUsers,
  updateHuman,
  updateRole,
  type AccessBinding,
  type AccessRole,
  type AccessUser,
  type EffectiveAccess,
  type RoleSummary,
  type UserSummary,
} from "@/lib/access";

type Tab = "Identity Registry" | "Role Model" | "Access Binding";
type Composer = "user" | "role" | "binding" | null;

const CATEGORY_CLASS: Record<string, string> = {
  "Platform Administration": "is-blue",
  "Command Operations": "is-green",
  "Operations Control": "is-red",
  "Field Operations": "is-orange",
  "Fleet & Communications": "is-teal",
  "Read Only": "is-purple",
};

const EMPTY_USER = { name: "", username: "", email: "", password: "", department: "", title: "", sponsor: "", verification: "VERIFIED" };
const EMPTY_ROLE = { name: "", duty_category: "", description: "", privilege_narrative: "", least_privilege_baseline: "" };

export default function AccessView() {
  const [tab, setTab] = useState<Tab>("Identity Registry");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [identityType, setIdentityType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [bindingFilter, setBindingFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [bindingStatus, setBindingStatus] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [directory, setDirectory] = useState<AccessUser[]>([]);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [roleSummary, setRoleSummary] = useState<RoleSummary | null>(null);
  const [bindings, setBindings] = useState<AccessBinding[]>([]);
  const [selectedIdentity, setSelectedIdentity] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedBinding, setSelectedBinding] = useState<number | null>(null);
  const [roleDetail, setRoleDetail] = useState<AccessRole | null>(null);
  const [access, setAccess] = useState<EffectiveAccess | null>(null);
  const [composer, setComposer] = useState<Composer>(null);
  const [editing, setEditing] = useState(false);
  const [userDraft, setUserDraft] = useState(EMPTY_USER);
  const [roleDraft, setRoleDraft] = useState(EMPTY_ROLE);
  const [bindingDraft, setBindingDraft] = useState({ user_id: "", role_id: "", description: "" });
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNote("");
    Promise.all([
      summarizeUsers(controller.signal),
      listUsers({ page, limit: 20, q: debouncedSearch, identity_type: identityType, status: statusFilter, verification: verificationFilter, access_binding: bindingFilter }, controller.signal),
      listUsers({ page: 1, limit: 100 }, controller.signal),
      summarizeRoles(controller.signal),
      listRoles(controller.signal),
      listBindings(undefined, controller.signal),
    ])
      .then(([summary, list, everyone, roleCards, roleList, bindingList]) => {
        if (controller.signal.aborted) return;
        setUserSummary(summary);
        setUsers(list.items);
        setUserTotal(list.total);
        setDirectory(everyone.items);
        setRoleSummary(roleCards);
        setRoles(roleList.items);
        setBindings(bindingList.items);
        setSelectedIdentity((current) => current ?? list.items[0]?.id ?? null);
        setSelectedRole((current) => current ?? roleList.items[0]?.id ?? null);
        setSelectedBinding((current) => current ?? bindingList.items[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setNote(reason instanceof Error ? reason.message : "Couldn't load user access");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [bindingFilter, debouncedSearch, identityType, page, statusFilter, tick, verificationFilter]);

  useEffect(() => {
    if (selectedRole == null) {
      setRoleDetail(null);
      return;
    }
    const controller = new AbortController();
    readRole(selectedRole, controller.signal)
      .then((role) => {
        if (!controller.signal.aborted) setRoleDetail(role);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRoleDetail(roles.find((item) => item.id === selectedRole) ?? null);
      });
    return () => controller.abort();
  }, [roles, selectedRole]);

  useEffect(() => {
    if (selectedIdentity == null) {
      setAccess(null);
      return;
    }
    const controller = new AbortController();
    readUserAccess(selectedIdentity, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setAccess(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAccess(null);
      });
    return () => controller.abort();
  }, [selectedIdentity, tick]);

  const names = useMemo(() => new Map(directory.map((user) => [user.id, user.name])), [directory]);
  const identity = directory.find((row) => row.id === selectedIdentity) ?? users.find((row) => row.id === selectedIdentity) ?? null;
  const role = roleDetail && roleDetail.id === selectedRole ? roleDetail : roles.find((row) => row.id === selectedRole) ?? null;
  const visibleRoles = roles.filter((row) => {
    const text = debouncedSearch.toLowerCase();
    const matchesText = !text || `${row.display_name} ${row.name} ${row.duty_category} ${row.description}`.toLowerCase().includes(text);
    return matchesText && (!categoryFilter || row.duty_category === categoryFilter);
  });
  const visibleBindings = bindings.filter((row) => {
    const text = debouncedSearch.toLowerCase();
    const identityName = names.get(row.user_id) ?? "";
    const matchesText = !text || `${identityName} ${row.role} ${row.description ?? ""}`.toLowerCase().includes(text);
    return matchesText && (!bindingStatus || row.status === bindingStatus);
  });
  const binding = bindings.find((row) => row.id === selectedBinding) ?? null;
  const categories = [...new Set(roles.map((item) => item.duty_category))];
  const pages = Math.max(1, Math.ceil(userTotal / 20));
  const bindingCounts = {
    total: bindings.length,
    active: bindings.filter((row) => row.status === "ACTIVE").length,
    suspended: bindings.filter((row) => row.status === "SUSPENDED").length,
    revoked: bindings.filter((row) => row.status === "REVOKED").length,
  };

  function refresh() {
    setTick((value) => value + 1);
  }

  function openTab(next: Tab) {
    setTab(next);
    setSearch("");
    setComposer(null);
    setEditing(false);
    setNote("");
  }

  async function run(task: () => Promise<unknown>) {
    setPending(true);
    setNote("");
    try {
      await task();
      setComposer(null);
      setEditing(false);
      refresh();
    } catch (reason) {
      setNote(reason instanceof Error ? reason.message : "Request failed");
    } finally {
      setPending(false);
    }
  }

  async function saveUser() {
    const name = userDraft.name.trim();
    const username = userDraft.username.trim();
    const email = userDraft.email.trim();
    if (!name || !username || !email) {
      setNote("Name, username, and email are required");
      return;
    }
    if (composer === "user") {
      if (userDraft.password.trim().length < 8) {
        setNote("Password must be at least 8 characters");
        return;
      }
      await run(() => createHuman({
        name,
        username,
        email,
        password: userDraft.password,
        ...(userDraft.department.trim() ? { department: userDraft.department.trim() } : {}),
        ...(userDraft.title.trim() ? { title: userDraft.title.trim() } : {}),
      }));
      return;
    }
    if (!identity) return;
    const body: Record<string, string> = {};
    if (name !== identity.name) body.name = name;
    if (username !== identity.username) body.username = username;
    if (email.toLowerCase() !== identity.email.toLowerCase()) body.email = email;
    if (userDraft.department.trim() && userDraft.department.trim() !== (identity.department ?? "")) body.department = userDraft.department.trim();
    if (userDraft.title.trim()) body.title = userDraft.title.trim();
    if (userDraft.sponsor.trim()) body.sponsor = userDraft.sponsor.trim();
    if (userDraft.verification !== identity.verification) body.verification = userDraft.verification;
    if (!Object.keys(body).length) {
      setNote("No profile changes");
      return;
    }
    await run(() => updateHuman(identity.id, body));
  }

  async function saveRole() {
    const body = {
      name: roleDraft.name.trim(),
      duty_category: roleDraft.duty_category.trim(),
      description: roleDraft.description.trim(),
      privilege_narrative: roleDraft.privilege_narrative.trim(),
      least_privilege_baseline: roleDraft.least_privilege_baseline.trim(),
    };
    if (!body.name || !body.duty_category || !body.description) {
      setNote("Name, duty category, and description are required");
      return;
    }
    if (composer === "role") {
      await run(() => createRole(body));
      return;
    }
    if (!role || role.is_protected) return;
    await run(() => updateRole(role.id, body));
  }

  return (
    <div className="cmd ua">
      <TopHeader />
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
              <p>Identities, roles, and the binding that opens each account.</p>
            </div>
          </div>
        </header>

        <nav className="ua-tabs" aria-label="User access sections">
          {(["Identity Registry", "Role Model", "Access Binding"] as Tab[]).map((item) => (
            <button key={item} type="button" className={tab === item ? "is-active" : undefined} onClick={() => openTab(item)}>
              {item}
            </button>
          ))}
        </nav>

        {tab === "Identity Registry" ? (
          <div className={`ua-layout${identity || composer === "user" ? " has-detail" : ""}`}>
            <section className="ua-panel">
              <PanelHead
                title="Identity Registry"
                text="Humans and services that can sign in or call SYNAPSE-T APIs."
                onRefresh={refresh}
                onAdd={() => {
                  setComposer("user");
                  setEditing(false);
                  setUserDraft(EMPTY_USER);
                  setNote("");
                }}
                addLabel="+ Add Identity"
              />
              <div className="ua-stats">
                <article><strong>{userSummary?.active_humans ?? 0}</strong><span>Active Humans</span></article>
                <article><strong>{userSummary?.inactive_humans ?? 0}</strong><span>Inactive Humans</span></article>
                <article><strong>{userSummary?.pending_verification ?? 0}</strong><span>Pending Verification</span></article>
                <article><strong>{userSummary?.total_services ?? 0}</strong><span>Services</span></article>
              </div>
              <div className="ua-toolbar">
                <SearchBox value={search} placeholder="Search identity, username, email, department..." onChange={(value) => { setSearch(value); setPage(1); }} />
                <select value={identityType} onChange={(event) => { setIdentityType(event.target.value); setPage(1); }}>
                  <option value="">Type</option>
                  <option value="HUMAN">Human</option>
                  <option value="SERVICE">Service</option>
                </select>
                <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                  <option value="">Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="DISABLED">Disabled</option>
                </select>
                <select value={verificationFilter} onChange={(event) => { setVerificationFilter(event.target.value); setPage(1); }}>
                  <option value="">Verification</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING">Pending</option>
                </select>
                <select value={bindingFilter} onChange={(event) => { setBindingFilter(event.target.value); setPage(1); }}>
                  <option value="">Access Binding</option>
                  <option value="BOUND">Bound</option>
                  <option value="NO_BINDING">Unbound</option>
                </select>
              </div>
              {note && composer !== "user" && !editing ? <p className="ua-note">{note}</p> : null}
              <UserTable rows={users} selectedId={selectedIdentity} loading={loading} onSelect={(id) => { setSelectedIdentity(id); setComposer(null); setEditing(false); }} />
              <footer className="ua-foot">
                Showing {userTotal ? (page - 1) * 20 + 1 : 0}-{Math.min(page * 20, userTotal)} of {userTotal} identities
                <span>
                  <button type="button" className="ua-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
                  <button type="button" className="ua-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button>
                </span>
              </footer>
            </section>
            {composer === "user" || editing ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <strong>{composer === "user" ? "Add Identity" : "Edit Identity"}</strong>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => { setComposer(null); setEditing(false); }}>×</button>
                </div>
                <form className="ua-form" onSubmit={(event) => { event.preventDefault(); void saveUser(); }}>
                  <Field label="Name"><input value={userDraft.name} onChange={(event) => setUserDraft({ ...userDraft, name: event.target.value })} /></Field>
                  <Field label="Username"><input value={userDraft.username} onChange={(event) => setUserDraft({ ...userDraft, username: event.target.value })} /></Field>
                  <Field label="Email"><input value={userDraft.email} onChange={(event) => setUserDraft({ ...userDraft, email: event.target.value })} /></Field>
                  {composer === "user" ? <Field label="Password"><input type="password" value={userDraft.password} onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })} /></Field> : null}
                  <Field label="Department"><input value={userDraft.department} onChange={(event) => setUserDraft({ ...userDraft, department: event.target.value })} /></Field>
                  <Field label="Title"><input value={userDraft.title} onChange={(event) => setUserDraft({ ...userDraft, title: event.target.value })} /></Field>
                  {editing ? (
                    <>
                      <Field label="Sponsor"><input value={userDraft.sponsor} onChange={(event) => setUserDraft({ ...userDraft, sponsor: event.target.value })} /></Field>
                      <Field label="Verification">
                        <select value={userDraft.verification} onChange={(event) => setUserDraft({ ...userDraft, verification: event.target.value })}>
                          <option value="VERIFIED">Verified</option>
                          <option value="PENDING">Pending</option>
                        </select>
                      </Field>
                    </>
                  ) : null}
                  {note ? <p className="ua-note">{note}</p> : null}
                  <button type="submit" className="ua-primary" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
                </form>
              </aside>
            ) : identity ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <strong>Identity</strong>
                  <button
                    type="button"
                    className="ua-ghost"
                    onClick={() => {
                      setEditing(true);
                      setComposer(null);
                      setUserDraft({ ...EMPTY_USER, name: identity.name, username: identity.username, email: identity.email, department: identity.department ?? "", verification: identity.verification });
                      setNote("");
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => setSelectedIdentity(null)}>×</button>
                </div>
                <div className="ua-profile">
                  <i>{identity.name.slice(0, 1).toUpperCase()}</i>
                  <div>
                    <h3>{identity.name}</h3>
                    <p>{accessLabel(identity.identity_type)} identity</p>
                    <span className={`ua-status is-${identity.status.toLowerCase()}`}>{accessLabel(identity.status)}</span>
                  </div>
                </div>
                <dl>
                  <div><dt>Name</dt><dd>{identity.name}</dd></div>
                  <div><dt>Username</dt><dd>{identity.username}</dd></div>
                  <div><dt>Email</dt><dd>{identity.email}</dd></div>
                  <div><dt>Department</dt><dd>{identity.department ?? "—"}</dd></div>
                  <div><dt>Verification</dt><dd>{accessLabel(identity.verification)}</dd></div>
                  <div><dt>Status</dt><dd>{accessLabel(identity.status)}</dd></div>
                  <div><dt>Access Binding</dt><dd>{accessLabel(identity.access_binding)}</dd></div>
                  {access ? <div><dt>Role</dt><dd>{access.role ? accessLabel(access.role) : "—"}</dd></div> : null}
                </dl>
                {access?.permissions?.length ? (
                  <div className="ua-perms">
                    {[...new Set(access.permissions.map((item) => item.split(".")[0]))].map((item) => (
                      <span key={item}>{accessLabel(item)}</span>
                    ))}
                  </div>
                ) : null}
              </aside>
            ) : null}
          </div>
        ) : null}

        {tab === "Role Model" ? (
          <div className={`ua-layout${role || composer === "role" ? " has-detail" : ""}`}>
            <section className="ua-panel">
              <PanelHead
                title="Role Model"
                text="Define what each role can do across the platform."
                onRefresh={refresh}
                onAdd={() => {
                  setComposer("role");
                  setEditing(false);
                  setRoleDraft(EMPTY_ROLE);
                  setNote("");
                }}
                addLabel="+ Add Role"
                icon="role"
              />
              <div className="ua-stats is-3">
                <article><strong>{roleSummary?.total ?? roles.length}</strong><span>Total Roles</span></article>
                <article><strong>{roleSummary?.system_roles ?? roles.filter((item) => item.is_system).length}</strong><span>System Roles</span></article>
                <article><strong>{roleSummary?.custom_roles ?? roles.filter((item) => !item.is_system).length}</strong><span>Custom Roles</span></article>
              </div>
              <div className="ua-toolbar">
                <SearchBox value={search} placeholder="Search role, duty category, or description..." onChange={setSearch} />
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="">Duty Category</option>
                  {categories.map((name) => <option key={name}>{name}</option>)}
                </select>
              </div>
              {note && composer !== "role" && !editing ? <p className="ua-note">{note}</p> : null}
              <div className="ua-table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Role Name</th><th>Duty Category</th><th>Description</th><th>Bindings</th></tr>
                  </thead>
                  <tbody>
                    {visibleRoles.length === 0 ? (
                      <tr><td className="ua-empty" colSpan={5}>{loading ? "Loading roles…" : "No roles"}</td></tr>
                    ) : visibleRoles.map((row, index) => (
                      <tr key={row.id} className={row.id === selectedRole ? "is-selected" : undefined} onClick={() => { setSelectedRole(row.id); setComposer(null); setEditing(false); }}>
                        <td>{index + 1}</td>
                        <td><span className="ua-role-cell"><b>{row.display_name}</b><small>{row.name}</small></span></td>
                        <td><span className={`ua-tag ${CATEGORY_CLASS[row.duty_category] ?? ""}`}>{row.duty_category}</span></td>
                        <td>{row.description}</td>
                        <td>{row.assigned_users}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="ua-foot">Showing {visibleRoles.length ? 1 : 0}-{visibleRoles.length} of {visibleRoles.length} roles</footer>
            </section>
            {composer === "role" || (editing && role) ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <strong>{composer === "role" ? "Add Role" : "Edit Role"}</strong>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => { setComposer(null); setEditing(false); }}>×</button>
                </div>
                <form className="ua-form" onSubmit={(event) => { event.preventDefault(); void saveRole(); }}>
                  <Field label="Name"><input value={roleDraft.name} onChange={(event) => setRoleDraft({ ...roleDraft, name: event.target.value })} /></Field>
                  <Field label="Duty Category"><input value={roleDraft.duty_category} onChange={(event) => setRoleDraft({ ...roleDraft, duty_category: event.target.value })} /></Field>
                  <Field label="Description"><textarea value={roleDraft.description} onChange={(event) => setRoleDraft({ ...roleDraft, description: event.target.value })} /></Field>
                  <Field label="Privilege Narrative"><textarea value={roleDraft.privilege_narrative} onChange={(event) => setRoleDraft({ ...roleDraft, privilege_narrative: event.target.value })} /></Field>
                  <Field label="Least Privilege Baseline"><textarea value={roleDraft.least_privilege_baseline} onChange={(event) => setRoleDraft({ ...roleDraft, least_privilege_baseline: event.target.value })} /></Field>
                  {note ? <p className="ua-note">{note}</p> : null}
                  <button type="submit" className="ua-primary" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
                </form>
              </aside>
            ) : role ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <strong>Role Model</strong>
                  {!role.is_protected ? (
                    <div className="ua-actions">
                      <button type="button" className="ua-ghost" onClick={() => { setEditing(true); setRoleDraft({ name: role.display_name, duty_category: role.duty_category, description: role.description, privilege_narrative: role.privilege_narrative, least_privilege_baseline: role.least_privilege_baseline }); setNote(""); }}>Edit</button>
                      <button type="button" className="ua-danger" disabled={pending} onClick={() => void run(() => deleteRole(role.id))}>Delete</button>
                    </div>
                  ) : null}
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => setSelectedRole(null)}>×</button>
                </div>
                <div className="ua-profile is-role">
                  <div>
                    <h3>{role.display_name}</h3>
                    <p>{role.name}</p>
                  </div>
                </div>
                <dl>
                  <div><dt>Duty Category</dt><dd>{role.duty_category}</dd></div>
                  <div><dt>Description</dt><dd>{role.description}</dd></div>
                  <div><dt>Privilege Narrative</dt><dd>{role.privilege_narrative}</dd></div>
                  <div><dt>Least Privilege Baseline</dt><dd>{role.least_privilege_baseline}</dd></div>
                  <div><dt>Bindings</dt><dd>{role.assigned_users}</dd></div>
                  <div><dt>Protection</dt><dd>{role.is_protected ? "System role" : "Custom role"}</dd></div>
                </dl>
              </aside>
            ) : null}
          </div>
        ) : null}

        {tab === "Access Binding" ? (
          <div className={`ua-layout${binding || composer === "binding" ? " has-detail" : ""}`}>
            <section className="ua-panel">
              <PanelHead
                title="Access Binding"
                text="One active role for each identity. Revoke before assigning another."
                onRefresh={refresh}
                onAdd={() => {
                  setComposer("binding");
                  setBindingDraft({ user_id: String(directory[0]?.id ?? ""), role_id: String(roles[0]?.id ?? ""), description: "" });
                  setNote("");
                }}
                addLabel="+ Add Binding"
                icon="binding"
              />
              <div className="ua-stats">
                <article><strong>{bindingCounts.total}</strong><span>Bindings</span></article>
                <article><strong>{bindingCounts.active}</strong><span>Active</span></article>
                <article><strong>{bindingCounts.suspended}</strong><span>Suspended</span></article>
                <article><strong>{bindingCounts.revoked}</strong><span>Revoked</span></article>
              </div>
              <div className="ua-toolbar">
                <SearchBox value={search} placeholder="Search identity, role, or description..." onChange={setSearch} />
                <select value={bindingStatus} onChange={(event) => setBindingStatus(event.target.value)}>
                  <option value="">Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="REVOKED">Revoked</option>
                </select>
              </div>
              {note && composer !== "binding" ? <p className="ua-note">{note}</p> : null}
              <div className="ua-table-wrap">
                <table>
                  <thead>
                    <tr><th>Identity</th><th>Role</th><th>Valid Period</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {visibleBindings.length === 0 ? (
                      <tr><td className="ua-empty" colSpan={4}>{loading ? "Loading bindings…" : "No bindings"}</td></tr>
                    ) : visibleBindings.map((row) => (
                      <tr key={row.id} className={row.id === selectedBinding ? "is-selected" : undefined} onClick={() => { setSelectedBinding(row.id); setComposer(null); }}>
                        <td>
                          <span className="ua-id-cell">
                            <i>{(names.get(row.user_id) ?? "?").slice(0, 1).toUpperCase()}</i>
                            <b>{names.get(row.user_id) ?? `User ${row.user_id}`}</b>
                          </span>
                        </td>
                        <td><span className="ua-linkish">{accessLabel(row.role)}</span></td>
                        <td>{bindingPeriod(row)}</td>
                        <td><span className={`ua-badge is-${row.status.toLowerCase()}`}>{accessLabel(row.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="ua-foot">Showing {visibleBindings.length ? 1 : 0}-{visibleBindings.length} of {visibleBindings.length} bindings</footer>
            </section>
            {composer === "binding" ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <strong>Add Binding</strong>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => setComposer(null)}>×</button>
                </div>
                <form
                  className="ua-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(() => assignRole({
                      user_id: Number(bindingDraft.user_id),
                      role_id: Number(bindingDraft.role_id),
                      ...(bindingDraft.description.trim() ? { description: bindingDraft.description.trim() } : {}),
                    }));
                  }}
                >
                  <Field label="Identity">
                    <select value={bindingDraft.user_id} onChange={(event) => setBindingDraft({ ...bindingDraft, user_id: event.target.value })}>
                      {directory.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Role">
                    <select value={bindingDraft.role_id} onChange={(event) => setBindingDraft({ ...bindingDraft, role_id: event.target.value })}>
                      {roles.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}
                    </select>
                  </Field>
                  <Field label="Description"><input value={bindingDraft.description} onChange={(event) => setBindingDraft({ ...bindingDraft, description: event.target.value })} /></Field>
                  {note ? <p className="ua-note">{note}</p> : null}
                  <button type="submit" className="ua-primary" disabled={pending}>{pending ? "Saving..." : "Assign"}</button>
                </form>
              </aside>
            ) : binding ? (
              <aside className="ua-detail">
                <div className="ua-detail-head">
                  <div className="ua-actions">
                    {binding.status !== "SUSPENDED" ? <button type="button" className="ua-ghost" disabled={pending} onClick={() => void run(() => updateBindingStatus(binding.id, "SUSPENDED"))}>Suspend</button> : null}
                    {binding.status !== "ACTIVE" ? <button type="button" className="ua-ghost" disabled={pending} onClick={() => void run(() => updateBindingStatus(binding.id, "ACTIVE"))}>Activate</button> : null}
                    {binding.status !== "REVOKED" ? <button type="button" className="ua-danger" disabled={pending} onClick={() => void run(() => updateBindingStatus(binding.id, "REVOKED"))}>Revoke</button> : null}
                  </div>
                  <button type="button" className="ua-close" aria-label="Close" onClick={() => setSelectedBinding(null)}>×</button>
                </div>
                <div className="ua-profile">
                  <i>{(names.get(binding.user_id) ?? "?").slice(0, 1).toUpperCase()}</i>
                  <div>
                    <h3>{names.get(binding.user_id) ?? `User ${binding.user_id}`}</h3>
                    <p>{accessLabel(binding.role)}</p>
                    <span className={`ua-badge is-${binding.status.toLowerCase()}`}>{accessLabel(binding.status)}</span>
                  </div>
                </div>
                <dl>
                  <div><dt>Identity</dt><dd>{names.get(binding.user_id) ?? `User ${binding.user_id}`}</dd></div>
                  <div><dt>Role</dt><dd>{accessLabel(binding.role)}</dd></div>
                  <div><dt>Valid Period</dt><dd>{bindingPeriod(binding)}</dd></div>
                  <div><dt>Description</dt><dd>{binding.description || "—"}</dd></div>
                  <div><dt>User Status</dt><dd>{accessLabel(binding.user_status)}</dd></div>
                </dl>
              </aside>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function PanelHead({
  title,
  text,
  onRefresh,
  onAdd,
  addLabel,
  icon = "users",
}: {
  title: string;
  text: string;
  onRefresh: () => void;
  onAdd: () => void;
  addLabel: string;
  icon?: "users" | "role" | "binding";
}) {
  return (
    <div className="ua-panel-head">
      <div className="cmd-section-head">
        <span className="cmd-section-icon" aria-hidden="true">
          {icon === "role" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3.5 19 6.2v4.6c0 4.4-2.9 7.4-7 8.7-4.1-1.3-7-4.3-7-8.7V6.2L12 3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9.2 12.1 11 13.9l3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : icon === "binding" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M10.2 13.8a3.6 3.6 0 0 1 0-5.1l1.4-1.4a3.6 3.6 0 0 1 5.1 5.1l-.8.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M13.8 10.2a3.6 3.6 0 0 1 0 5.1l-1.4 1.4a3.6 3.6 0 1 1-5.1-5.1l.8-.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.7" />
              <path d="M3.8 18.2c.7-2.6 2.6-3.9 5.2-3.9s4.5 1.3 5.2 3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="17.2" cy="9.2" r="2.2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M20.8 17.2c-.4-1.6-1.6-2.5-3.6-2.5s-3.2.9-3.6 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <div>
          <h2 className="cmd-section-title">{title}</h2>
          <p>{text}</p>
        </div>
      </div>
      <div className="ua-actions">
        <button type="button" className="ua-ghost" onClick={onRefresh}>Refresh</button>
        <button type="button" className="ua-primary" onClick={onAdd}>{addLabel}</button>
      </div>
    </div>
  );
}

function UserTable({ rows, selectedId, loading, onSelect }: { rows: AccessUser[]; selectedId: number | null; loading: boolean; onSelect: (id: number) => void }) {
  return (
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
          {rows.length === 0 ? (
            <tr><td className="ua-empty" colSpan={6}>{loading ? "Loading identities…" : "No identities"}</td></tr>
          ) : rows.map((row) => (
            <tr key={row.id} className={row.id === selectedId ? "is-selected" : undefined} onClick={() => onSelect(row.id)}>
              <td>
                <span className="ua-id-cell">
                  <i>{row.name.slice(0, 1).toUpperCase()}</i>
                  <span><b>{row.name}</b><small>{row.username}</small></span>
                </span>
              </td>
              <td>{row.department ?? "—"}</td>
              <td>{row.email}</td>
              <td><span className={`ua-status is-${row.status.toLowerCase()}`}>{accessLabel(row.status)}</span></td>
              <td><span className="ua-linkish">{accessLabel(row.verification)}</span></td>
              <td><span className="ua-bound">{accessLabel(row.access_binding)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchBox({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="ua-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="ua-field">{label}{children}</label>;
}
