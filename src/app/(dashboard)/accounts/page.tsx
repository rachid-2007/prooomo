"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, Calculator, TrendingUp, TrendingDown, DollarSign, Package, Truck, BarChart3, Calendar, Search, Loader2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface WeeklyAccount {
  id: string;
  title: string;
  weekStart: string;
  weekEnd: string;
  totalOrders: number;
  confirmedOrders: number;
  abandonedOrders: number;
  adSpendEuro: number;
  exchangeRate: number;
  deliveredOrders: number;
  deliveredAbandoned: number;
  deliveryRate: number;
  abandonedDeliveryRate: number;
  confirmationExpenses: number;
  packagingPerUnit: number;
  productPurchasePrice: number;
  sellingPrice: number;
  createdAt: string;
}

interface Calculations {
  confirmationRate: number;
  confirmationRateTotal: number;
  totalOrdersCalc: number;
  adSpendDzd: number;
  costPerOrderEuro: number;
  costPerOrderDzd: number;
  costPerOrderAbandonedEuro: number;
  costPerOrderAbandonedDzd: number;
  costPerShippedEuro: number;
  costPerShippedDzd: number;
  costPerShippedAbandonedEuro: number;
  costPerShippedAbandonedDzd: number;
  totalDelivered: number;
  overallDeliveryRate: number;
  totalPackagingCost: number;
  costPerConfirmation: number;
  totalCostEuro: number;
  totalCostDzd: number;
  totalCostAbandonedEuro: number;
  totalCostAbandonedDzd: number;
  netProfitPerUnit: number;
  netProfitDelivered: number;
  profitAbandoned: number;
  totalProfit: number;
  dailyAverageProfit: number;
  dailyAverageAbandonedProfit: number;
  dailyTotalAverageProfit: number;
  dailyOrdersDelivered: number;
}

function calculate(data: WeeklyAccount): Calculations {
  const confirmationRate = data.totalOrders > 0 ? (data.confirmedOrders / data.totalOrders) * 100 : 0;
  const confirmationRateTotal = (data.confirmedOrders + data.abandonedOrders) > 0 ? (data.confirmedOrders / (data.confirmedOrders + data.abandonedOrders)) * 100 : 0;
  const adSpendDzd = data.adSpendEuro * data.exchangeRate;
  // مبيعة = الإنفاق / إجمالي الطلبات
  const costPerOrderEuro = data.totalOrders > 0 ? data.adSpendEuro / data.totalOrders : 0;
  const costPerOrderDzd = costPerOrderEuro * data.exchangeRate;
  // مبيعة + متروكة = الإنفاق / (الطلبات + متروكة مؤكدة)
  const costPerOrderAbandonedEuro = (data.totalOrders + data.abandonedOrders) > 0 ? data.adSpendEuro / (data.totalOrders + data.abandonedOrders) : 0;
  const costPerOrderAbandonedDzd = costPerOrderAbandonedEuro * data.exchangeRate;
  // مبيعة مشحونة = الإنفاق / الطلبات المؤكدة
  const costPerShippedEuro = data.confirmedOrders > 0 ? data.adSpendEuro / data.confirmedOrders : 0;
  const costPerShippedDzd = costPerShippedEuro * data.exchangeRate;
  // مشحون + متروكة = الإنفاق / (مؤكدة + متروكة مؤكدة)
  const shippedPlusAbandoned = data.confirmedOrders + data.abandonedOrders;
  const costPerShippedAbandonedEuro = shippedPlusAbandoned > 0 ? data.adSpendEuro / shippedPlusAbandoned : 0;
  const costPerShippedAbandonedDzd = costPerShippedAbandonedEuro * data.exchangeRate;
  const totalDelivered = data.deliveredOrders + data.deliveredAbandoned;
  const overallDeliveryRate = data.totalOrders > 0 ? (totalDelivered / data.totalOrders) * 100 : 0;
  const totalPackagingCost = data.packagingPerUnit * data.totalOrders;
  const costPerConfirmation = data.totalOrders > 0 ? data.confirmationExpenses / data.totalOrders : 0;
  const totalCostEuro = data.adSpendEuro + data.confirmationExpenses + totalPackagingCost;
  const totalCostDzd = totalCostEuro * data.exchangeRate;
  const totalCostAbandonedEuro = data.totalOrders > 0 ? totalCostEuro / data.totalOrders : 0;
  const totalCostAbandonedDzd = totalCostAbandonedEuro * data.exchangeRate;
  const netProfitPerUnit = data.sellingPrice - data.productPurchasePrice;
  const netProfitDelivered = data.deliveredOrders * netProfitPerUnit;
  const profitAbandoned = data.deliveredAbandoned * netProfitPerUnit;
  const totalProfit = netProfitDelivered + profitAbandoned;
  const dailyAverageProfit = totalProfit / 7;
  const dailyAverageAbandonedProfit = profitAbandoned / 7;
  const dailyTotalAverageProfit = totalProfit / 7;
  const dailyOrdersDelivered = totalDelivered / 7;

  return {
    confirmationRate,
    confirmationRateTotal,
    totalOrdersCalc: data.totalOrders,
    adSpendDzd,
    costPerOrderEuro,
    costPerOrderDzd,
    costPerOrderAbandonedEuro,
    costPerOrderAbandonedDzd,
    costPerShippedEuro,
    costPerShippedDzd,
    costPerShippedAbandonedEuro,
    costPerShippedAbandonedDzd,
    totalDelivered,
    overallDeliveryRate,
    totalPackagingCost,
    costPerConfirmation,
    totalCostEuro,
    totalCostDzd,
    totalCostAbandonedEuro,
    totalCostAbandonedDzd,
    netProfitPerUnit,
    netProfitDelivered,
    profitAbandoned,
    totalProfit,
    dailyAverageProfit,
    dailyAverageAbandonedProfit,
    dailyTotalAverageProfit,
    dailyOrdersDelivered,
  };
}

function formatEuro(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

function formatDzd(amount: number): string {
  return `${amount.toLocaleString("ar-DZ")} دج`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function WeeklyAccountsPage() {
  const [accounts, setAccounts] = useState<WeeklyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [form, setForm] = useState<Partial<WeeklyAccount>>({
    title: "",
    weekStart: "",
    weekEnd: "",
    totalOrders: 0,
    confirmedOrders: 0,
    adSpendEuro: 0,
    exchangeRate: 0,
    deliveredOrders: 0,
    deliveredAbandoned: 0,
    deliveryRate: 0,
    abandonedDeliveryRate: 0,
    confirmationExpenses: 0,
    packagingPerUnit: 0,
    productPurchasePrice: 0,
    sellingPrice: 0,
  });

  const productDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAccounts();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!showProductDropdown) setProductSearch("");
  }, [showProductDropdown]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    if (showProductDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProductDropdown]);

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/weekly-accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products?limit=500");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products || [];
      setProducts(list.map((p: any) => ({ id: p.id, name: p.name })));
    } catch (error) {
      console.error("Failed to fetch products");
    }
  }

  async function fetchStats() {
    const { weekStart, weekEnd } = form;
    if (!weekStart || !weekEnd) return;

    setFetchingStats(true);
    try {
      const params = new URLSearchParams({ dateFrom: weekStart, dateTo: weekEnd });
      const selectedProduct = (form as any).productId;
      if (selectedProduct) params.set("productId", selectedProduct);

      const res = await fetch(`/api/weekly-accounts/stats?${params}`);
      const data = await res.json();

      if (data.totalOrders !== undefined) {
        setForm((prev) => ({
          ...prev,
          totalOrders: data.totalOrders,
          confirmedOrders: data.confirmedOrders,
          abandonedOrders: data.confirmedAbandoned || 0,
          deliveredOrders: data.deliveredConfirmed || 0,
          deliveredAbandoned: data.deliveredAbandoned || 0,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch stats");
    } finally {
      setFetchingStats(false);
    }
  }

  function handleNew() {
    setForm({
      title: "",
      weekStart: "",
      weekEnd: "",
      totalOrders: 0,
      confirmedOrders: 0,
      adSpendEuro: 0,
      exchangeRate: 0,
      deliveredOrders: 0,
      deliveredAbandoned: 0,
      deliveryRate: 0,
      abandonedDeliveryRate: 0,
      confirmationExpenses: 0,
      packagingPerUnit: 0,
      productPurchasePrice: 0,
      sellingPrice: 0,
    });
    setEditingId(null);
    setShowForm(true);
  }

  function handleEdit(account: WeeklyAccount) {
    setForm(account);
    setEditingId(account.id);
    setShowForm(true);
  }

  async function handleSave() {
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/weekly-accounts/${editingId}` : "/api/weekly-accounts";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      fetchAccounts();
    } catch (error) {
      console.error("Failed to save account");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الأسبوع؟")) return;
    try {
      await fetch(`/api/weekly-accounts/${id}`, { method: "DELETE" });
      fetchAccounts();
    } catch (error) {
      console.error("Failed to delete account");
    }
  }

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleCardExpanded(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredProducts = products.filter((p) =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedProductName = products.find((p) => p.id === (form as any).productId)?.name || "";

  const calc = form.totalOrders ? calculate(form as WeeklyAccount) : null;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-lg sm:text-xl font-black">الحسابات اليدوية</h1>
            </div>
            <Button onClick={handleNew} className="h-9 rounded-xl font-bold px-3 gap-1.5 text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">أسبوع جديد</span>
              <span className="sm:hidden">جديد</span>
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {showForm && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="px-4 py-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{editingId ? "تعديل الأسبوع" : "أسبوع جديد"}</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-8 w-8 p-0">✕</Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">

                {/* Time Filter & Product Selector */}
                <div className="bg-primary/5 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-primary">
                    <Calendar className="h-4 w-4" />
                    فلتر الوقت والمنتج
                  </h3>

                  {/* Date Range */}
                  <DateRangePicker
                    from={form.weekStart || ""}
                    to={form.weekEnd || ""}
                    onChange={(from, to) => setForm((prev) => ({ ...prev, weekStart: from, weekEnd: to }))}
                  />

                  {/* Product Selector */}
                  <div className="relative" ref={productDropdownRef}>
                    <label className="block text-[11px] font-bold mb-1 text-muted-foreground">المنتج (اختياري)</label>
                    <button
                      type="button"
                      onClick={() => setShowProductDropdown(!showProductDropdown)}
                      className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-bold w-full flex items-center justify-between"
                    >
                      <span className={selectedProductName ? "" : "text-muted-foreground"}>
                        {selectedProductName || "جميع المنتجات"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    {showProductDropdown && (
                      <div className="absolute top-full start-0 end-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-56 flex flex-col">
                        <div className="p-2 border-b border-border">
                          <div className="relative">
                            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="بحث عن منتج..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="h-8 w-full pe-8 ps-2 rounded-lg border border-border bg-background text-xs"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, productId: undefined } as any));
                              setShowProductDropdown(false);
                              setProductSearch("");
                            }}
                            className="w-full text-right px-3 py-2.5 text-xs hover:bg-muted/50 transition-colors font-bold border-b border-border/50"
                          >
                            جميع المنتجات
                          </button>
                          {filteredProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({ ...prev, productId: p.id } as any));
                                setShowProductDropdown(false);
                                setProductSearch("");
                              }}
                              className={`w-full text-right px-3 py-2.5 text-xs hover:bg-muted/50 transition-colors ${
                                (form as any).productId === p.id ? "bg-primary/10 text-primary font-bold" : ""
                              }`}
                            >
                              {p.name}
                            </button>
                          ))}
                          {filteredProducts.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-muted-foreground">لا توجد نتائج</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={fetchStats}
                    disabled={!form.weekStart || !form.weekEnd || fetchingStats}
                    className="h-9 rounded-xl font-bold px-4 gap-2 text-xs"
                  >
                    {fetchingStats ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    جلب البيانات تلقائيًا
                  </Button>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-muted-foreground">عنوان الأسبوع</label>
                  <Input
                    placeholder="مثال: الأسبوع الأول : 10-16"
                    value={form.title || ""}
                    onChange={(e) => updateField("title", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Section 1: Orders */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    1. الطلبات والتأكيد
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">طلبات (إجمالي)</label>
                      <Input
                        type="number"
                        value={form.totalOrders || ""}
                        onChange={(e) => updateField("totalOrders", parseInt(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-blue-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">مؤكد</label>
                      <Input
                        type="number"
                        value={form.confirmedOrders || ""}
                        onChange={(e) => updateField("confirmedOrders", parseInt(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-green-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">متروكة مؤكدة</label>
                      <Input
                        type="number"
                        value={form.abandonedOrders || ""}
                        onChange={(e) => updateField("abandonedOrders", parseInt(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-red-300"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">متروكة = طلبات مؤكدة ثم تم إلغاؤها (تلقائي من النظام)</p>
                  {calc && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">نسبة تأكيد الطلبات</span>
                        <p className="text-sm font-bold text-green-600">{formatPercent(calc.confirmationRate)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">نسبة تأكيد الإجمالي</span>
                        <p className="text-sm font-bold text-green-600">{formatPercent(calc.confirmationRateTotal)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Ad Spend */}
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    2. الإنفاق والإعلانات
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">الإنفاق (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.adSpendEuro || ""}
                        onChange={(e) => updateField("adSpendEuro", parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">سعر صرف 1€</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.exchangeRate || ""}
                        onChange={(e) => updateField("exchangeRate", parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-purple-300"
                      />
                    </div>
                  </div>
                  {calc && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                      <span className="text-[10px] text-muted-foreground">إجمالي الإنفاق بالدينار</span>
                      <p className="text-sm font-bold text-purple-600">{formatDzd(calc.adSpendDzd)}</p>
                    </div>
                  )}
                </div>

                {/* Section 3: Order Costs */}
                {calc && (
                  <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-orange-600" />
                      3. تكلفة الطلبات
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">مبيعة</span>
                        <p className="text-xs font-bold">{formatEuro(calc.costPerOrderEuro)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDzd(calc.costPerOrderDzd)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">مبيعة + متروكة</span>
                        <p className="text-xs font-bold">{formatEuro(calc.costPerOrderAbandonedEuro)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDzd(calc.costPerOrderAbandonedDzd)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">مبيعة مشحونة</span>
                        <p className="text-xs font-bold">{formatEuro(calc.costPerShippedEuro)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDzd(calc.costPerShippedDzd)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">مبيعة مشحونة + متروكة</span>
                        <p className="text-xs font-bold">{formatEuro(calc.costPerShippedAbandonedEuro)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDzd(calc.costPerShippedAbandonedDzd)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: Delivery */}
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600" />
                    4. التسليم
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">مسلم</label>
                      <Input
                        type="number"
                        value={form.deliveredOrders || ""}
                        onChange={(e) => updateField("deliveredOrders", parseInt(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">مسلم متروك</label>
                      <Input
                        type="number"
                        value={form.deliveredAbandoned || ""}
                        onChange={(e) => updateField("deliveredAbandoned", parseInt(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-emerald-300"
                      />
                    </div>
                  </div>
                  {calc && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">الإجمالي المسلم</span>
                        <p className="text-sm font-bold text-emerald-600">{calc.totalDelivered}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">نسبة التسليم</span>
                        <p className="text-sm font-bold text-emerald-600">{formatPercent(calc.overallDeliveryRate)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 5: Additional Costs */}
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    5. التكاليف الإضافية
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">مصاريف التأكيد (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.confirmationExpenses || ""}
                        onChange={(e) => updateField("confirmationExpenses", parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-red-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">تغليف/قطعة (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.packagingPerUnit || ""}
                        onChange={(e) => updateField("packagingPerUnit", parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-red-300"
                      />
                    </div>
                  </div>
                  {calc && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">التغليف</span>
                        <p className="text-xs font-bold text-red-600">{formatEuro(calc.totalPackagingCost)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">التأكيد/قطعة</span>
                        <p className="text-xs font-bold text-red-600">{formatEuro(calc.costPerConfirmation)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">النهائي</span>
                        <p className="text-xs font-bold text-red-600">{formatEuro(calc.totalCostEuro)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDzd(calc.totalCostDzd)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 6: Profit */}
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    6. الأرباح
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">شراء المنتج (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.productPurchasePrice || ""}
                        onChange={(e) => updateField("productPurchasePrice", parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-green-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-muted-foreground">البيع (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.sellingPrice || ""}
                        onChange={(e) => updateField("sellingPrice", parseFloat(e.target.value) || 0)}
                        className="h-9 text-xs bg-white dark:bg-gray-800 border-2 border-green-300"
                      />
                    </div>
                  </div>
                  {calc && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">ربح/قطعة</span>
                        <p className="text-xs font-bold text-green-600">{formatEuro(calc.netProfitPerUnit)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">صافي مسلم</span>
                        <p className="text-xs font-bold text-green-600">{formatEuro(calc.netProfitDelivered)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">ربح متروكة</span>
                        <p className="text-xs font-bold text-green-600">{formatEuro(calc.profitAbandoned)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-green-500">
                        <span className="text-[10px] text-muted-foreground">إجمالي الربح</span>
                        <p className="text-sm font-bold text-green-600">{formatEuro(calc.totalProfit)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 7: Averages */}
                {calc && (
                  <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-cyan-600" />
                      7. المتوسطات (أسبوعي)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">ربح يومي</span>
                        <p className="text-xs font-bold text-cyan-600">{formatEuro(calc.dailyAverageProfit)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">ربح متروكة يومي</span>
                        <p className="text-xs font-bold text-cyan-600">{formatEuro(calc.dailyAverageAbandonedProfit)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">ربح إجمالي يومي</span>
                        <p className="text-xs font-bold text-cyan-600">{formatEuro(calc.dailyTotalAverageProfit)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
                        <span className="text-[10px] text-muted-foreground">مسلم/يوم</span>
                        <p className="text-xs font-bold text-cyan-600">{calc.dailyOrdersDelivered.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowForm(false)} className="h-9 rounded-xl text-xs font-bold px-4">إلغاء</Button>
                  <Button onClick={handleSave} className="h-9 rounded-xl text-xs font-bold px-4">{editingId ? "حفظ" : "إنشاء"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3 animate-spin" />
            </div>
          ) : accounts.length === 0 && !showForm ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                <h3 className="text-sm font-bold mb-1">لا توجد حسابات بعد</h3>
                <p className="text-xs text-muted-foreground mb-3">ابدأ بإدخال بيانات الأسبوع الأول</p>
                <Button onClick={handleNew} className="h-9 rounded-xl font-bold px-4 gap-2 text-xs mx-auto">
                  <Plus className="h-4 w-4" />
                  أسبوع جديد
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const c = calculate(account);
                const isExpanded = expandedCards.has(account.id);
                return (
                  <Card key={account.id} className="overflow-hidden">
                    <button
                      onClick={() => toggleCardExpanded(account.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-green-600">{formatEuro(c.totalProfit)}</span>
                        </div>
                        <div className="text-right min-w-0">
                          <p className="text-sm font-bold truncate">{account.title}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {account.weekStart} → {account.weekEnd}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex gap-1">
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded font-bold">{account.totalOrders}</span>
                          <span className="text-[10px] bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded font-bold text-green-600">{account.confirmedOrders}</span>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded font-bold text-emerald-600">{c.totalDelivered}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-4 py-3 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">الطلبات</p>
                            <p className="text-sm font-bold">{account.totalOrders}</p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">مؤكد</p>
                            <p className="text-sm font-bold text-green-600">{account.confirmedOrders}</p>
                            <p className="text-[10px] text-green-600">{formatPercent(c.confirmationRate)}</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">متروكة مؤكدة</p>
                            <p className="text-sm font-bold text-red-600">{account.abandonedOrders}</p>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">الإنفاق</p>
                            <p className="text-sm font-bold text-purple-600">{formatEuro(account.adSpendEuro)}</p>
                            <p className="text-[10px] text-purple-600">{formatDzd(c.adSpendDzd)}</p>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">مسلم</p>
                            <p className="text-sm font-bold text-emerald-600">{c.totalDelivered}</p>
                            <p className="text-[10px] text-emerald-600">{formatPercent(c.overallDeliveryRate)}</p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2 text-center border-2 border-green-500">
                            <p className="text-[10px] text-muted-foreground">الربح</p>
                            <p className="text-sm font-bold text-green-600">{formatEuro(c.totalProfit)}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(account)} className="h-8 rounded-lg text-xs font-bold px-3">
                            <Edit className="h-3 w-3 ml-1" />
                            تعديل
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(account.id)} className="h-8 rounded-lg text-xs font-bold px-3 text-red-600 hover:text-red-700">
                            <Trash2 className="h-3 w-3 ml-1" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
