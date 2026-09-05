"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { WorkerLayout } from "@/components/layout/worker-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/orders/order-card";
import { OrderDetailsSheet } from "@/components/orders/order-details-sheet";
import { OrderEditSheet } from "@/components/orders/order-edit-sheet";
import { STATUS_CONFIG, type StatusKey } from "@/components/orders/status-badge";
import { cn } from "@/lib/utils";
import { Search, Package, X, RefreshCw, Loader2, Calendar, Filter } from "lucide-react";

type FilterKey = StatusKey | "ALL";

interface Worker {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
}

interface OrderData {
  id: string;
  orderNumber: string;
  productId: string;
  variantId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  wilayaId: string;
  baladyaId: string | null;
  quantity: number;
  productPrice: number;
  shippingPrice: number;
  totalPrice: number;
  purchasePrice: number;
  consumedEntries: string | null;
  status: string;
  attemptCount: number;
  notes: string | null;
  deliveryReference: string | null;
  shippingCompany: string | null;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; slug: string; shortDescription: string | null; fullDescription: string | null; price: number; images: string; orderCount: number; isActive: boolean; createdAt: string; updatedAt: string };
  variant: { id: string; name: string; price: number; stock: number } | null;
  wilaya: { id: string; name: string; code: string; baladyas: any[]; orders: any[] };
  baladya: { id: string; name: string; arabicName: string | null; wilayaId: string; code: string | null; orders: any[] } | null;
  statusHistory: any[];
}

export default function WorkerOrdersPage({ params }: { params: Promise<{ username: string }> }) {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [abandonedOrders, setAbandonedOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"orders" | "abandoned">("orders");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [viewOrder, setViewOrder] = useState<any>(null);
  const [editOrder, setEditOrder] = useState<OrderData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setUsername(p.username));
  }, [params]);

  // Auth check: verify logged-in user matches this worker
  useEffect(() => {
    if (!username) return;
    fetch("/api/auth/[...nextauth]?action=session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
        } else if (data.user.role === "ADMIN") {
          // Admin can view any worker page
        } else if (data.user.username !== username) {
          router.push(`/worker/${data.user.username}`);
        }
      })
      .catch(() => router.push("/login"));
  }, [username, router]);

  const loadOrders = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/worker/${username}/orders`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setWorker(data.worker);
      setOrders(data.orders || []);
      setAbandonedOrders(data.abandonedOrders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const sourceOrders = viewMode === "orders" ? orders : abandonedOrders;

  const getStatusCount = (status: StatusKey) => sourceOrders.filter((o) => o.status === status).length;

  const handleStatusChange = async (orderId: string, newStatus: StatusKey, isAbandoned?: boolean) => {
    if (isAbandoned) {
      setAbandonedOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      try {
        await fetch(`/api/worker/${username}/orders`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, status: newStatus, isAbandoned: true }),
        });
      } catch {
        loadOrders();
      }
      return;
    }
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    try {
      await fetch(`/api/worker/${username}/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
    } catch {
      loadOrders();
    }
  };

  const handleDeleteOrder = async (orderId: string, isAbandoned?: boolean) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      const endpoint = isAbandoned ? `/api/orders/abandoned/${orderId}` : `/api/orders/${orderId}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        if (isAbandoned) {
          setAbandonedOrders((prev) => prev.filter((order) => order.id !== orderId));
        } else {
          setOrders((prev) => prev.filter((order) => order.id !== orderId));
        }
      }
    } catch {
      loadOrders();
    }
  };

  const handleViewOrder = async (order: OrderData) => {
    setDetailsOpen(true);
    setViewOrder({ ...order, statusHistory: [] });
    const isAbandoned = (order as any)._isAbandoned;
    try {
      const endpoint = isAbandoned ? `/api/orders/abandoned/${order.id}` : `/api/orders/${order.id}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const full = await res.json();
        setViewOrder(full);
      }
    } catch { /* keep basic data */ }
  };

  const handleEditOrder = (order: OrderData) => {
    setEditOrder(order);
    setEditOpen(true);
  };

  const handleSaveEdit = (updated: OrderData) => {
    if ((updated as any)._isAbandoned) {
      setAbandonedOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } else {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    }
  };

  const isWithinTimeFilter = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    switch (timeFilter) {
      case "today":
        return d.toDateString() === now.toDateString();
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
      }
      case "7days": {
        const week = new Date(now);
        week.setDate(week.getDate() - 7);
        return d >= week;
      }
      case "30days": {
        const month = new Date(now);
        month.setDate(month.getDate() - 30);
        return d >= month;
      }
      case "custom":
        if (dateFrom && dateTo) {
          const from = new Date(dateFrom);
          const to = new Date(dateTo);
          to.setHours(23, 59, 59);
          return d >= from && d <= to;
        }
        return true;
      default:
        return true;
    }
  };

  const filteredOrders = sourceOrders.filter((order) => {
    if (filterStatus !== "ALL") return order.status === filterStatus;
    return true;
  }).filter((order) => {
    return isWithinTimeFilter(new Date(order.createdAt));
  }).filter((order) => {
    if (!search) return true;
    return (
      order.customerName.includes(search) ||
      order.customerPhone.includes(search) ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase())
    );
  });

  const activeStatuses = useMemo(() => {
    const statusCounts: Partial<Record<StatusKey, number>> = {};
    sourceOrders.forEach((order) => {
      const s = order.status as StatusKey;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    return Object.entries(statusCounts)
      .filter(([_, count]) => count! > 0)
      .map(([status]) => status as StatusKey);
  }, [sourceOrders]);

  if (!username) return null;

  return (
    <WorkerLayout username={username} workerName={worker?.name || username}>
      <div className="min-h-screen bg-background">
        {/* Page Header */}
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">طلباتي</h1>
              {viewMode === "abandoned" && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">
                  متروكة ({abandonedOrders.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={loadOrders}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* View Toggle: الطلبات / متروكة */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setViewMode(viewMode === "orders" ? "abandoned" : "orders"); setFilterStatus("ALL"); }}
              className="flex-shrink-0 h-9 w-[150px] bg-muted rounded-xl p-1 flex items-center relative cursor-pointer"
            >
              <div
                className={`absolute top-1 bottom-1 w-[71px] rounded-lg shadow-sm transition-all duration-200 ${
                  viewMode === "orders"
                    ? "right-1 bg-primary"
                    : "left-1 bg-amber-500"
                }`}
              />
              <span className={`relative z-10 flex-1 text-center text-[11px] font-bold transition-colors ${
                  viewMode === "orders" ? "text-primary-foreground" : "text-muted-foreground"
                }`}>
                الطلبات ({orders.length})
              </span>
              <span className={`relative z-10 flex-1 text-center text-[11px] font-bold transition-colors ${
                  viewMode === "abandoned" ? "text-white" : "text-muted-foreground"
                }`}>
                متروكة ({abandonedOrders.length})
              </span>
            </button>
          </div>

          {/* Status Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl transition-all duration-200 flex-shrink-0 font-bold text-sm ${
                filterStatus === "ALL"
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted border border-border hover:shadow-sm"
              }`}
            >
              <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                filterStatus === "ALL" ? "bg-background text-foreground" : "bg-background text-muted-foreground"
              }`}>
                {sourceOrders.length}
              </span>
              <span className="whitespace-nowrap">الكل</span>
            </button>

            {activeStatuses.map((status) => {
              const conf = STATUS_CONFIG[status];
              const isActive = filterStatus === status;
              const count = getStatusCount(status);
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(isActive ? "ALL" : status)}
                  className={`flex items-center gap-2 pl-2.5 pr-2.5 py-2 rounded-xl transition-all duration-200 flex-shrink-0 font-bold text-sm border ${
                    isActive
                      ? `${conf.bg} ${conf.color} ${conf.border} shadow-md`
                      : `bg-card border-border hover:shadow-sm`
                  }`}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", conf.dot)} />
                  <span className={`whitespace-nowrap text-xs ${isActive ? conf.color : "text-foreground"}`}>{conf.label}</span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[22px] text-center ${isActive ? "bg-white/20" : "bg-muted"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الرقم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-11 bg-card border-border rounded-xl text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {[
              { key: "all", label: "الكل" },
              { key: "today", label: "اليوم" },
              { key: "yesterday", label: "أمس" },
              { key: "7days", label: "7 أيام" },
              { key: "30days", label: "30 يوم" },
              { key: "custom", label: "مخصص" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTimeFilter(t.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                  timeFilter === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {timeFilter === "custom" && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium"
              />
              <span className="text-xs text-muted-foreground font-bold">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium"
              />
            </div>
          )}

          {/* Orders List */}
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">جاري تحميل الطلبات...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <Package className="h-14 w-14 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-bold text-muted-foreground">خطأ في التحميل</p>
              <p className="text-sm text-muted-foreground/60 mt-1">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="h-14 w-14 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-bold text-muted-foreground">
                {viewMode === "abandoned" ? "لا توجد طلبات متروكة" : "لا توجد طلبات"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">لم يتم العثور على طلبات تطابق الفلتر</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order as any}
                  onView={() => handleViewOrder(order)}
                  onEdit={() => handleEditOrder(order)}
                  onDelete={() => handleDeleteOrder(order.id, (order as any)._isAbandoned)}
                  onStatusChange={(status) => handleStatusChange(order.id, status, (order as any)._isAbandoned)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sheets */}
      <OrderDetailsSheet
        order={viewOrder}
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setViewOrder(null); }}
      />

      <OrderEditSheet
        order={editOrder as any}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditOrder(null); }}
        onSave={handleSaveEdit as any}
      />
    </WorkerLayout>
  );
}
