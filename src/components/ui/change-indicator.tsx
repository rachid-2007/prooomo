"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ChangeIndicatorProps {
  value: number;
  direction: "up" | "down" | "same";
  className?: string;
}

export function ChangeIndicator({ value, direction, className }: ChangeIndicatorProps) {
  if (direction === "same") return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        direction === "up" && "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
        direction === "down" && "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50",
        className
      )}
    >
      {direction === "up" ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {direction === "up" ? "+" : "-"}{value}%
      </span>
    </div>
  );
}
