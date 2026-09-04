"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge, STATUS_CONFIG, type StatusKey } from "./status-badge";

const SYSTEM_STATUSES: StatusKey[] = [
  "SHIPPED", "IN_DELIVERY", "ON_HOLD", "DELIVERED",
  "READY_FOR_PAYMENT", "PAID", "CUSTOMER_REORDERED",
  "RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED",
];

const SEQUENTIAL_GROUPS: StatusKey[][] = [
  ["NOT_ANSWERED_1", "NOT_ANSWERED_2", "NOT_ANSWERED_3"],
  ["PHONE_CLOSED_1", "PHONE_CLOSED_2", "PHONE_CLOSED_3"],
  ["OUT_OF_COVERAGE_1", "OUT_OF_COVERAGE_2", "OUT_OF_COVERAGE_3"],
];

const NON_SEQUENTIAL_STATUSES: StatusKey[] = [
  "NEW", "CONFIRMED", "CANCELLED", "FAKE", "POSTPONED", "WAITING_CALLBACK",
];

function getSmartStatuses(currentStatus: StatusKey): StatusKey[] {
  if (SYSTEM_STATUSES.includes(currentStatus)) return [];
  const result: StatusKey[] = [];
  for (const group of SEQUENTIAL_GROUPS) {
    const idx = group.indexOf(currentStatus);
    if (idx >= 0) {
      if (idx < group.length - 1) result.push(group[idx + 1]);
    } else {
      result.push(group[0]);
    }
  }
  for (const s of NON_SEQUENTIAL_STATUSES) {
    if (s !== currentStatus) result.push(s);
  }
  return result;
}

interface StatusDropdownProps {
  currentStatus: StatusKey;
  onStatusChange: (status: StatusKey) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function StatusDropdown({ currentStatus, onStatusChange, disabled, compact }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableStatuses = getSmartStatuses(currentStatus);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="disabled:opacity-50"
        >
          <StatusBadge status={currentStatus} size="sm" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 right-0 w-52 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="p-1">
              {availableStatuses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">لا توجد حالات متاحة</p>
              ) : availableStatuses.map((status) => {
                const config = STATUS_CONFIG[status];
                const isActive = currentStatus === status;
                return (
                  <button
                    key={status}
                    onClick={() => {
                      onStatusChange(status);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-right px-3 py-2 text-xs rounded-lg transition-all duration-100",
                      "hover:bg-muted",
                      "active:scale-[0.98]",
                      isActive && "bg-muted font-bold",
                      config.color
                    )}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-2 p-3 rounded-xl border-2 transition-all duration-200",
          "bg-background border-border",
          "hover:border-primary/50",
          "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <StatusBadge status={currentStatus} size="md" />
        <svg
          className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-80 overflow-y-auto bg-card border border-border rounded-xl shadow-xl">
          <div className="p-1">
            {availableStatuses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">لا توجد حالات متاحة</p>
            ) : availableStatuses.map((status) => {
              const config = STATUS_CONFIG[status];
              const isActive = currentStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => {
                    onStatusChange(status);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-right px-4 py-2.5 text-sm rounded-lg transition-all duration-100",
                    "hover:bg-muted",
                    "active:scale-[0.98]",
                    isActive && "bg-muted font-bold",
                    config.color
                  )}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
