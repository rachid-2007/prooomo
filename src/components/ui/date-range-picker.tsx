"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronLeft, Calendar, Check } from "lucide-react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const MONTHS_AR = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const DAYS_AR = ["سبت", "أحد", "إثن", "ثلا", "أرب", "خمي", "جمع"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return (day + 1) % 7;
}

function toStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseStr(s: string) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"from" | "to">("from");
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseStr(from) || new Date();
    return d.getMonth();
  });
  const [viewYear, setViewYear] = useState(() => {
    const d = parseStr(from) || new Date();
    return d.getFullYear();
  });
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [tempFrom, setTempFrom] = useState(from);
  const [tempTo, setTempTo] = useState(to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTempFrom(from);
      setTempTo(to);
    }
  }, [open, from, to]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function selectDate(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const str = toStr(d);

    if (selecting === "from") {
      setTempFrom(str);
      if (tempTo && str > tempTo) setTempTo("");
      setSelecting("to");
    } else {
      if (tempFrom && str < tempFrom) {
        setTempTo(tempFrom);
        setTempFrom(str);
      } else {
        setTempTo(str);
      }
    }
  }

  function confirmSelection() {
    if (tempFrom && tempTo) {
      onChange(tempFrom, tempTo);
      setOpen(false);
    } else if (tempFrom && !tempTo) {
      onChange(tempFrom, tempFrom);
      setOpen(false);
    }
  }

  function clearSelection() {
    setTempFrom("");
    setTempTo("");
    setSelecting("from");
    onChange("", "");
    setOpen(false);
  }

  function quickSelect(days: number) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    const f = toStr(start);
    const t = toStr(now);
    setTempFrom(f);
    setTempTo(t);
    setSelecting("from");
  }

  function isSelected(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day);
    const str = toStr(d);
    if (tempFrom && str === tempFrom) return true;
    if (tempTo && str === tempTo) return true;
    return false;
  }

  function inRange(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day);
    const str = toStr(d);
    const effTo = tempTo || (selecting === "to" && tempFrom ? hoverDate : null);
    if (tempFrom && effTo) {
      return str > (tempFrom < effTo ? tempFrom : effTo) && str < (tempFrom < effTo ? effTo : tempFrom);
    }
    return false;
  }

  function isToday(day: number): boolean {
    const now = new Date();
    return viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const displayText = from && to
    ? `${from} → ${to}`
    : from
    ? `${from} → ...`
    : "اختر التاريخ";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSelecting(from ? "to" : "from"); }}
        className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-bold w-full flex items-center justify-between"
      >
        <span className={from ? "" : "text-muted-foreground"}>{displayText}</span>
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div className="fixed sm:absolute sm:top-full sm:left-0 sm:mt-1 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 sm:translate-x-0 sm:translate-y-0 bg-card border border-border rounded-2xl shadow-xl z-50 p-3 w-[290px]">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="text-xs font-bold bg-transparent border-none cursor-pointer"
              >
                {MONTHS_AR.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="text-xs font-bold bg-transparent border-none cursor-pointer"
              >
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={nextMonth} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const selected = isSelected(day);
              const range = inRange(day);
              const today = isToday(day);

              return (
                <button
                  key={`d-${i}`}
                  type="button"
                  onClick={() => selectDate(day)}
                  onMouseEnter={() => {
                    if (selecting === "to" && tempFrom) {
                      const d = new Date(viewYear, viewMonth, day);
                      setHoverDate(toStr(d));
                    }
                  }}
                  onMouseLeave={() => setHoverDate(null)}
                  className={`relative h-9 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                    selected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : range
                      ? "bg-primary/10 text-primary"
                      : today
                      ? "border-2 border-primary/50 text-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearSelection}
                className="text-[10px] text-destructive font-bold px-2 py-1.5 rounded-lg hover:bg-destructive/10"
              >
                مسح
              </button>
              <button
                type="button"
                onClick={() => quickSelect(7)}
                className="text-[10px] text-muted-foreground font-bold px-2 py-1.5 rounded-lg hover:bg-muted"
              >
                7 أيام
              </button>
              <button
                type="button"
                onClick={() => quickSelect(30)}
                className="text-[10px] text-muted-foreground font-bold px-2 py-1.5 rounded-lg hover:bg-muted"
              >
                30 يوم
              </button>
            </div>
            <button
              type="button"
              onClick={confirmSelection}
              disabled={!tempFrom}
              className="h-8 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
