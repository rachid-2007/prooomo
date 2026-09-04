"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, TrendingUp, AlertTriangle, DollarSign, XCircle, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockStatsProps {
  totalProducts: number;
  totalStock: number;
  totalCommitted: number;
  totalAvailable: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}

export function StockStats({ totalProducts, totalStock, totalCommitted, totalAvailable, lowStockCount, outOfStockCount, totalValue }: StockStatsProps) {
  const stats = [
    {
      title: "إجمالي المنتجات",
      value: totalProducts,
      icon: Package,
      color: "text-blue-700 dark:text-blue-300",
      bgColor: "bg-blue-100 dark:bg-blue-900/60",
    },
    {
      title: "إجمالي المخزون",
      value: totalStock,
      icon: TrendingUp,
      color: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/60",
    },
    {
      title: "محجوز للطلبات",
      value: totalCommitted,
      icon: ShoppingCart,
      color: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-amber-100 dark:bg-amber-900/60",
    },
    {
      title: "متوفر للبيع",
      value: totalAvailable,
      icon: Package,
      color: "text-sky-700 dark:text-sky-300",
      bgColor: "bg-sky-100 dark:bg-sky-900/60",
    },
    {
      title: "مخزون منخفض",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "text-orange-700 dark:text-orange-300",
      bgColor: "bg-orange-100 dark:bg-orange-900/60",
    },
    {
      title: "نفذ من المخزون",
      value: outOfStockCount,
      icon: XCircle,
      color: "text-red-700 dark:text-red-300",
      bgColor: "bg-red-100 dark:bg-red-900/60",
    },
    {
      title: "قيمة المخزون",
      value: `${totalValue.toLocaleString()} دج`,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10 dark:bg-primary/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("rounded-xl p-2.5", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
