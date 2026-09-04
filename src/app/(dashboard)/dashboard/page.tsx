"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OrdersByProduct } from "@/components/dashboard/orders-by-product";
import { TopWilayas } from "@/components/dashboard/top-wilayas";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { StatsOrdersTable } from "@/components/dashboard/stats-orders-table";
import {
  ShoppingCart,
  CheckCircle,
  Truck,
  PackageCheck,
  RotateCcw,
  Send,
} from "lucide-react";

type CardKey = "total" | "confirmed" | "shipped" | "inDelivery" | "delivered" | "returned";

interface StatsResponse {
  totalOrders: number;
  confirmed: number;
  shipped: number;
  inDelivery: number;
  delivered: number;
  returned: number;
  confirmedPercentage: number;
  shippedPercentage: number;
  inDeliveryPercentage: number;
  deliveredPercentage: number;
  returnedPercentage: number;
  todayOrders: number;
  yesterdayOrders: number;
  todayChange: number;
  todayDirection: "up" | "down" | "same";
  ordersByProduct: Array<{
    productName: string;
    image: string;
    count: number;
    totalQuantity: number;
  }>;
  topWilayas: Array<{ name: string; count: number; rank: number }>;
}

interface OrderRow {
  id: string;
  customerName: string;
  customerPhone: string;
  product: string;
  quantity: number;
  totalPrice: number;
  status: string;
  date: string;
  wilaya: string;
}

interface ProductOption {
  value: string;
  name: string;
  icon: string;
}

interface Filters {
  time: string;
  dateFrom?: string;
  dateTo?: string;
  product?: string;
  viewMode?: string;
}

const CARD_STATUS_MAP: Record<CardKey, string> = {
  total: "NEW",
  confirmed: "CONFIRMED",
  shipped: "SHIPPED",
  inDelivery: "SHIPPED,IN_DELIVERY,ON_HOLD,DELIVERED,READY_FOR_PAYMENT,PAID,RETURN_TRANSFER,RETURN_READY,RETURN_COMPLETED",
  delivered: "DELIVERED,READY_FOR_PAYMENT,PAID",
  returned: "RETURN_TRANSFER,RETURN_READY,RETURN_COMPLETED",
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({ time: "today" });
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async (f: Filters) => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({ time: f.time });
      if (f.dateFrom) params.set("dateFrom", f.dateFrom);
      if (f.dateTo) params.set("dateTo", f.dateTo);
      if (f.product) params.set("product", f.product);
      if (f.viewMode && f.viewMode !== "all") params.set("viewMode", f.viewMode);
      const res = await fetch(`/api/orders/stats?${params.toString()}`);
      if (res.ok) {
        const data: StatsResponse = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchOrders = useCallback(async (card: CardKey, f: Filters) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams({ status: CARD_STATUS_MAP[card] });
      if (f.time) params.set("time", f.time);
      if (f.dateFrom) params.set("dateFrom", f.dateFrom);
      if (f.dateTo) params.set("dateTo", f.dateTo);
      if (f.product) params.set("product", f.product);
      const res = await fetch(`/api/orders?${params.toString()}`, { signal: abortRef.current.signal });
      if (res.ok) {
        const data = await res.json();
        const rows: OrderRow[] = (data.orders || []).map((o: any) => ({
          id: o.id,
          customerName: o.customerName ?? "",
          customerPhone: o.customerPhone ?? "",
          product: o.product?.name ?? "",
          quantity: o.quantity ?? 1,
          totalPrice: o.totalPrice ?? 0,
          status: o.status,
          date: o.createdAt ?? "",
          wilaya: o.wilaya?.name ?? "",
        }));
        setOrders(rows);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to fetch orders:", err);
      }
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products?limit=200");
      if (res.ok) {
        const data = await res.json();
        const list: ProductOption[] = [
          { value: "", name: "جميع المنتجات", icon: "📦" },
          ...((data.products || []).map((p: any) => ({
            value: p.id,
            name: p.name,
            icon: "📦",
          }))),
        ];
        setProducts(list);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(filters);
  }, [filters, fetchStats]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (activeCard) {
      fetchOrders(activeCard, filters);
    } else {
      setOrders([]);
    }
  }, [activeCard, filters, fetchOrders]);

  const handleCardClick = (card: CardKey) => {
    setActiveCard(activeCard === card ? null : card);
  };

  const handleCloseTable = () => {
    setActiveCard(null);
  };

  const statsCards = stats
    ? [
        {
          key: "total" as CardKey,
          title: "إجمالي الطلبات",
          subtitle: `${stats.todayOrders} طلب اليوم`,
          value: stats.totalOrders,
          icon: ShoppingCart,
          color: "text-blue-700 dark:text-blue-300",
          bgColor: "bg-blue-100 dark:bg-blue-900/60",
          borderColor: "border-blue-200 dark:border-blue-800/60",
          progressColor: "bg-blue-600 dark:bg-blue-400",
          change: { value: stats.todayChange, direction: stats.todayDirection },
        },
        {
          key: "confirmed" as CardKey,
          title: "تم التأكيد",
          value: stats.confirmed,
          percentage: stats.confirmedPercentage,
          icon: CheckCircle,
          color: "text-emerald-700 dark:text-emerald-300",
          bgColor: "bg-emerald-100 dark:bg-emerald-900/60",
          borderColor: "border-emerald-200 dark:border-emerald-800/60",
          progressColor: "bg-emerald-600 dark:bg-emerald-400",
        },
        {
          key: "shipped" as CardKey,
          title: "تم الشحن",
          value: stats.shipped,
          percentage: stats.shippedPercentage,
          icon: Send,
          color: "text-indigo-700 dark:text-indigo-300",
          bgColor: "bg-indigo-100 dark:bg-indigo-900/60",
          borderColor: "border-indigo-200 dark:border-indigo-800/60",
          progressColor: "bg-indigo-600 dark:bg-indigo-400",
        },
        {
          key: "inDelivery" as CardKey,
          title: "قيد التوصيل",
          value: stats.inDelivery,
          percentage: stats.inDeliveryPercentage,
          icon: Truck,
          color: "text-cyan-700 dark:text-cyan-300",
          bgColor: "bg-cyan-100 dark:bg-cyan-900/60",
          borderColor: "border-cyan-200 dark:border-cyan-800/60",
          progressColor: "bg-cyan-600 dark:bg-cyan-400",
        },
        {
          key: "delivered" as CardKey,
          title: "تم التوصيل",
          value: stats.delivered,
          percentage: stats.deliveredPercentage,
          icon: PackageCheck,
          color: "text-teal-700 dark:text-teal-300",
          bgColor: "bg-teal-100 dark:bg-teal-900/60",
          borderColor: "border-teal-200 dark:border-teal-800/60",
          progressColor: "bg-teal-600 dark:bg-teal-400",
        },
        {
          key: "returned" as CardKey,
          title: "تم الإرجاع",
          value: stats.returned,
          percentage: stats.returnedPercentage,
          icon: RotateCcw,
          color: "text-amber-700 dark:text-amber-300",
          bgColor: "bg-amber-100 dark:bg-amber-900/60",
          borderColor: "border-amber-200 dark:border-amber-800/60",
          progressColor: "bg-amber-600 dark:bg-amber-400",
        },
      ]
    : [];

  const activeStat = statsCards.find((s) => s.key === activeCard);

  return (
    <DashboardLayout>
      <Header title="لوحة القيادة" description="مرحباً بك في لوحة التحكم" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <DashboardFilters onFilterChange={setFilters} products={products} viewMode={filters.viewMode} />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {loadingStats && !stats
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 rounded-xl border bg-card animate-pulse" />
              ))
            : statsCards.map((stat) => (
                <StatsCard
                  key={stat.key}
                  title={stat.title}
                  subtitle={stat.subtitle}
                  value={stat.value}
                  icon={stat.icon}
                  color={stat.color}
                  bgColor={stat.bgColor}
                  borderColor={stat.borderColor}
                  progressColor={stat.progressColor}
                  percentage={stat.percentage}
                  change={stat.change}
                  onClick={() => handleCardClick(stat.key)}
                  isActive={activeCard === stat.key}
                />
              ))}
        </div>

        {activeCard && activeStat && (
          <StatsOrdersTable
            title={activeStat.title}
            orders={orders}
            color={activeStat.bgColor}
            onClose={handleCloseTable}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OrdersByProduct data={stats?.ordersByProduct ?? []} />
          <TopWilayas data={stats?.topWilayas ?? []} />
        </div>
      </div>
    </DashboardLayout>
  );
}
