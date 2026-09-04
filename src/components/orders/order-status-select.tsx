"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ATTEMPT_STATUSES, MAX_ATTEMPTS, ORDER_STATUS_MAP } from "@/lib/constants";
import { OrderStatusWithAttempt } from "@/types";

interface OrderStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  orderHistory?: { status: string }[];
  disabled?: boolean;
}

export function OrderStatusSelect({
  value,
  onChange,
  orderHistory = [],
  disabled,
}: OrderStatusSelectProps) {
  const getAttemptCounts = () => {
    const counts: Record<string, number> = {};
    ATTEMPT_STATUSES.forEach((status) => {
      counts[status] = orderHistory.filter((h) => h.status === status).length;
    });
    return counts;
  };

  const attemptCounts = useMemo(() => getAttemptCounts(), [orderHistory]);

  const options: OrderStatusWithAttempt[] = useMemo(() => {
    const result: OrderStatusWithAttempt[] = [];

    Object.entries(ORDER_STATUS_MAP).forEach(([key, { labelAr }]) => {
      if (ATTEMPT_STATUSES.includes(key)) {
        const currentCount = attemptCounts[key] || 0;

        if (currentCount < MAX_ATTEMPTS) {
          const displayLabel = currentCount > 0 ? `${labelAr} ${currentCount + 1}` : labelAr;
          result.push({
            value: key,
            label: displayLabel,
            attempt: currentCount + 1,
          });
        }
      } else {
        result.push({
          value: key,
          label: labelAr,
        });
      }
    });

    return result;
  }, [attemptCounts]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 appearance-none cursor-pointer",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8"
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
