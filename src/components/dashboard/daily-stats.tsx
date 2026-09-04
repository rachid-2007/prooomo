"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProgressCircle } from "@/components/ui/progress-circle";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingCart,
  Truck,
  CheckCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DayStats {
  date: string;
  totalOrders: number;
  confirmed: number;
  shipped: number;
  inDelivery: number;
  delivered: number;
  returned: number;
}

const mockWeekStats: DayStats[] = [
  { date: "2026-07-04", totalOrders: 32, confirmed: 28, shipped: 25, inDelivery: 20, delivered: 18, returned: 2 },
  { date: "2026-07-05", totalOrders: 45, confirmed: 40, shipped: 35, inDelivery: 28, delivered: 25, returned: 3 },
  { date: "2026-07-06", totalOrders: 38, confirmed: 34, shipped: 30, inDelivery: 24, delivered: 22, returned: 2 },
  { date: "2026-07-07", totalOrders: 52, confirmed: 48, shipped: 42, inDelivery: 35, delivered: 32, returned: 3 },
  { date: "2026-07-08", totalOrders: 41, confirmed: 36, shipped: 32, inDelivery: 26, delivered: 24, returned: 2 },
  { date: "2026-07-09", totalOrders: 55, confirmed: 50, shipped: 45, inDelivery: 38, delivered: 35, returned: 3 },
  { date: "2026-07-10", totalOrders: 43, confirmed: 38, shipped: 34, inDelivery: 28, delivered: 25, returned: 3 },
];

export function DailyStats() {
  const [selectedDate, setSelectedDate] = useState("2026-07-10");

  const getDayStats = (date: string) => {
    return mockWeekStats.find((s) => s.date === date) || mockWeekStats[mockWeekStats.length - 1];
  };

  const getPrevDay = (date: string) => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };

  const todayStats = getDayStats(selectedDate);
  const yesterdayStats = getDayStats(getPrevDay(selectedDate));

  const getChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return { value: 0, direction: "same" as "up" | "down" | "same" };
    const change = ((today - yesterday) / yesterday) * 100;
    return {
      value: Math.round(Math.abs(change)),
      direction: (today > yesterday ? "up" : today < yesterday ? "down" : "same") as "up" | "down" | "same",
    };
  };

  const statsCards = [
    {
      label: "إجمالي الطلبات",
      value: todayStats.totalOrders,
      prevValue: yesterdayStats.totalOrders,
      icon: ShoppingCart,
      color: "text-blue-700 dark:text-blue-300",
      bgColor: "bg-blue-100 dark:bg-blue-900/60",
      progressColor: "bg-blue-600 dark:bg-blue-400",
      percentage: 100,
    },
    {
      label: "تم التأكيد",
      value: todayStats.confirmed,
      prevValue: yesterdayStats.confirmed,
      icon: CheckCircle,
      color: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/60",
      progressColor: "bg-emerald-600 dark:bg-emerald-400",
      percentage: todayStats.totalOrders > 0 ? Math.round((todayStats.confirmed / todayStats.totalOrders) * 100) : 0,
    },
    {
      label: "تم الشحن",
      value: todayStats.shipped,
      prevValue: yesterdayStats.shipped,
      icon: Package,
      color: "text-indigo-700 dark:text-indigo-300",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/60",
      progressColor: "bg-indigo-600 dark:bg-indigo-400",
      percentage: todayStats.confirmed > 0 ? Math.round((todayStats.shipped / todayStats.confirmed) * 100) : 0,
    },
    {
      label: "قيد التسليم",
      value: todayStats.inDelivery,
      prevValue: yesterdayStats.inDelivery,
      icon: Truck,
      color: "text-cyan-700 dark:text-cyan-300",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/60",
      progressColor: "bg-cyan-600 dark:bg-cyan-400",
      percentage: todayStats.shipped > 0 ? Math.round((todayStats.inDelivery / todayStats.shipped) * 100) : 0,
    },
    {
      label: "تم التوصيل",
      value: todayStats.delivered,
      prevValue: yesterdayStats.delivered,
      icon: CheckCircle,
      color: "text-teal-700 dark:text-teal-300",
      bgColor: "bg-teal-100 dark:bg-teal-900/60",
      progressColor: "bg-teal-600 dark:bg-teal-400",
      percentage: todayStats.inDelivery > 0 ? Math.round((todayStats.delivered / todayStats.inDelivery) * 100) : 0,
    },
    {
      label: "تم الإرجاع",
      value: todayStats.returned,
      prevValue: yesterdayStats.returned,
      icon: RotateCcw,
      color: "text-rose-700 dark:text-rose-300",
      bgColor: "bg-rose-100 dark:bg-rose-900/60",
      progressColor: "bg-rose-600 dark:bg-rose-400",
      percentage: todayStats.shipped > 0 ? Math.round((todayStats.returned / todayStats.shipped) * 100) : 0,
    },
  ];

  const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      day: weekDays[d.getDay()],
      date: d.toLocaleDateString("ar-DZ", { month: "long", day: "numeric" }),
      full: d.toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" }),
    };
  };

  const selected = formatDate(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header with Date Picker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">ملخص الأيام</span>
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="text-center px-4">
                <p className="text-sm font-medium">{selected.day}</p>
                <p className="text-xs text-muted-foreground">{selected.full}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split("T")[0]);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">نظرة عامة على الأسبوع</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {mockWeekStats.map((day) => {
              const isSelected = day.date === selectedDate;
              const d = new Date(day.date);
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={cn(
                    "flex-1 p-3 rounded-xl text-center transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <p className="text-[10px] opacity-70">{weekDays[d.getDay()]}</p>
                  <p className="text-lg font-bold">{day.totalOrders}</p>
                  <p className="text-[10px] opacity-70">{d.getDate()}/{d.getMonth() + 1}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map((stat) => {
          const change = getChange(stat.value, stat.prevValue);
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("rounded-lg p-2", stat.bgColor)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                  {change.direction !== "same" && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        change.direction === "up" && "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50",
                        change.direction === "down" && "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50"
                      )}
                    >
                      {change.direction === "up" ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      {change.direction === "up" ? "+" : "-"}{change.value}%
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <ProgressCircle value={stat.percentage} size={32} strokeWidth={2} showLabel={false} />
                    <span className="text-xs font-medium">{stat.percentage}%</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", stat.progressColor)}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">مقارنة مفصلة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statsCards.map((stat) => {
              const change = getChange(stat.value, stat.prevValue);
              return (
                <div key={stat.label} className="p-3 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                    <span className="text-sm font-medium">{stat.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">اليوم</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg text-muted-foreground">{stat.prevValue}</p>
                      <p className="text-[10px] text-muted-foreground">أمس</p>
                    </div>
                    <Badge
                      variant={change.direction === "up" ? "default" : change.direction === "down" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {change.direction === "up" ? "+" : change.direction === "down" ? "-" : ""}
                      {change.value}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
