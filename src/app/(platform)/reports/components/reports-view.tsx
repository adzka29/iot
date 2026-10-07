"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TopHeader from "@/components/TopHeader";

type PageTab = "generate" | "history" | "scheduled";
type ReportType = "personnel" | "operation" | "incident" | "custom";
type TargetMode = "single" | "multiple" | "group";
type RangePreset = "6h" | "24h" | "7d" | "30d" | "custom";
type SectionId = "overview" | "vitals" | "history" | "alerts" | "events" | "equipment";

const PERSONNEL = [
  { id: "108", label: "S-108", unit: "Bravo 2-1 — Group Bravo", status: "Active" },
  { id: "104", label: "S-104", unit: "Alpha 1-1 — Group Alpha", status: "Critical" },
  { id: "107", label: "S-107", unit: "Bravo 1-2 — Group Bravo", status: "Active" },
  { id: "101", label: "S-101", unit: "Alpha 2-1 — Group Alpha", status: "Active" },
];

const REPORT_TYPES: { id: ReportType; title: string; note: string; tone: string }[] = [
  { id: "personnel", title: "Personnel Report", note: "Individual soldier report including movement, vitals, alerts, and events.", tone: "blue" },
  { id: "operation", title: "Operation Report", note: "Mission and patrol summary across selected units and time windows.", tone: "green" },
  { id: "incident", title: "Incident Report", note: "Focused export for SOS, casualty, and critical alert investigation.", tone: "red" },
  { id: "custom", title: "Custom Report", note: "Compose a free-form operational brief from selected data modules.", tone: "violet" },
];

const SECTIONS: { id: SectionId; title: string; tone: string }[] = [
  { id: "overview", title: "Overview", tone: "blue" },
  { id: "vitals", title: "Vitals", tone: "rose" },
  { id: "history", title: "History", tone: "cyan" },
  { id: "alerts", title: "Alerts", tone: "amber" },
  { id: "events", title: "Events", tone: "sky" },
  { id: "equipment", title: "Equipment", tone: "slate" },
];

const HISTORY_ROWS = [
  { id: "r-2041", title: "Soldier 108 - Activity Report", type: "Personnel", when: "06 Oct 2026, 14:28", format: "PDF", status: "Ready" },
  { id: "r-2038", title: "Bravo Patrol Summary", type: "Operation", when: "06 Oct 2026, 09:12", format: "PDF", status: "Ready" },
  { id: "r-2031", title: "SOS Cluster Review", type: "Incident", when: "05 Oct 2026, 21:44", format: "CSV", status: "Ready" },
  { id: "r-2024", title: "Night Watch Brief", type: "Custom", when: "05 Oct 2026, 06:05", format: "PDF", status: "Expired" },
];

const SCHEDULED_ROWS = [
  { id: "s-12", title: "Daily Bravo Activity", cadence: "Every day · 06:00", target: "Group Bravo", next: "07 Oct 2026, 06:00", status: "Active" },
  { id: "s-09", title: "Weekly Incident Digest", cadence: "Every Monday · 08:00", target: "All personnel", next: "12 Oct 2026, 08:00", status: "Active" },
  { id: "s-04", title: "Shift Handover Pack", cadence: "Every 12 hours", target: "Alpha + Bravo", next: "Paused", status: "Paused" },
];

const PREVIEW_EVENTS = [
  { time: "14:20:11", text: "Current position update", source: "GNSS", coords: "-6.17482, 106.82701" },
  { time: "14:12:44", text: "Moved northeast along patrol corridor", source: "GNSS", coords: "-6.17510, 106.82655" },
  { time: "13:58:02", text: "Dead reckoning segment accepted", source: "Dead Reckoning", coords: "-6.17541, 106.82612" },
  { time: "13:41:19", text: "Heart rate window normalized", source: "Chest Strap", coords: "-6.17568, 106.82574" },
];

function TypeIcon({ id }: { id: ReportType }) {
  if (id === "personnel") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.1" fill="currentColor" />
        <path d="M5.3 19.2c1.2-3.3 3.5-4.9 6.7-4.9s5.5 1.6 6.7 4.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "operation") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 20V4.5l9.2 3.2L6 11" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M6 20h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "incident") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.2 20.2 19H3.8L12 4.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 10v4.2M12 16.8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 3.6V8h4.5M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionIcon({ id }: { id: SectionId }) {
  if (id === "overview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3" fill="currentColor" />
        <path d="M5.4 19c1.2-3.2 3.4-4.8 6.6-4.8s5.4 1.6 6.6 4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "vitals") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 19s-6.5-4.1-8.4-7.5C2.2 9.2 3.4 6.5 6.1 6.1c1.5-.2 2.9.5 3.9 1.6L12 9.8l2-2.1c1-1.1 2.4-1.8 3.9-1.6 2.7.4 3.9 3.1 2.5 5.4C18.5 14.9 12 19 12 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M4.8 12.2h3.2l1.6-2.4 2.2 4.6 1.5-2.2h2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "history") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="17.5" r="2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8.2 15.8 15.8 8.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "alerts") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.2 20.2 19H3.8L12 4.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 10v4M12 16.6h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "events") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="4.5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function rangeLabel(preset: RangePreset) {
  if (preset === "6h") return "Last 6 Hours";
  if (preset === "24h") return "Last 24 Hours";
  if (preset === "7d") return "Last 7 Days";
  if (preset === "30d") return "Last 30 Days";
  return "Custom Range";
}

export default function ReportsView() {
  const [tab, setTab] = useState<PageTab>("generate");
  const [reportType, setReportType] = useState<ReportType>("personnel");
  const [title, setTitle] = useState("Soldier 108 - Activity Report");
  const [description, setDescription] = useState(
    "Daily activity report including movement, vitals, alerts and operational events.",
  );
  const [targetMode, setTargetMode] = useState<TargetMode>("single");
  const [soldierId, setSoldierId] = useState("108");
  const [range, setRange] = useState<RangePreset>("24h");
  const [fromAt, setFromAt] = useState("2026-10-06T00:00");
  const [toAt, setToAt] = useState("2026-10-06T23:59");
  const [sections, setSections] = useState<Record<SectionId, boolean>>({
    overview: true,
    vitals: true,
    history: true,
    alerts: true,
    events: true,
    equipment: false,
  });
  const [format, setFormat] = useState("pdf");
  const [detail, setDetail] = useState("standard");
  const [includeMap, setIncludeMap] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSource, setIncludeSource] = useState(true);

  const soldier = PERSONNEL.find((item) => item.id === soldierId) ?? PERSONNEL[0];

  const periodText = useMemo(() => {
    const from = new Date(fromAt);
    const to = new Date(toAt);
    const fmt = (value: Date) =>
      value.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    return `${fmt(from)} – ${fmt(to)}`;
  }, [fromAt, toAt]);

  function toggleSection(id: SectionId) {
    setSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function chooseSoldier(id: string) {
    setSoldierId(id);
    const next = PERSONNEL.find((item) => item.id === id);
    if (next) setTitle(`Soldier ${next.id} - Activity Report`);
  }

  function applyRange(preset: RangePreset) {
    setRange(preset);
    if (preset === "custom") return;
    const end = new Date("2026-10-06T23:59:00");
    const start = new Date(end);
    if (preset === "6h") start.setHours(end.getHours() - 6);
    if (preset === "24h") start.setHours(0, 0, 0, 0);
    if (preset === "7d") start.setDate(end.getDate() - 6);
    if (preset === "30d") start.setDate(end.getDate() - 29);
    const stamp = (value: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
    };
    setFromAt(stamp(start));
    setToAt(stamp(end));
  }

  return (
    <div className="cmd rp">
      <TopHeader />
      <main className="rp-body">
        <header className="rp-head">
          <div className="cmd-page-head">
            <span className="cmd-page-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" stroke="currentColor" strokeWidth="1.6" />
                <path d="M14 3.6V8h4.5M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h1 className="cmd-page-title">Reports</h1>
              <p>Generate and manage operational reports from personnel, operations, and system data.</p>
            </div>
          </div>
          <Link href="/dashboard" className="cmd-back-map">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4.5 10.2 12 4.5l7.5 5.7V19a1.5 1.5 0 0 1-1.5 1.5h-3.2v-5.2h-5.6V20.5H6A1.5 1.5 0 0 1 4.5 19v-8.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            Back to Map
          </Link>
        </header>

        <div className="rp-tabs" role="tablist" aria-label="Reports sections">
          {(
            [
              ["generate", "Generate Report"],
              ["history", "Report History"],
              ["scheduled", "Scheduled Reports"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "is-active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "generate" ? (
          <div className="rp-workspace">
            <section className="rp-config" aria-label="Report configuration">
              <div className="rp-scroll">
                <div className="rp-block">
                  <h2>Report Type</h2>
                  <div className="rp-types">
                    {REPORT_TYPES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`rp-type is-${item.tone}${reportType === item.id ? " is-active" : ""}`}
                        onClick={() => setReportType(item.id)}
                        aria-pressed={reportType === item.id}
                      >
                        <span className="rp-type-icon">
                          <TypeIcon id={item.id} />
                        </span>
                        <strong>{item.title}</strong>
                        <small>{item.note}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rp-block">
                  <h2>Report Configuration</h2>
                  <label className="rp-field">
                    <span>Report Title</span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} />
                  </label>
                  <label className="rp-field">
                    <span>Description (Optional)</span>
                    <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
                  </label>
                </div>

                <div className="rp-block">
                  <h2>Target Selection</h2>
                  <div className="rp-radios" role="radiogroup" aria-label="Target mode">
                    {(
                      [
                        ["single", "Single Personnel"],
                        ["multiple", "Multiple Personnel"],
                        ["group", "Group / Team"],
                      ] as const
                    ).map(([id, label]) => (
                      <label key={id} className={targetMode === id ? "is-on" : ""}>
                        <input
                          type="radio"
                          name="target-mode"
                          checked={targetMode === id}
                          onChange={() => setTargetMode(id)}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <label className="rp-field">
                    <span>Selected Target</span>
                    <div className="rp-select">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8" r="3" fill="currentColor" />
                        <path d="M5.4 19c1.2-3.2 3.4-4.8 6.6-4.8s5.4 1.6 6.6 4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                      <select value={soldierId} onChange={(event) => chooseSoldier(event.target.value)}>
                        {PERSONNEL.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}, {item.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>

                <div className="rp-block">
                  <h2>Date & Time Range</h2>
                  <div className="rp-range-presets">
                    {(["6h", "24h", "7d", "30d", "custom"] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={range === preset ? "is-active" : ""}
                        onClick={() => applyRange(preset)}
                      >
                        {rangeLabel(preset)}
                      </button>
                    ))}
                  </div>
                  <div className="rp-range-inputs">
                    <label className="rp-field">
                      <span>From</span>
                      <input type="datetime-local" value={fromAt} onChange={(event) => { setFromAt(event.target.value); setRange("custom"); }} />
                    </label>
                    <label className="rp-field">
                      <span>To</span>
                      <input type="datetime-local" value={toAt} onChange={(event) => { setToAt(event.target.value); setRange("custom"); }} />
                    </label>
                  </div>
                </div>

                <div className="rp-block">
                  <h2>Include Sections</h2>
                  <div className="rp-sections">
                    {SECTIONS.map((section) => {
                      const on = sections[section.id];
                      return (
                        <button
                          key={section.id}
                          type="button"
                          className={`rp-section is-${section.tone}${on ? " is-on" : ""}`}
                          aria-pressed={on}
                          onClick={() => toggleSection(section.id)}
                        >
                          <span className="rp-section-icon">
                            <SectionIcon id={section.id} />
                          </span>
                          <strong>{section.title}</strong>
                          <span className={`rp-check${on ? " is-on" : ""}`} aria-hidden="true">
                            {on ? (
                              <svg viewBox="0 0 16 16" fill="none">
                                <path d="m3.6 8.2 2.8 2.8 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rp-block">
                  <h2>Output Settings</h2>
                  <div className="rp-output-grid">
                    <label className="rp-field">
                      <span>Format</span>
                      <div className="rp-select">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M14 3.6V8h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        </svg>
                        <select value={format} onChange={(event) => setFormat(event.target.value)}>
                          <option value="pdf">PDF (Recommended)</option>
                          <option value="csv">CSV</option>
                          <option value="json">JSON</option>
                        </select>
                      </div>
                    </label>
                    <label className="rp-field">
                      <span>Detail Level</span>
                      <div className="rp-select">
                        <select value={detail} onChange={(event) => setDetail(event.target.value)}>
                          <option value="summary">Summary</option>
                          <option value="standard">Standard</option>
                          <option value="full">Full</option>
                        </select>
                      </div>
                    </label>
                  </div>
                  <div className="rp-checks">
                    <label>
                      <input type="checkbox" checked={includeMap} onChange={() => setIncludeMap((v) => !v)} />
                      <span>Include map visualizations</span>
                    </label>
                    <label>
                      <input type="checkbox" checked={includeTimestamps} onChange={() => setIncludeTimestamps((v) => !v)} />
                      <span>Include timestamps</span>
                    </label>
                    <label>
                      <input type="checkbox" checked={includeSource} onChange={() => setIncludeSource((v) => !v)} />
                      <span>Include position source</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rp-config-foot">
                <button type="button" className="rp-generate">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M14 3.6V8h4.5M12 11.2v6M9 14.2h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Generate Report
                </button>
              </div>
            </section>

            <section className="rp-preview" aria-label="Report preview">
              <div className="rp-preview-head">
                <div>
                  <h2>Report Preview</h2>
                  <p>Live layout for {title || "untitled report"}</p>
                </div>
                <button type="button" className="rp-preview-full">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="m16 16 3.4 3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  Preview Full Report
                </button>
              </div>

              <div className="rp-paper-wrap">
                <article className="rp-paper">
                  <header className="rp-paper-head">
                    <div className="rp-brand">
                      <img src="/images/synapse-t-mark.png" alt="" width={22} height={22} />
                      <strong>SYNAPSE-T</strong>
                    </div>
                    <div className="rp-paper-meta">
                      <h3>{title || "Soldier Activity Report"}</h3>
                      <p>Generated 06 Oct 2026, 14:28 · Period {periodText}</p>
                    </div>
                  </header>

                  {sections.overview || sections.vitals ? (
                    <section className="rp-paper-section">
                      <h4>1. Personnel Overview</h4>
                      <div className="rp-person-card">
                        <div className="rp-person-avatar" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="8" r="3.1" fill="currentColor" />
                            <path d="M5.3 19.2c1.2-3.3 3.5-4.9 6.7-4.9s5.5 1.6 6.7 4.9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <div className="rp-person-top">
                            <strong>{soldier.label}</strong>
                            <em className={soldier.status === "Critical" ? "is-critical" : "is-ok"}>{soldier.status}</em>
                          </div>
                          <p>{soldier.unit}</p>
                        </div>
                      </div>
                      <div className="rp-kv">
                        <div><span>Last Seen</span><strong>06 Oct 2026, 14:20</strong></div>
                        <div><span>Position</span><strong>-6.17482, 106.82701</strong></div>
                        <div><span>Position Source</span><strong>GNSS</strong></div>
                      </div>
                      {sections.vitals ? (
                        <div className="rp-vitals">
                          <article><span>Heart Rate</span><strong>82 bpm</strong></article>
                          <article><span>HRV</span><strong>46 ms</strong></article>
                          <article><span>Battery</span><strong>78%</strong></article>
                          <article><span>Shoulder Hub</span><strong>Active</strong></article>
                          <article><span>Chest Strap</span><strong>Connected</strong></article>
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {sections.history && includeMap ? (
                    <section className="rp-paper-section">
                      <h4>2. Movement History</h4>
                      <div className="rp-map" aria-hidden="true">
                        <svg viewBox="0 0 420 180" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="rpMapFade" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1f3b57" />
                              <stop offset="100%" stopColor="#0f2438" />
                            </linearGradient>
                          </defs>
                          <rect width="420" height="180" fill="url(#rpMapFade)" />
                          <g stroke="rgba(148,176,214,0.18)" strokeWidth="1">
                            <path d="M0 40h420M0 80h420M0 120h420M0 160h420" />
                            <path d="M60 0v180M120 0v180M180 0v180M240 0v180M300 0v180M360 0v180" />
                          </g>
                          <path d="M48 138 C 90 120, 120 96, 160 88 S 230 70, 270 78 S 330 96, 372 54" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="48" cy="138" r="6" fill="#22c55e" />
                          <circle cx="160" cy="88" r="4.5" fill="#60a5fa" />
                          <circle cx="270" cy="78" r="4.5" fill="#60a5fa" />
                          <circle cx="372" cy="54" r="6" fill="#ef4444" />
                        </svg>
                        <div className="rp-map-legend">
                          <span><i className="is-gnss" /> GNSS</span>
                          <span><i className="is-dr" /> Dead Reckoning</span>
                          <span><i className="is-start" /> Start</span>
                          <span><i className="is-end" /> End</span>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {sections.alerts ? (
                    <section className="rp-paper-section">
                      <div className="rp-section-top">
                        <h4>3. Alerts Summary</h4>
                        <button type="button">See Details</button>
                      </div>
                      <div className="rp-alert-stats">
                        <article className="is-critical"><strong>2</strong><span>Critical</span></article>
                        <article className="is-warning"><strong>1</strong><span>Warning</span></article>
                        <article className="is-info"><strong>3</strong><span>Info</span></article>
                      </div>
                    </section>
                  ) : null}

                  {sections.events ? (
                    <section className="rp-paper-section">
                      <div className="rp-section-top">
                        <h4>4. Recent Events</h4>
                        <button type="button">See Full History</button>
                      </div>
                      <ul className="rp-events">
                        {PREVIEW_EVENTS.map((event) => (
                          <li key={event.time}>
                            {includeTimestamps ? <time>{event.time}</time> : null}
                            <div>
                              <strong>{event.text}</strong>
                              <small>
                                {includeSource ? `${event.source} · ` : null}
                                {event.coords}
                              </small>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {sections.equipment ? (
                    <section className="rp-paper-section">
                      <h4>5. Equipment</h4>
                      <div className="rp-kv">
                        <div><span>Shoulder Hub</span><strong>SH-108 · Active</strong></div>
                        <div><span>Chest Strap</span><strong>CS-108 · Connected</strong></div>
                        <div><span>Battery</span><strong>78% · Healthy</strong></div>
                      </div>
                    </section>
                  ) : null}
                </article>
              </div>
            </section>
          </div>
        ) : null}

        {tab === "history" ? (
          <section className="rp-table-panel" aria-label="Report history">
            <div className="rp-table-head">
              <div>
                <h2>Report History</h2>
                <p>Previously generated exports ready for download or review.</p>
              </div>
            </div>
            <div className="rp-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Type</th>
                    <th>Generated</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {HISTORY_ROWS.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.title}</strong>
                        <small>{row.id}</small>
                      </td>
                      <td>{row.type}</td>
                      <td>{row.when}</td>
                      <td>{row.format}</td>
                      <td><em className={row.status === "Ready" ? "is-ok" : "is-muted"}>{row.status}</em></td>
                      <td>
                        <button type="button" className="rp-table-action">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === "scheduled" ? (
          <section className="rp-table-panel" aria-label="Scheduled reports">
            <div className="rp-table-head">
              <div>
                <h2>Scheduled Reports</h2>
                <p>Recurring exports delivered on a fixed cadence.</p>
              </div>
              <button type="button" className="rp-generate is-compact">New Schedule</button>
            </div>
            <div className="rp-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Schedule</th>
                    <th>Cadence</th>
                    <th>Target</th>
                    <th>Next Run</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULED_ROWS.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.title}</strong>
                        <small>{row.id}</small>
                      </td>
                      <td>{row.cadence}</td>
                      <td>{row.target}</td>
                      <td>{row.next}</td>
                      <td><em className={row.status === "Active" ? "is-ok" : "is-muted"}>{row.status}</em></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
