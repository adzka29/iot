"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DateTimePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseLocal(value: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
}

function toLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function CalendarIcon() {
  return (
    <svg className="op-dt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v3.2M16 3.5v3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8.5" cy="14.2" r="1" fill="currentColor" />
      <circle cx="12" cy="14.2" r="1" fill="currentColor" />
      <circle cx="15.5" cy="14.2" r="1" fill="currentColor" />
    </svg>
  );
}

export default function DateTimePicker({ label, value, onChange, min }: DateTimePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = parseLocal(value) ?? new Date();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const [hour, setHour] = useState(selected.getHours());
  const [minute, setMinute] = useState(selected.getMinutes());
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const minDate = min ? parseLocal(min) : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const parsed = parseLocal(value);
    if (!parsed) return;
    setHour(parsed.getHours());
    setMinute(parsed.getMinutes());
    if (!open) setView(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [value, open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 300;
      const left = Math.min(rect.left, window.innerWidth - width - 12);
      const below = rect.bottom + 8;
      const estimatedHeight = 360;
      const top = below + estimatedHeight > window.innerHeight - 12 ? Math.max(12, rect.top - estimatedHeight - 8) : below;
      setPos({ top, left: Math.max(12, left) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = first.getDay();
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const prevDays = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
    const items: { date: Date; inMonth: boolean }[] = [];

    for (let i = start - 1; i >= 0; i -= 1) {
      items.push({
        date: new Date(view.getFullYear(), view.getMonth() - 1, prevDays - i),
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({
        date: new Date(view.getFullYear(), view.getMonth(), day),
        inMonth: true,
      });
    }
    let next = 1;
    while (items.length < 42) {
      items.push({
        date: new Date(view.getFullYear(), view.getMonth() + 1, next),
        inMonth: false,
      });
      next += 1;
    }
    return items;
  }, [view]);

  const display = selected.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function commit(date: Date, nextHour = hour, nextMinute = minute) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), nextHour, nextMinute);
    if (minDate && next < minDate) {
      onChange(toLocalValue(minDate));
      return;
    }
    onChange(toLocalValue(next));
  }

  function applyTime(nextHour: number, nextMinute: number) {
    const h = Math.min(23, Math.max(0, Number.isFinite(nextHour) ? nextHour : 0));
    const m = Math.min(59, Math.max(0, Number.isFinite(nextMinute) ? nextMinute : 0));
    setHour(h);
    setMinute(m);
    commit(selected, h, m);
  }

  return (
    <div className={`op-dt${open ? " is-open" : ""}`} ref={rootRef}>
      <span className="op-dt-label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className="op-dt-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <CalendarIcon />
        <span>{value ? display : "Select date & time"}</span>
        <svg className="op-dt-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && mounted
        ? createPortal(
            <div
              ref={popoverRef}
              className="op-dt-popover"
              role="dialog"
              aria-label={label}
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="op-dt-month">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                >
                  ‹
                </button>
                <strong>
                  {MONTHS[view.getMonth()]} {view.getFullYear()}
                </strong>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                >
                  ›
                </button>
              </div>

              <div className="op-dt-weekdays">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="op-dt-grid">
                {cells.map(({ date, inMonth }) => {
                  const isSelected = sameDay(date, selected);
                  const isToday = sameDay(date, new Date());
                  const disabled = minDate
                    ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59) < minDate
                    : false;
                  return (
                    <button
                      key={dayKey(date)}
                      type="button"
                      disabled={disabled}
                      className={[
                        inMonth ? "" : "is-muted",
                        isSelected ? "is-selected" : "",
                        isToday ? "is-today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => commit(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="op-dt-time">
                <span>Time</span>
                <div className="op-dt-time-fields">
                  <label>
                    <small>Hour</small>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={hour}
                      onChange={(e) => applyTime(Number(e.target.value), minute)}
                    />
                  </label>
                  <em>:</em>
                  <label>
                    <small>Min</small>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minute}
                      onChange={(e) => applyTime(hour, Number(e.target.value))}
                    />
                  </label>
                </div>
                <button type="button" className="op-dt-done" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
