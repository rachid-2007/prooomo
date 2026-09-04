"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Package, DollarSign, Plus, Loader2, X,
  FileText, Receipt, Pencil, Trash2, Calendar, ChevronDown, CheckCircle, Truck, BarChart3, Eye,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ProductInventory {
  id: string;
  name: string;
  price: number;
  available: number;
  newOrders: number;
  reserved: number;
  inDelivery: number;
  returning: number;
  sales: number;
  totalRevenue: number;
  totalCost: number;
  inventoryValue: number;
  purchasePrice: number;
  lowStock: boolean;
  outOfStock: boolean;
}

interface Summary {
  totalProducts: number;
  totalInventoryValue: number;
  totalInTransitValue: number;
  totalReturnValue: number;
  totalRevenue: number;
  totalCost: number;
  totalSales: number;
  lowStockCount: number;
}

interface PurchaseEntry {
  id: string;
  productId: string;
  productName: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  total: number;
  remainingQty: number;
  note: string | null;
  date: string;
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  productId: string | null;
  date: string;
  note: string | null;
  product?: { id: string; name: string } | null;
}

type Tab = "inventory" | "entries";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("inventory");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState<{ id: string; name: string }[]>([]);

  // Purchase entry modal
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ productId: "", supplier: "", quantity: "", unitPrice: "", note: "", colorId: "", sizeId: "" });
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [productColors, setProductColors] = useState<{ id: string; name: string; image: string }[]>([]);
  const [productSizes, setProductSizes] = useState<{ id: string; name: string }[]>([]);

  // Purchase entries
  const [entries, setEntries] = useState<PurchaseEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PurchaseEntry | null>(null);

  // Expenses
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "", productId: "", note: "", date: "" });
  const [savingExpense, setSavingExpense] = useState(false);
  const [expensePeriod, setExpensePeriod] = useState("all");
  const [expenseProductFilter, setExpenseProductFilter] = useState("ALL");

  // Finance
  const [financeData, setFinanceData] = useState<any>(null);
  const [financePeriod, setFinancePeriod] = useState("all");
  const [financeCustomMonth, setFinanceCustomMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [financeProductFilter, setFinanceProductFilter] = useState("ALL");

  // Wallet stats for charts
  const [walletStats, setWalletStats] = useState<any>(null);
  const [breakdownProduct, setBreakdownProduct] = useState<any>(null);

  const formatMoney = (n: number) => n.toLocaleString("ar-DZ");

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setSummary(data.summary || null);
      }
    } catch {}
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=200");
      if (res.ok) {
        const data = await res.json();
        setAllProducts(data.products || data || []);
      }
    } catch {}
  };

  const loadEntries = async () => {
    setEntriesLoading(true);
    try {
      const res = await fetch("/api/purchase-entries");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEntries(data);
        } else if (data.entries) {
          setEntries(data.entries);
        } else {
          setEntries([]);
        }
      }
    } catch { setEntries([]); }
    setEntriesLoading(false);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإدخال؟ سيتم خصم الكمية من المخزون")) return;
    const entry = entries.find((e) => e.id === id);
    const prev = entries;
    setEntries((e) => e.filter((x) => x.id !== id));
    if (entry) {
      setProducts((p) => p.map((x) => x.id === entry.productId ? { ...x, available: Math.max(0, (x.available || 0) - entry.quantity), inventoryValue: Math.max(0, (x.inventoryValue || 0) - entry.remainingQty * entry.unitPrice) } : x));
      setSummary((s) => s ? { ...s, totalInventoryValue: Math.max(0, s.totalInventoryValue - entry.remainingQty * entry.unitPrice) } : s);
    }
    try {
      const res = await fetch(`/api/purchase-entries?id=${id}`, { method: "DELETE" });
      if (!res.ok) { setEntries(prev); }
    } catch { setEntries(prev); }
  };

  const openEditEntry = (entry: PurchaseEntry) => {
    setEditingEntry(entry);
    setPurchaseForm({
      productId: entry.productId,
      supplier: entry.supplier || "",
      quantity: String(entry.quantity),
      unitPrice: String(entry.unitPrice),
      note: entry.note || "",
      colorId: (entry as any).colorId || "",
      sizeId: (entry as any).sizeId || "",
    });
    setShowPurchaseModal(true);
  };

  const handleSaveEntry = async () => {
    if (!purchaseForm.productId || !purchaseForm.quantity || !purchaseForm.unitPrice) return;
    setSavingPurchase(true);
    try {
      if (editingEntry) {
        const res = await fetch(`/api/purchase-entries/${editingEntry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: purchaseForm.productId,
            supplier: purchaseForm.supplier,
            quantity: parseInt(purchaseForm.quantity),
            unitPrice: parseInt(purchaseForm.unitPrice),
            total: parseInt(purchaseForm.quantity) * parseInt(purchaseForm.unitPrice),
            note: purchaseForm.note,
            colorId: purchaseForm.colorId || null,
            sizeId: purchaseForm.sizeId || null,
          }),
        });
        if (res.ok) {
          setShowPurchaseModal(false);
          setEditingEntry(null);
          setPurchaseForm({ productId: "", supplier: "", quantity: "", unitPrice: "", note: "", colorId: "", sizeId: "" });
          loadEntries();
          loadInventory();
        }
      } else {
        await handlePurchase();
      }
    } catch {}
    setSavingPurchase(false);
  };

  const loadExpenses = async (period?: string, productFilter?: string) => {
    setExpensesLoading(true);
    try {
      const params = new URLSearchParams({ period: period || expensePeriod });
      const pf = productFilter || expenseProductFilter;
      if (pf !== "ALL") params.set("productId", pf);
      const res = await fetch(`/api/expenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setExpensesTotal(data.total || 0);
      }
    } catch { setExpenses([]); }
    setExpensesLoading(false);
  };

  const loadFinance = async () => {
    try {
      const params = new URLSearchParams({ period: financePeriod });
      if (financePeriod === "customMonth" && financeCustomMonth) {
        params.set("customMonth", financeCustomMonth);
      }
      if (financeProductFilter !== "ALL") params.set("productId", financeProductFilter);
      const res = await fetch(`/api/finance?${params}`);
      if (res.ok) setFinanceData(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetch("/api/settings/migrate", { method: "POST" }).catch(() => {});
    loadInventory();
    loadProducts();
    loadEntries();
  }, []);

  // Fetch colors/sizes when product changes in purchase form
  useEffect(() => {
    if (!purchaseForm.productId) {
      setProductColors([]);
      setProductSizes([]);
      return;
    }
    fetch(`/api/products/${purchaseForm.productId}`)
      .then((r) => r.json())
      .then((data) => {
        setProductColors(data?.colors || []);
        setProductSizes(data?.sizes || []);
      })
      .catch(() => {
        setProductColors([]);
        setProductSizes([]);
      });
  }, [purchaseForm.productId]);

  // Purchase entry
  const handlePurchase = async () => {
    if (!purchaseForm.productId || !purchaseForm.quantity || !purchaseForm.unitPrice) return;
    const qty = parseInt(purchaseForm.quantity);
    const price = parseInt(purchaseForm.unitPrice);
    const productName = allProducts.find((p) => p.id === purchaseForm.productId)?.name || "";
    const optimisticEntry: PurchaseEntry = {
      id: `temp_${Date.now()}`,
      productId: purchaseForm.productId,
      productName,
      supplier: purchaseForm.supplier,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
      remainingQty: qty,
      note: purchaseForm.note || null,
      date: new Date().toISOString(),
    };
    setSavingPurchase(true);
    setShowPurchaseModal(false);
    setPurchaseForm({ productId: "", supplier: "", quantity: "", unitPrice: "", note: "", colorId: "", sizeId: "" });
    setEntries((prev) => [optimisticEntry, ...prev]);
    setProducts((prev) => prev.map((p) => p.id === purchaseForm.productId ? { ...p, available: (p.available || 0) + qty, inventoryValue: (p.inventoryValue || 0) + qty * price } : p));
    setSummary((prev) => prev ? { ...prev, totalInventoryValue: prev.totalInventoryValue + qty * price } : prev);
    try {
      const res = await fetch("/api/purchase-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: purchaseForm.productId,
          supplier: purchaseForm.supplier,
          quantity: qty,
          unitPrice: price,
          total: qty * price,
          note: purchaseForm.note,
          colorId: purchaseForm.colorId || null,
          sizeId: purchaseForm.sizeId || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEntries((prev) => prev.map((e) => e.id === optimisticEntry.id ? { ...e, id: data.id, reference: data.reference, date: data.date } : e));
      } else {
        setEntries((prev) => prev.filter((e) => e.id !== optimisticEntry.id));
        setProducts((prev) => prev.map((p) => p.id === purchaseForm.productId ? { ...p, available: Math.max(0, (p.available || 0) - qty), inventoryValue: Math.max(0, (p.inventoryValue || 0) - qty * price) } : p));
        setSummary((prev) => prev ? { ...prev, totalInventoryValue: Math.max(0, prev.totalInventoryValue - qty * price) } : prev);
        alert("خطأ: " + (data.error || "فشل الحفظ"));
        setShowPurchaseModal(true);
      }
    } catch (e: any) {
      setEntries((prev) => prev.filter((e) => e.id !== optimisticEntry.id));
      setProducts((prev) => prev.map((p) => p.id === purchaseForm.productId ? { ...p, available: Math.max(0, (p.available || 0) - qty), inventoryValue: Math.max(0, (p.inventoryValue || 0) - qty * price) } : p));
      setSummary((prev) => prev ? { ...prev, totalInventoryValue: Math.max(0, prev.totalInventoryValue - qty * price) } : prev);
      alert("خطأ: " + (e.message || "غير معروف"));
      setShowPurchaseModal(true);
    }
    setSavingPurchase(false);
  };

  // Expense CRUD
  const openExpenseModal = (expense?: ExpenseItem) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        description: expense.description,
        amount: String(expense.amount),
        category: expense.category || "",
        productId: expense.productId || "",
        note: expense.note || "",
        date: expense.date.split("T")[0],
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({ description: "", amount: "", category: "", productId: "", note: "", date: new Date().toISOString().split("T")[0] });
    }
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) return;
    setSavingExpense(true);
    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
      const method = editingExpense ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category || null,
          productId: expenseForm.productId || null,
          note: expenseForm.note || null,
          date: expenseForm.date || new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowExpenseModal(false);
        setEditingExpense(null);
        if (editingExpense) {
          setExpenses((prev) => prev.map((e) => (e.id === editingExpense.id ? { ...e, ...data } : e)));
        } else {
          setExpenses((prev) => [data, ...prev]);
          setExpensesTotal((prev) => prev + (data.amount || 0));
        }
      } else {
        const data = await res.json();
        alert("خطأ: " + (data.error || "فشل الحفظ"));
      }
    } catch (e: any) {
      alert("خطأ: " + (e.message || "غير معروف"));
    }
    setSavingExpense(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;
    const exp = expenses.find((e) => e.id === id);
    const prev = expenses;
    const prevTotal = expensesTotal;
    setExpenses((e) => e.filter((x) => x.id !== id));
    if (exp) setExpensesTotal((t) => t - exp.amount);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) { setExpenses(prev); setExpensesTotal(prevTotal); }
    } catch { setExpenses(prev); setExpensesTotal(prevTotal); }
  };

  const filtered = products.filter((p) => !search || p.name.includes(search));

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center mb-3">
            <h1 className="text-xl sm:text-2xl font-black">المخزون</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {[
              { key: "inventory" as const, label: "المخزون", icon: Package },
              { key: "entries" as const, label: "سجل الشراء", icon: FileText },
            ].map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" /></div>
          ) : (
            <>
              {/* ===== INVENTORY TAB ===== */}
              {activeTab === "inventory" && (
                <div className="space-y-3">
                  {/* Summary Cards */}
                  {summary && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Package className="h-4 w-4 text-blue-600" /></div>
                          <span className="text-[11px] text-muted-foreground font-bold">قيمة المخزون</span>
                        </div>
                        <p className="text-xl font-black text-blue-600">{formatMoney(summary.totalInventoryValue)} دج</p>
                      </div>
                      <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><Truck className="h-4 w-4 text-orange-600" /></div>
                          <span className="text-[11px] text-muted-foreground font-bold">توصيل + ارجاع</span>
                        </div>
                        <p className="text-xl font-black text-orange-600">{formatMoney(summary.totalInTransitValue + summary.totalReturnValue)} دج</p>
                      </div>
                    </div>
                  )}

                  <Input placeholder="بحث عن منتج..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-xl text-sm" />

                  {/* Desktop Table */}
                  <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
                    <div className="grid grid-cols-[1fr_50px_50px_50px_60px_60px_60px] gap-1 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground">
                      <span>المنتج</span><span className="text-center">طلبات</span><span className="text-center">متوفر</span><span className="text-center">محجوز</span><span className="text-center">توصيل</span><span className="text-center">ارجاع</span><span className="text-center">مبيعات</span>
                    </div>
                    <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                      {filtered.map((p) => (
                        <div key={p.id} className="grid grid-cols-[1fr_50px_50px_50px_60px_60px_60px] gap-1 px-4 py-3 border-b border-border/50 items-center text-xs hover:bg-muted/30">
                          <div className="min-w-0"><p className="font-bold truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">{formatMoney(p.price)} دج</p></div>
                          <span className="text-center font-bold text-sky-600 text-sm">{p.newOrders}</span>
                          <span className={cn("text-center font-bold text-sm", p.outOfStock ? "text-red-500" : p.lowStock ? "text-amber-500" : "text-emerald-600")}>{p.available}</span>
                          <span className="text-center font-bold text-blue-600 text-sm">{p.reserved}</span>
                          <span className="text-center font-bold text-orange-600 text-sm">{p.inDelivery}</span>
                          <span className="text-center font-bold text-yellow-600 text-sm">{p.returning}</span>
                          <span className="text-center font-bold text-emerald-600 text-sm">{p.sales}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-2">
                    {filtered.map((p) => (
                      <div key={p.id} className="bg-card rounded-xl border border-border p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div><span className="text-sm font-bold">{p.name}</span><p className="text-[10px] text-muted-foreground">{formatMoney(p.price)} دج</p></div>
                          {p.outOfStock ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">نفد</span> : p.lowStock ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-bold">منخفض</span> : null}
                        </div>
                        <div className="grid grid-cols-6 gap-1 text-center">
                          <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-1.5"><p className="text-[9px] text-sky-600 font-bold">طلبات</p><p className="text-sm font-black text-sky-700">{p.newOrders}</p></div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-1.5"><p className="text-[9px] text-emerald-600 font-bold">متوفر</p><p className="text-sm font-black text-emerald-700">{p.available}</p></div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1.5"><p className="text-[9px] text-blue-600 font-bold">محجوز</p><p className="text-sm font-black text-blue-700">{p.reserved}</p></div>
                          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-1.5"><p className="text-[9px] text-orange-600 font-bold">توصيل</p><p className="text-sm font-black text-orange-700">{p.inDelivery}</p></div>
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-1.5"><p className="text-[9px] text-yellow-600 font-bold">ارجاع</p><p className="text-sm font-black text-yellow-700">{p.returning}</p></div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-1.5"><p className="text-[9px] text-emerald-600 font-bold">مبيعات</p><p className="text-sm font-black text-emerald-700">{p.sales}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== PURCHASE ENTRIES TAB ===== */}
              {activeTab === "entries" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">سجل الشراء ({entries.length})</div>
                    <Button onClick={() => { setEditingEntry(null); setPurchaseForm({ productId: "", supplier: "", quantity: "", unitPrice: "", note: "", colorId: "", sizeId: "" }); setShowPurchaseModal(true); }} className="h-9 rounded-lg text-xs font-bold gap-1"><Plus className="h-3.5 w-3.5" />إدخال شراء</Button>
                  </div>
                  {entriesLoading ? (
                    <div className="py-10 text-center"><Loader2 className="h-8 w-8 mx-auto text-muted-foreground/40 animate-spin" /></div>
                  ) : entries.length === 0 ? (
                    <div className="py-16 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-bold">لا توجد سجلات شراء بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((e) => (
                        <div key={e.id} className="bg-card rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold">{e.productName}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditEntry(e)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-blue-500" /></button>
                              <button onClick={() => handleDeleteEntry(e.id)} className="p-1.5 rounded-lg hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 text-center">
                            <div className="bg-muted/30 rounded-lg p-1.5"><p className="text-[9px] text-muted-foreground">الكمية</p><p className="text-sm font-black">{e.quantity}</p></div>
                            <div className="bg-muted/30 rounded-lg p-1.5"><p className="text-[9px] text-muted-foreground">سعر الوحدة</p><p className="text-sm font-black">{formatMoney(e.unitPrice)}</p></div>
                            <div className="bg-muted/30 rounded-lg p-1.5"><p className="text-[9px] text-muted-foreground">المجموع</p><p className="text-sm font-black text-primary">{formatMoney(e.total)} دج</p></div>
                            <div className="bg-muted/30 rounded-lg p-1.5"><p className="text-[9px] text-muted-foreground">المتبقي</p><p className={cn("text-sm font-black", (e.remainingQty ?? 0) === 0 ? "text-red-500" : "text-emerald-600")}>{e.remainingQty ?? e.quantity}</p></div>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                            {e.supplier && <span>المورد: {e.supplier}</span>}
                            <span>{new Date(e.date).toLocaleDateString("ar-DZ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      </div>

      {/* ===== PURCHASE MODAL ===== */}
      {showPurchaseModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowPurchaseModal(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">{editingEntry ? "تعديل إدخال شراء" : "إدخال شراء جديد"}</h3>
                <button onClick={() => { setShowPurchaseModal(false); setEditingEntry(null); }} className="p-2 rounded-xl hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">المنتج</label>
                  <select value={purchaseForm.productId} onChange={(e) => setPurchaseForm((p) => ({ ...p, productId: e.target.value, colorId: "", sizeId: "" }))} className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm font-bold">
                    <option value="">اختر منتج</option>
                    {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {productColors.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">اللون</label>
                    <select value={purchaseForm.colorId} onChange={(e) => setPurchaseForm((p) => ({ ...p, colorId: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm font-bold">
                      <option value="">بدون لون</option>
                      {productColors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {productSizes.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">المقاس</label>
                    <select value={purchaseForm.sizeId} onChange={(e) => setPurchaseForm((p) => ({ ...p, sizeId: e.target.value }))} className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm font-bold">
                      <option value="">بدون مقاس</option>
                      {productSizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">المورد</label>
                  <Input placeholder="اسم المورد" value={purchaseForm.supplier} onChange={(e) => setPurchaseForm((p) => ({ ...p, supplier: e.target.value }))} className="h-10 text-sm rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-muted-foreground mb-1 block">الكمية</label><Input type="number" placeholder="0" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm((p) => ({ ...p, quantity: e.target.value }))} className="h-10 text-sm rounded-xl" /></div>
                  <div><label className="text-xs font-bold text-muted-foreground mb-1 block">سعر الوحدة (دج)</label><Input type="number" placeholder="0" value={purchaseForm.unitPrice} onChange={(e) => setPurchaseForm((p) => ({ ...p, unitPrice: e.target.value }))} className="h-10 text-sm rounded-xl" /></div>
                </div>
                {purchaseForm.quantity && purchaseForm.unitPrice && (
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground font-bold">المجموع</p>
                    <p className="text-lg font-black text-primary">{formatMoney(parseInt(purchaseForm.quantity) * parseInt(purchaseForm.unitPrice))} دج</p>
                  </div>
                )}
                <div><label className="text-xs font-bold text-muted-foreground mb-1 block">ملاحظة</label><Input placeholder="اختياري" value={purchaseForm.note} onChange={(e) => setPurchaseForm((p) => ({ ...p, note: e.target.value }))} className="h-10 text-sm rounded-xl" /></div>
                <Button onClick={handleSaveEntry} disabled={savingPurchase || !purchaseForm.productId || !purchaseForm.quantity || !purchaseForm.unitPrice} className="w-full h-12 rounded-xl font-bold">
                  {savingPurchase ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEntry ? "تحديث" : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cost Breakdown Popup */}
      {breakdownProduct && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setBreakdownProduct(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  {breakdownProduct.image ? <img src={breakdownProduct.image} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                  <h3 className="text-sm font-bold">{breakdownProduct.name}</h3>
                </div>
                <button onClick={() => setBreakdownProduct(null)} className="p-2 rounded-xl hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-xs text-muted-foreground font-bold">تفصيل متوسط التكلفة</p>
                {Object.entries(breakdownProduct.expenseBreakdown).length > 0 ? (
                  Object.entries(breakdownProduct.expenseBreakdown).map(([cat, amount]: [string, any]) => {
                    const total = breakdownProduct.expenses;
                    const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                    const perUnit = breakdownProduct.sales > 0 ? Math.round(amount / breakdownProduct.sales) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{cat}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{formatMoney(perUnit)} دج / وحدة</span>
                          <span className="font-bold">{formatMoney(amount)} دج</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">لا توجد مصروفات مسجلة</p>
                )}
                <div className="pt-2 border-t border-border flex justify-between text-sm font-bold">
                  <span>المجموع</span>
                  <span className="text-amber-600">{formatMoney(breakdownProduct.expenses)} دج ({breakdownProduct.sales > 0 ? formatMoney(Math.round(breakdownProduct.expenses / breakdownProduct.sales)) : "0"} دج / وحدة)</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
