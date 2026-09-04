"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_CONFIG, type StatusKey } from "@/components/orders/status-badge";
import { cn } from "@/lib/utils";
import { OrderCard } from "@/components/orders/order-card";
import { OrderDetailsSheet } from "@/components/orders/order-details-sheet";
import { OrderEditSheet } from "@/components/orders/order-edit-sheet";
import { QuickOrderForm } from "@/components/orders/quick-order-form";
import { OrderWithRelations } from "@/types";
import { useRouter } from "next/navigation";
import {
  Search,
  Package,
  X,
  RefreshCw,
  Loader2,
  ShoppingCart,
  Send,
  Truck,
  Check,
  Calendar,
  Filter,
  Clock,
  MessageSquareText,
  Plus,
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";

type ViewMode = "orders" | "abandoned";

type FilterKey = StatusKey | "ALL";

interface SendResult {
  sent: number;
  failed: number;
  results: { reference: string; success: boolean; tracking?: string; error?: string }[];
}

interface SyncResult {
  updated: number;
  total: number;
  details: { status: string; count: number }[];
  messagesSent: number;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [viewOrder, setViewOrder] = useState<OrderWithRelations | null>(null);
  const [editOrder, setEditOrder] = useState<OrderWithRelations | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);

  // Send mode
  const [sendMode, setSendMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingRemarks, setFetchingRemarks] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [remarksResult, setRemarksResult] = useState<{ newRemarks: number; details: { tracking: string; count: number }[] } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("orders");
  const [abandonedOrders, setAbandonedOrders] = useState<OrderWithRelations[]>([]);
  const [loadingAbandoned, setLoadingAbandoned] = useState(false);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; image: string | null }[]>([]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders?limit=200");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAbandoned = useCallback(async () => {
    setLoadingAbandoned(true);
    try {
      const res = await fetch("/api/orders/abandoned");
      if (res.ok) {
        const data = await res.json();
        setAbandonedOrders(data);
      }
    } catch { /* ignore */ } finally {
      setLoadingAbandoned(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    fetchAllProducts();
  }, [loadOrders]);

  const fetchAllProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=200");
      if (res.ok) {
        const data = await res.json();
        const list = (data.products || []).map((p: any) => {
          let img: string | null = null;
          try {
            const parsed = typeof p.images === "string" ? JSON.parse(p.images) : p.images;
            img = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
          } catch {}
          return { id: p.id, name: p.name, image: img };
        });
        setAllProducts(list);
      }
    } catch {}
  };

  useEffect(() => {
    if (viewMode === "abandoned") loadAbandoned();
  }, [viewMode, loadAbandoned]);

  const getStatusCount = (status: StatusKey) => timeFilteredOrders.filter((o) => o.status === status).length;

  const handleStatusChange = async (orderId: string, newStatus: StatusKey) => {
    // Check regular orders first
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      if (order.status === "SHIPPED" && newStatus === "CONFIRMED") {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "CONFIRMED", deliveryReference: null } : o
          )
        );
        try {
          await fetch(`/api/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CONFIRMED", deliveryReference: null }),
          });
        } catch {
          loadOrders();
        }
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );
      try {
        await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch {
        loadOrders();
      }
      return;
    }

    // Check abandoned orders
    const abandoned = abandonedOrders.find((o) => o.id === orderId);
    if (abandoned) {
      setAbandonedOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );
      try {
        const res = await fetch(`/api/orders/abandoned/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          loadAbandoned();
        }
      } catch {
        loadAbandoned();
      }
    }
  };

  const handleReturnToConfirmed = async (orderId: string) => {
    if (!confirm("هل تريد إرجاع هذا الطلب لحالة تم التأكيد؟ سيُحذف رقم التتبع")) return;

    const isAbandoned = abandonedOrders.some((o) => o.id === orderId);
    if (isAbandoned) {
      setAbandonedOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "CONFIRMED", deliveryReference: null } : o
        )
      );
      try {
        const res = await fetch(`/api/orders/abandoned/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED", deliveryReference: null }),
        });
        if (!res.ok) loadAbandoned();
      } catch {
        loadAbandoned();
      }
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "CONFIRMED", deliveryReference: null } : o
      )
    );
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED", deliveryReference: null }),
      });
      if (!res.ok) loadOrders();
    } catch {
      loadOrders();
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;

    // Check regular orders
    const isRegular = orders.some((o) => o.id === orderId);
    if (isRegular) {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
        if (res.ok) {
          setOrders((prev) => prev.filter((order) => order.id !== orderId));
          setSelectedIds((prev) => { const next = new Set(prev); next.delete(orderId); return next; });
        }
      } catch {
        loadOrders();
      }
      return;
    }

    // Check abandoned orders
    const isAbandoned = abandonedOrders.some((o) => o.id === orderId);
    if (isAbandoned) {
      try {
        const res = await fetch(`/api/orders/abandoned/${orderId}`, { method: "DELETE" });
        if (res.ok) {
          setAbandonedOrders((prev) => prev.filter((order) => order.id !== orderId));
        }
      } catch {
        loadAbandoned();
      }
    }
  };

  const handleViewOrder = async (order: OrderWithRelations) => {
    setDetailsOpen(true);
    setViewOrder({ ...order, statusHistory: [] });
    try {
      const endpoint = viewMode === "abandoned" ? `/api/orders/abandoned/${order.id}` : `/api/orders/${order.id}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const full = await res.json();
        setViewOrder(full);
      }
    } catch { /* keep basic data */ }
  };

  const handleEditOrder = (order: OrderWithRelations) => {
    setEditOrder(order);
    setEditOpen(true);
  };

  const handleSaveEdit = (updated: OrderWithRelations) => {
    if ((updated as any)._isAbandoned) {
      setAbandonedOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      loadAbandoned();
    } else {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    }
  };

  // Send mode handlers
  const enterSendMode = () => {
    setSendMode(true);
    setSelectedIds(new Set());
  };

  const exitSendMode = () => {
    setSendMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === confirmedOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(confirmedOrders.map((o) => o.id)));
    }
  };

  // CONFIRMED orders only (filtered by product) - works for both regular and abandoned
  const confirmedOrders = useMemo(() => {
    if (viewMode === "abandoned") {
      return abandonedOrders.filter((o) => {
        if (o.status !== "CONFIRMED") return false;
        if (productFilter !== "ALL" && o.productId !== productFilter) return false;
        return true;
      });
    }
    return orders.filter((o) => {
      if (o.status !== "CONFIRMED" || o.deliveryReference) return false;
      if (productFilter !== "ALL" && o.productId !== productFilter) return false;
      return true;
    });
  }, [orders, abandonedOrders, productFilter, viewMode]);

  const allConfirmedSelected = confirmedOrders.length > 0 && selectedIds.size === confirmedOrders.length;

  // Send orders
  const handleSend = async () => {
    if (selectedIds.size === 0) {
      alert("حدد طلبات أولاً");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/delivery/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشلت عملية الإرسال");
        return;
      }
      setSendResult(data as SendResult);
      exitSendMode();
      if (viewMode === "abandoned") {
        loadAbandoned();
      } else {
        loadOrders();
      }
    } catch {
      alert("حدث خطأ أثناء الإرسال");
    } finally {
      setSending(false);
    }
  };

  // Sync orders
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/delivery/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({
          updated: data.updated || 0,
          total: data.total || 0,
          details: data.details || [],
          messagesSent: data.messagesSent || 0,
        });
        loadOrders();
        loadAbandoned();
      } else {
        alert(data.error || "فشلت المزامنة");
      }
    } catch {
      alert("فشلت المزامنة");
    } finally {
      setSyncing(false);
    }
  };

  // Fetch delivery remarks
  const handleFetchRemarks = async () => {
    setFetchingRemarks(true);
    try {
      const res = await fetch("/api/delivery/remarks", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setRemarksResult({
          newRemarks: data.newRemarks || 0,
          details: data.details || [],
        });
        loadOrders();
        loadAbandoned();
      } else {
        alert(data.error || "فشلت جلب الملاحظات");
      }
    } catch {
      alert("فشلت جلب الملاحظات");
    } finally {
      setFetchingRemarks(false);
    }
  };

  // Get unique products for filter (with images) - from all products
  const products = useMemo(() => {
    return allProducts;
  }, [allProducts]);

  // Time filter logic
  const isWithinTimeFilter = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    if (timeFilter === "custom") {
      if (dateFrom && dateTo) {
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59);
        return d >= from && d <= to;
      }
      return true;
    }
    switch (timeFilter) {
      case "today":
        return d.toDateString() === now.toDateString();
      case "yesterday": {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
      }
      case "30days": {
        const month = new Date(now);
        month.setDate(month.getDate() - 30);
        return d >= month;
      }
      default:
        return true;
    }
  };

  const timeFilteredOrders = useMemo(() => orders.filter((o) => {
    if (productFilter !== "ALL" && o.productId !== productFilter) return false;
    return isWithinTimeFilter(o.createdAt);
  }), [orders, timeFilter, dateFrom, dateTo, productFilter]);
  const timeFilteredAbandoned = useMemo(() => abandonedOrders.filter((o) => {
    if (productFilter !== "ALL" && o.productId !== productFilter) return false;
    return isWithinTimeFilter(o.createdAt);
  }), [abandonedOrders, timeFilter, dateFrom, dateTo, productFilter]);

  const RETURN_STATUSES = ["CUSTOMER_REORDERED", "RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED"];
  const phoneWarnings = useMemo(() => {
    const map: Record<string, ("return" | "duplicate")[]> = {};
    const byPhone: Record<string, typeof orders> = {};
    const allOrders = [...orders, ...abandonedOrders];
    for (const o of allOrders) {
      if (!o.customerPhone) continue;
      if (!byPhone[o.customerPhone]) byPhone[o.customerPhone] = [];
      byPhone[o.customerPhone].push(o);
    }
    for (const [, phoneOrders] of Object.entries(byPhone)) {
      if (phoneOrders.length < 2) continue;
      const sorted = [...phoneOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const anyHasReturn = sorted.some((o) => o.status && RETURN_STATUSES.includes(o.status));
      for (let i = 1; i < sorted.length; i++) {
        const o = sorted[i];
        const isReturn = o.status && RETURN_STATUSES.includes(o.status);
        if (i === 1 && anyHasReturn && !isReturn) {
          map[o.id] = ["return"];
        } else if (isReturn) {
          map[o.id] = ["duplicate", "return"];
        } else {
          map[o.id] = ["duplicate"];
        }
      }
    }
    return map;
  }, [orders, abandonedOrders]);

  const filteredOrders = timeFilteredOrders.filter((order) => {
    if (filterStatus !== "ALL") return order.status === filterStatus;
    return true;
  }).filter((order) => {
    if (!search) return true;
    return (
      order.customerName.includes(search) ||
      order.customerPhone.includes(search) ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (order.deliveryReference && order.deliveryReference.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const filteredAbandonedOrders = timeFilteredAbandoned.filter((order) => {
    if (filterStatus !== "ALL") return order.status === filterStatus;
    return true;
  }).filter((order) => {
    if (!search) return true;
    return (
      order.customerName.includes(search) ||
      order.customerPhone.includes(search) ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (order.deliveryReference && order.deliveryReference.toLowerCase().includes(search.toLowerCase()))
    );
  });

  // Smart filters
  const activeStatuses = useMemo(() => {
    const statusCounts: Partial<Record<StatusKey, number>> = {};
    timeFilteredOrders.forEach((order) => {
      const s = order.status as StatusKey;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    return Object.entries(statusCounts)
      .filter(([_, count]) => count! > 0)
      .map(([status]) => status as StatusKey);
  }, [timeFilteredOrders]);

  const abandonedStatuses = useMemo(() => {
    const statusCounts: Partial<Record<StatusKey, number>> = {};
    timeFilteredAbandoned.forEach((order) => {
      const s = order.status as StatusKey;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    return Object.entries(statusCounts)
      .filter(([_, count]) => count! > 0)
      .map(([status]) => status as StatusKey);
  }, [timeFilteredAbandoned]);

  const getAbandonedStatusCount = (status: StatusKey) => timeFilteredAbandoned.filter((o) => o.status === status).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Page Header */}
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">الطلبات</h1>
              {viewMode === "abandoned" && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">
                  متروكة
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Send Orders Button - Blue */}
              {!sendMode ? (
                <>
                   <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={handleSync}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={handleFetchRemarks}
                    disabled={fetchingRemarks}
                    title="جلب ملاحظات شركة الشحن"
                  >
                    {fetchingRemarks ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquareText className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={viewMode === "abandoned" ? loadAbandoned : loadOrders}
                  >
                    <RefreshCw className={`h-4 w-4 ${(viewMode === "abandoned" ? loadingAbandoned : loading) ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 sm:px-4 gap-1.5 text-sm"
                    onClick={enterSendMode}
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">إرسال طلبات</span>
                    <span className="sm:hidden">إرسال</span>
                  </Button>
                  <Button
                    className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 gap-1.5 text-sm"
                    onClick={() => setQuickOrderOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 gap-1.5 text-sm"
                    onClick={handleSend}
                    disabled={selectedIds.size === 0 || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>إرسال ({selectedIds.size})</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl font-bold text-sm"
                    onClick={exitSendMode}
                  >
                    إلغاء
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Send Mode - Select All Bar + Product Filter */}
          {sendMode && (
            <div className="space-y-2 mb-3">
              {/* Product Filter in Send Mode */}
              {products.length > 0 && (
                <div className="relative" ref={productDropdownRef}>
                  <button
                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                    className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-card text-xs font-bold hover:border-purple-300 dark:hover:border-purple-700 transition-all w-full"
                  >
                    {productFilter !== "ALL" ? (
                      <>
                        {(() => {
                          const p = products.find((x) => x.id === productFilter);
                          return p?.image ? (
                            <img src={p.image} alt="" className="w-5 h-5 rounded-md object-cover" />
                          ) : (
                            <Package className="h-3.5 w-3.5 text-purple-600" />
                          );
                        })()}
                        <span className="text-foreground">{products.find((x) => x.id === productFilter)?.name}</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>كل المنتجات</span>
                      </>
                    )}
                    <svg className={`h-3 w-3 text-muted-foreground transition-transform ml-auto ${productDropdownOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                  </button>

                  {productDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProductDropdownOpen(false)} />
                      <div className="absolute top-full mt-1 left-0 right-0 sm:left-auto sm:right-auto sm:w-72 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={() => { setProductFilter("ALL"); setProductDropdownOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${productFilter === "ALL" ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-muted"}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">كل المنتجات</p>
                            <p className="text-[11px] text-muted-foreground">{confirmedOrders.length} طلب مؤكد</p>
                          </div>
                          {productFilter === "ALL" && <div className="h-2 w-2 rounded-full bg-purple-600" />}
                        </button>
                        <div className="h-px bg-border mx-3" />
                        <div className="max-h-64 overflow-y-auto">
                          {products.map((p) => {
                            const sourceOrders = viewMode === "abandoned" ? abandonedOrders : orders;
                            const count = sourceOrders.filter((o) => o.productId === p.id && o.status === "CONFIRMED" && !o.deliveryReference).length;
                            if (count === 0) return null;
                            return (
                              <button
                                key={p.id}
                                onClick={() => { setProductFilter(productFilter === p.id ? "ALL" : p.id); setProductDropdownOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${productFilter === p.id ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-muted"}`}
                              >
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{p.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{count} طلب مؤكد</p>
                                </div>
                                {productFilter === p.id && <div className="h-2 w-2 rounded-full bg-purple-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300">
                  <div className={cn(
                    "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                    allConfirmedSelected ? "bg-blue-600 border-blue-600" : "border-blue-400"
                  )}>
                    {allConfirmedSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  تحديد الكل ({confirmedOrders.length})
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-bold">
                    {selectedIds.size} محدد
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Status Chips */}
          {!sendMode && (
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
                  {viewMode === "orders" ? timeFilteredOrders.length : timeFilteredAbandoned.length}
                </span>
                <span className="whitespace-nowrap">الكل</span>
              </button>

              {(viewMode === "orders" ? activeStatuses : abandonedStatuses).map((status) => {
                const conf = STATUS_CONFIG[status];
                const isActive = filterStatus === status;
                const count = viewMode === "orders" ? getStatusCount(status) : getAbandonedStatusCount(status);
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
          )}
        </div>

        <div className="p-4 space-y-3 overflow-visible">
          {/* Search + Filters - both views */}
          {!sendMode && (
            <>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الرقم أو رقم التتبع..."
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
              <div className="flex items-center gap-1.5 flex-wrap overflow-visible">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                {[
                  { key: "all", label: "كل" },
                  { key: "today", label: "اليوم" },
                  { key: "yesterday", label: "أمس" },
                  { key: "30days", label: "آخر 30 يوم" },
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
                <DateRangePicker
                  from={dateFrom}
                  to={dateTo}
                  onChange={(from, to) => { setDateFrom(from); setDateTo(to); setTimeFilter("custom"); }}
                />
              </div>

              {/* Separator */}
              <div className="h-px bg-border" />

              {/* View Toggle + Product Filter */}
              <div className="flex items-center gap-2">
                {/* Product Filter - Dropdown (right side) */}
                {products.length > 0 && (
                  <div className="relative flex-1" ref={productDropdownRef}>
                    <button
                      onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                      className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-card text-xs font-bold hover:border-purple-300 dark:hover:border-purple-700 transition-all w-full"
                    >
                      {productFilter !== "ALL" ? (
                        <>
                          {(() => {
                            const p = products.find((x) => x.id === productFilter);
                            return p?.image ? (
                              <img src={p.image} alt="" className="w-5 h-5 rounded-md object-cover" />
                            ) : (
                              <Package className="h-3.5 w-3.5 text-purple-600" />
                            );
                          })()}
                          <span className="text-foreground">{products.find((x) => x.id === productFilter)?.name}</span>
                        </>
                      ) : (
                        <>
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>كل المنتجات</span>
                        </>
                      )}
                      <svg className={`h-3 w-3 text-muted-foreground transition-transform ml-auto ${productDropdownOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                    </button>

                    {productDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setProductDropdownOpen(false)} />
                        <div className="absolute top-full mt-1 left-0 right-0 sm:left-auto sm:right-auto sm:w-72 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                          {/* All Products Option */}
                          <button
                            onClick={() => { setProductFilter("ALL"); setProductDropdownOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${productFilter === "ALL" ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-muted"}`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold">كل المنتجات</p>
                              <p className="text-[11px] text-muted-foreground">{viewMode === "orders" ? timeFilteredOrders.length : timeFilteredAbandoned.length} طلب</p>
                            </div>
                            {productFilter === "ALL" && <div className="h-2 w-2 rounded-full bg-purple-600" />}
                          </button>

                          <div className="h-px bg-border mx-3" />

                          {/* Product List */}
                          <div className="max-h-64 overflow-y-auto">
                            {products.map((p) => {
                              const count = (viewMode === "orders" ? orders : abandonedOrders).filter((o) => o.productId === p.id).length;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => { setProductFilter(productFilter === p.id ? "ALL" : p.id); setProductDropdownOpen(false); }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${productFilter === p.id ? "bg-purple-50 dark:bg-purple-900/20" : "hover:bg-muted"}`}
                                >
                                  {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{p.name}</p>
                                    <p className="text-[11px] text-muted-foreground">{count} طلب</p>
                                  </div>
                                  {productFilter === p.id && <div className="h-2 w-2 rounded-full bg-purple-600" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* View Toggle - on/off pill (left side) */}
                <button
                  onClick={() => setViewMode(viewMode === "orders" ? "abandoned" : "orders")}
                  className="flex-shrink-0 h-9 w-[130px] bg-muted rounded-xl p-1 flex items-center relative cursor-pointer"
                >
                  <div
                    className={`absolute top-1 bottom-1 w-[63px] rounded-lg shadow-sm transition-all duration-200 ${
                      viewMode === "orders"
                        ? "right-1 bg-primary"
                        : "left-1 bg-amber-500"
                    }`}
                  />
                  <span className={`relative z-10 flex-1 text-center text-[11px] font-bold transition-colors ${
                      viewMode === "orders" ? "text-primary-foreground" : "text-muted-foreground"
                    }`}>
                    الطلبات
                  </span>
                  <span className={`relative z-10 flex-1 text-center text-[11px] font-bold transition-colors ${
                      viewMode === "abandoned" ? "text-white" : "text-muted-foreground"
                    }`}>
                    متروكة
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Send Mode - CONFIRMED orders with checkboxes */}
          {sendMode ? (
            <div className="space-y-2.5">
              {confirmedOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="h-14 w-14 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-bold text-muted-foreground">
                    {viewMode === "abandoned" ? "لا توجد طلبات متروكة مؤكدة" : "لا توجد طلبات مؤكدة"}
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">أرسل الطلبات بعد تأكيدها</p>
                </div>
              ) : (
                confirmedOrders.map((order) => (
                  <div key={order.id} className="flex items-start gap-2">
                    <button
                      onClick={() => toggleSelect(order.id)}
                      className="mt-4 flex-shrink-0"
                    >
                      <div className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                        selectedIds.has(order.id) ? "bg-blue-600 border-blue-600" : "border-border"
                      )}>
                        {selectedIds.has(order.id) && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <OrderCard
                        order={order}
                        onView={() => handleViewOrder(order)}
                        onEdit={() => handleEditOrder(order)}
                        onDelete={() => handleDeleteOrder(order.id)}
                        onStatusChange={(status) => handleStatusChange(order.id, status)}
                        onReturnToConfirmed={() => handleReturnToConfirmed(order.id)}
                        phoneWarning={phoneWarnings[order.id]}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (viewMode === "orders" || viewMode === "abandoned") ? (
            <>
              {(viewMode === "orders" && loading) ? (
                <div className="py-20 text-center">
                  <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">جاري تحميل الطلبات...</p>
                </div>
              ) : viewMode === "abandoned" && loadingAbandoned ? (
                <div className="py-20 text-center">
                  <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">جاري تحميل الطلبات المتروكة...</p>
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
              ) : (viewMode === "orders" ? filteredOrders.length === 0 : filteredAbandonedOrders.length === 0) ? (
                <div className="py-20 text-center">
                  <Package className="h-14 w-14 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-bold text-muted-foreground">
                    {viewMode === "orders" ? "لا توجد طلبات" : "لا توجد طلبات متروكة"}
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">لم يتم العثور على طلبات تطابق الفلتر</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(viewMode === "orders" ? filteredOrders : filteredAbandonedOrders).map((order) => {
                    return (
                      <div key={order.id} className="relative">
                        {viewMode === "abandoned" && (
                          <div className="absolute -top-1 -right-1 z-10 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow">
                            متروك
                          </div>
                        )}
                        <OrderCard
                          order={order}
                          onView={() => handleViewOrder(order)}
                          onEdit={() => handleEditOrder(order)}
                          onDelete={() => handleDeleteOrder(order.id)}
                          onStatusChange={(status) => handleStatusChange(order.id, status)}
                          onReturnToConfirmed={() => handleReturnToConfirmed(order.id)}
                        phoneWarning={phoneWarnings[order.id]}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Send Result Modal */}
      {sendResult && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={() => setSendResult(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">نتيجة الإرسال</h3>
                <button onClick={() => setSendResult(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-emerald-600">{sendResult.sent}</p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">تم الإرسال</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-red-600">{sendResult.failed}</p>
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 mt-1">فشل</p>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(sendResult.results || []).map((r, i) => (
                    <div key={i} className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg text-sm",
                      r.success ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-red-50 dark:bg-red-900/10"
                    )}>
                      <span className="font-mono text-xs">{r.reference}</span>
                      {r.success ? (
                        <span className="text-emerald-600 font-bold text-xs">{r.tracking}</span>
                      ) : (
                        <span className="text-red-500 text-xs">{r.error}</span>
                      )}
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={() => setSendResult(null)}>إغلاق</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sync Result Modal */}
      {syncResult && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={() => setSyncResult(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">نتيجة المزامنة</h3>
                <button onClick={() => setSyncResult(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-blue-600">{syncResult.updated}</p>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-1">طلب تم تحديثه من أصل {syncResult.total}</p>
                </div>
                {syncResult.details.length > 0 && (
                  <div className="space-y-1.5">
                    {syncResult.details.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                        <span className="font-bold">{STATUS_CONFIG[d.status as StatusKey]?.label || d.status}</span>
                        <span className="text-primary font-bold">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
                {syncResult.updated === 0 && syncResult.total > 0 && (
                  <p className="text-center text-sm text-muted-foreground">جميع الطلبات محدثة</p>
                )}
                {syncResult.total === 0 && (
                  <p className="text-center text-sm text-muted-foreground">لا يوجد طلبات للمزامنة</p>
                )}
                {syncResult.messagesSent > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-black text-emerald-600">{syncResult.messagesSent}</p>
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">رسالة إنجاد تلقائية تم إرسالها</p>
                  </div>
                )}
                <Button className="w-full" onClick={() => setSyncResult(null)}>إغلاق</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remarks Result Modal */}
      {remarksResult && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={() => setRemarksResult(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">ملاحظات شركة الشحن</h3>
                <button onClick={() => setRemarksResult(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-amber-600">{remarksResult.newRemarks}</p>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-1">ملاحظة جديدة</p>
                </div>
                {remarksResult.details.length > 0 && (
                  <div className="space-y-1.5">
                    {remarksResult.details.map((d, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                        <span className="font-mono text-xs">{d.tracking}</span>
                        <span className="text-primary font-bold">{d.count} ملاحظة</span>
                      </div>
                    ))}
                  </div>
                )}
                {remarksResult.newRemarks === 0 && (
                  <p className="text-center text-sm text-muted-foreground">لا توجد ملاحظات جديدة</p>
                )}
                <Button className="w-full" onClick={() => setRemarksResult(null)}>إغلاق</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sheets */}
      <OrderDetailsSheet
        order={viewOrder}
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setViewOrder(null); }}
      />

      <OrderEditSheet
        order={editOrder}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditOrder(null); }}
        onSave={handleSaveEdit}
      />

      <QuickOrderForm
        open={quickOrderOpen}
        onClose={() => setQuickOrderOpen(false)}
        onOrderCreated={() => { loadOrders(); }}
      />
    </DashboardLayout>
  );
}
