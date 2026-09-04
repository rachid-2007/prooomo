"use client";

import { cn } from "@/lib/utils";

interface ProgressCircleProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressCircle({
  value,
  size = 80,
  strokeWidth = 6,
  className,
  showLabel = true,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (percent: number) => {
    if (percent >= 80) return "text-emerald-500 dark:text-emerald-400";
    if (percent >= 60) return "text-blue-500 dark:text-blue-400";
    if (percent >= 40) return "text-yellow-500 dark:text-yellow-400";
    return "text-red-500 dark:text-red-400";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          className={cn("transition-all duration-1000 ease-out", getColor(value))}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span className={cn("absolute text-sm font-bold", getColor(value))}>
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
