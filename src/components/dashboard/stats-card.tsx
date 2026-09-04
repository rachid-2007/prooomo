"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChangeIndicator } from "@/components/ui/change-indicator";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  subtitle?: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  progressColor: string;
  percentage?: number;
  change?: {
    value: number;
    direction: "up" | "down" | "same";
  };
  onClick?: () => void;
  isActive?: boolean;
}

export function StatsCard({
  title,
  subtitle,
  value,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  progressColor,
  percentage,
  change,
  onClick,
  isActive,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 transition-all duration-200",
        borderColor,
        onClick && "cursor-pointer hover:shadow-md",
        isActive && "ring-2 ring-primary shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("rounded-xl p-2.5", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          {change && <ChangeIndicator value={change.value} direction={change.direction} />}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>

          {percentage !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">نسبة الإتمام</span>
                <span className="text-xs font-bold">{percentage}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
