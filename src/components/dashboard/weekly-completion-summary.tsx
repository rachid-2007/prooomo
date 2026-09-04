"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  CheckCircle,
  Truck,
  PackageCheck,
  Package,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Loader2,
  Search,
  ChevronDown,
  X,
  Send,
} from "lucide-react";

interface DayData {
  date: string;
  dayName: string;
  totalOrders: number;
  confirmed: number;
  shipped: number;
  inDelivery: number;
  delivered: number;
  paid: number;
  returnPending: number;
  returned: number;
}

function getChange(today: number, yesterday: number): { value: number; direction: "up" | "down" | "same" } | undefined {
  if (yesterday === 0) return undefined;
  const change = ((today - yesterday) / yesterday) * 100;
  const dir: "up" | "down" | "same" = today > yesterday ? "up" : today < yesterday ? "down" : "same";
  return { value: Math.round(Math.abs(change)), direction: dir };
}

function CompletionCard({
  title,
  value,
  total,
  icon: Icon,
  color,
  bgColor,
  progressColor,
  change,
}: {
  title: string;
  value: number;
  total: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  progressColor: string;
  change?: { value: number; direction: "up" | "down" | "same" };
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="flex items-center gap-1.5 md:gap-3 p-2 md:p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors w-[140px] md:w-auto md:flex-1">
      <div className={cn("rounded-lg p-1 md:p-2 flex-shrink-0", bgColor)}>
        <Icon className={cn("h-3 w-3 md:h-4 md:w-4", color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5 md:mb-1">
          <span className="text-[10px] md:text-xs text-muted-foreground truncate">{title}</span>
          {change && change.direction !== "same" && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-[9px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded-full flex-shrink-0",
                change.direction === "up" && "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
                change.direction === "down" && "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50"
              )}
            >
              {change.direction === "up" ? (
                <TrendingUp className="h-2 w-2 md:h-2.5 md:w-2.5" />
              ) : (
                <TrendingDown className="h-2 w-2 md:h-2.5 md:w-2.5" />
              )}
              {change.direction === "up" ? "+" : "-"}{change.value}%
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-sm md:text-lg font-bold">{value}</span>
          <span className="text-[10px] md:text-xs font-bold text-muted-foreground">{percentage}%</span>
        </div>
        <div className="h-1 md:h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DaySection({ day, prevDay, index, total }: { day: DayData; prevDay?: DayData; index: number; total: number }) {
  const prev = prevDay || {
    totalOrders: 0, confirmed: 0, shipped: 0, inDelivery: 0,
    delivered: 0, paid: 0, returnPending: 0, returned: 0,
  };

  const stats = [
    { title: "إجمالي الطلبات", value: day.totalOrders, total: day.totalOrders || 1, icon: ShoppingCart, color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900/60", progressColor: "bg-blue-600 dark:bg-blue-400", change: getChange(day.totalOrders, prev.totalOrders) },
    { title: "مؤكد", value: day.confirmed, total: day.totalOrders || 1, icon: CheckCircle, color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-100 dark:bg-emerald-900/60", progressColor: "bg-emerald-600 dark:bg-emerald-400", change: getChange(day.confirmed, prev.confirmed) },
    { title: "تم الشحن", value: day.shipped, total: day.confirmed || 1, icon: Send, color: "text-indigo-700 dark:text-indigo-300", bgColor: "bg-indigo-100 dark:bg-indigo-900/60", progressColor: "bg-indigo-600 dark:bg-indigo-400", change: getChange(day.shipped, prev.shipped) },
    { title: "قيد التوصيل", value: day.inDelivery, total: day.shipped || 1, icon: Truck, color: "text-cyan-700 dark:text-cyan-300", bgColor: "bg-cyan-100 dark:bg-cyan-900/60", progressColor: "bg-cyan-600 dark:bg-cyan-400", change: getChange(day.inDelivery, prev.inDelivery) },
    { title: "تم التوصيل", value: day.delivered, total: day.shipped || 1, icon: PackageCheck, color: "text-teal-700 dark:text-teal-300", bgColor: "bg-teal-100 dark:bg-teal-900/60", progressColor: "bg-teal-600 dark:bg-teal-400", change: getChange(day.delivered, prev.delivered) },
    { title: "قيد الإرجاع", value: day.returnPending, total: day.shipped || 1, icon: RotateCcw, color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/60", progressColor: "bg-amber-600 dark:bg-amber-400", change: getChange(day.returnPending, prev.returnPending) },
    { title: "تم الإرجاع", value: day.returned, total: day.shipped || 1, icon: RotateCcw, color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-100 dark:bg-rose-900/60", progressColor: "bg-rose-600 dark:bg-rose-400", change: getChange(day.returned, prev.returned) },
  ];

  const hasOrders = day.totalOrders > 0;

  return (
    <div className="overflow-visible">
      <Card className="overflow-visible py-2">
        <CardContent className="p-2 md:p-3 overflow-visible">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className="h-7 w-7 md:h-9 md:w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs md:text-sm font-bold text-primary">{day.totalOrders}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] md:text-sm font-bold">{day.dayName}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground">{day.date}</p>
            </div>
            {!hasOrders && (
              <span className="text-[9px] md:text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">لا توجد طلبات</span>
            )}
          </div>

          {hasOrders && (
            <div className="flex gap-1.5 md:gap-2">
              {stats.map((stat) => (
                <div key={stat.title} className="shrink-0">
                  <CompletionCard {...stat} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ProductOption {
  value: string;
  name: string;
  icon: string;
}

export function DailyCompletionSummary() {
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("currentMonth");
  const [customMonth, setCustomMonth] = useState("");
  const [viewMode, setViewMode] = useState("all");
  const [product, setProduct] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomMonth, setShowCustomMonth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiProducts, setApiProducts] = useState<ProductOption[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch("/api/products?limit=200")
      .then((res) => res.json())
      .then((data) => {
        const list: ProductOption[] = [
          { value: "", name: "جميع المنتجات", icon: "📦" },
          ...((data.products || (Array.isArray(data) ? data : [])).map((p: any) => ({
            value: p.id,
            name: p.name,
            icon: "📦",
          }))),
        ];
        setApiProducts(list);
      })
      .catch(() => {});
  }, []);

  const fetchCompletion = async (p?: string, cm?: string, vm?: string, pid?: string) => {
    try {
      const params = new URLSearchParams();
      params.set("period", p || "currentMonth");
      if (cm) params.set("customMonth", cm);
      if (vm) params.set("viewMode", vm);
      if (pid) params.set("product", pid);
      const res = await fetch(`/api/orders/completion?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDays(data.reverse());
      }
    } catch (err) {
      console.error("Failed to fetch completion data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletion(period, customMonth, viewMode, product);
    const interval = setInterval(() => fetchCompletion(period, customMonth, viewMode, product), 60000);
    return () => clearInterval(interval);
  }, [period, customMonth, viewMode, product]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    setShowCustomMonth(value === "customMonth");
    if (value !== "customMonth") setCustomMonth("");
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
  };

  const handleProductSelect = (value: string) => {
    setProduct(value);
    setShowProductDropdown(false);
    setSearchQuery("");
  };

  const clearFilters = () => {
    setPeriod("currentMonth");
    setCustomMonth("");
    setViewMode("all");
    setProduct("");
    setShowCustomMonth(false);
  };

  const hasActiveFilter = period !== "currentMonth" || viewMode !== "all" || product;
  const selectedProduct = apiProducts.find((p) => p.value === product);
  const filteredProducts = apiProducts.filter((p) =>
    p.name.includes(searchQuery) || p.value.includes(searchQuery)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            ملخص التكامل اليومي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-16 text-center">
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyData = days.some((d) => d.totalOrders > 0);

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            ملخص التكامل اليومي
          </div>
          {hasActiveFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
              مسح الفلاتر
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[
                { key: "all", label: "الكل" },
                { key: "orders", label: "طلبات" },
                { key: "abandoned", label: "متروكة" },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => handleViewModeChange(v.key)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                    viewMode === v.key
                      ? v.key === "abandoned"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-1.5">
              {[
                { key: "currentMonth", label: "الشهر الحالي" },
                { key: "lastMonth", label: "الشهر الماضي" },
                { key: "customMonth", label: "اختر شهر" },
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => handlePeriodChange(v.key)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                    period === v.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {showCustomMonth && (
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-muted text-muted-foreground border-0 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}

            <div className="h-6 w-px bg-border" />

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProductDropdown(!showProductDropdown)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  product
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {selectedProduct ? (
                  <>
                    <span>{selectedProduct.icon}</span>
                    <span>{selectedProduct.name}</span>
                  </>
                ) : (
                  <>
                    <Package className="h-3.5 w-3.5" />
                    <span>البحث عن المنتجات</span>
                  </>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", showProductDropdown && "rotate-180")} />
              </button>

              {showProductDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="البحث عن المنتجات..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 text-xs bg-muted/50 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => handleProductSelect(p.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right",
                          product === p.value && "bg-muted/50"
                        )}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!hasAnyData ? (
            <div className="py-16 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">لا توجد بيانات بعد</p>
              <p className="text-sm text-muted-foreground/60 mt-1">ستظهر هنا إحصائيات الطلبات تلقائياً عند وصول أول طلب</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {days.map((day, index) => (
                <DaySection
                  key={day.date}
                  day={day}
                  prevDay={index < days.length - 1 ? days[index + 1] : undefined}
                  index={index}
                  total={days.length}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
