"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ShoppingCart, Truck, CheckCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayData {
  count: number;
  percentage: number;
}

interface ProductStatsProps {
  totalOrders: DayData;
  inDelivery: DayData;
  delivered: DayData;
  returned: DayData;
}

export function ProductStats({
  totalOrders,
  inDelivery,
  delivered,
  returned,
}: ProductStatsProps) {
  const getChangeIcon = (today: number, yesterday: number) => {
    if (today > yesterday) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (today < yesterday) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-gray-400 dark:text-gray-500" />;
  };

  const getChangePercent = (today: number, yesterday: number) => {
    if (yesterday === 0) return null;
    const change = ((today - yesterday) / yesterday) * 100;
    return Math.round(change);
  };

  const stats = [
    {
      label: "عدد الطلبات",
      icon: ShoppingCart,
      color: "text-blue-700 dark:text-blue-300",
      bgColor: "bg-blue-100 dark:bg-blue-900/60",
      today: totalOrders.count,
      yesterday: 38,
      percentage: totalOrders.percentage,
      trend: "up" as const,
    },
    {
      label: "قيد التسليم",
      icon: Truck,
      color: "text-cyan-700 dark:text-cyan-300",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/60",
      today: inDelivery.count,
      yesterday: 6,
      percentage: inDelivery.percentage,
      trend: "up" as const,
    },
    {
      label: "تم التوصيل",
      icon: CheckCircle,
      color: "text-teal-700 dark:text-teal-300",
      bgColor: "bg-teal-100 dark:bg-teal-900/60",
      today: delivered.count,
      yesterday: 25,
      percentage: delivered.percentage,
      trend: "up" as const,
    },
    {
      label: "تم الإرجاع",
      icon: RotateCcw,
      color: "text-rose-700 dark:text-rose-300",
      bgColor: "bg-rose-100 dark:bg-rose-900/60",
      today: returned.count,
      yesterday: 7,
      percentage: returned.percentage,
      trend: "down" as const,
    },
  ];

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">ملخص اليوم مقارنة بالأمس</h4>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>اليوم: {new Date().toLocaleDateString("ar-DZ")}</span>
            <span>أمس: {new Date(Date.now() - 86400000).toLocaleDateString("ar-DZ")}</span>
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            <TableHead className="font-semibold">الحالة</TableHead>
            <TableHead className="text-center font-semibold">أمس</TableHead>
            <TableHead className="text-center font-semibold">اليوم</TableHead>
            <TableHead className="text-center font-semibold">التغيير</TableHead>
            <TableHead className="text-center font-semibold">النسبة</TableHead>
            <TableHead className="font-semibold">التقدم</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat) => {
            const changePercent = getChangePercent(stat.today, stat.yesterday);
            return (
              <TableRow key={stat.label} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-lg p-2", stat.bgColor)}>
                      <stat.icon className={cn("h-4 w-4", stat.color)} />
                    </div>
                    <span className="font-medium">{stat.label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-muted-foreground font-medium">{stat.yesterday}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-bold text-lg">{stat.today}</span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getChangeIcon(stat.today, stat.yesterday)}
                    {changePercent !== null && (
                      <span
                        className={cn(
                          "text-xs font-medium",
                      stat.today > stat.yesterday && "text-emerald-600 dark:text-emerald-400",
                      stat.today < stat.yesterday && "text-red-600 dark:text-red-400",
                      stat.today === stat.yesterday && "text-gray-500 dark:text-gray-400"
                        )}
                      >
                        {stat.today > stat.yesterday ? "+" : ""}
                        {changePercent}%
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono">
                    {stat.percentage}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-32">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          stat.color.replace("text-", "bg-")
                        )}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
