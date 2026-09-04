"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Wallet, DollarSign, CheckCircle, Clock, Loader2, Package,
  TrendingUp, ChevronDown, ChevronUp, RefreshCw, Trash2,
} from "lucide-react";

interface WalletSection {
  total: number;
  count: number;
  units: number;
  products: { productName: string; units: number; total: number }[];
}

interface Batch {
  id: string;
  batchNumber: number;
  totalAmount: number;
  orderCount: number;
  productSummary: string;
  productDetails: string | null;
  paidAt: string;
  note: string | null;
}

interface WalletData {
  deliveredNotReady: WalletSection;
  paidReady: WalletSection;
  completedPaid: WalletSection;
  totalBalance: number;
}

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);

  const formatMoney = (n: number) => n.toLocaleString("ar-DZ");

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;
    setDeletingBatch(batchId);
    try {
      const res = await fetch(`/api/payment-batches?id=${batchId}`, { method: "DELETE" });
      if (res.ok) {
        setBatches((prev) => prev.filter((b) => b.id !== batchId));
        setExpandedBatch(null);
      }
    } catch {}
    setDeletingBatch(null);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, bRes] = await Promise.all([
        fetch("/api/wallet"),
        fetch("/api/payment-batches"),
      ]);
      if (wRes.ok) setWalletData(await wRes.json());
      if (bRes.ok) setBatches(await bRes.json());
    } catch {}
    setLoading(false);
  };

  const loadBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await fetch("/api/payment-batches");
      if (res.ok) setBatches(await res.json());
    } catch {}
    setBatchesLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
              <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              المحفظة
            </h1>
            <Button onClick={loadData} variant="ghost" size="sm" className="gap-1.5 text-xs font-bold">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              تحديث
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
            </div>
          ) : walletData ? (
            <>
              {/* ===== TOTAL BALANCE ===== */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 rounded-3xl p-6 text-white shadow-xl">
                <p className="text-sm opacity-80 font-bold mb-1">إجمالي الأموال</p>
                <p className="text-4xl font-black mb-3">{formatMoney(walletData.totalBalance)} دج</p>
                <div className="flex gap-3 text-xs opacity-80">
                  <span>{walletData.deliveredNotReady.count + walletData.paidReady.count} طلب</span>
                  <span>|</span>
                  <span>{walletData.deliveredNotReady.units + walletData.paidReady.units} وحدة</span>
                </div>
              </div>

              {/* ===== PAYMENT STATUS SECTIONS ===== */}
              <div className="space-y-3">
                {/* مدفوع غير جاهز */}
                <div className={cn(
                  "bg-card rounded-2xl border-2 overflow-hidden transition-all",
                  expandedSection === "delivered" ? "border-amber-400" : "border-border"
                )}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === "delivered" ? null : "delivered")}
                    className="w-full flex items-center justify-between p-4 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">مدفوع غير جاهز</p>
                        <p className="text-[11px] text-muted-foreground">تم التسليم - في انتظار التحصيل</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-black text-amber-600 dark:text-amber-400">{formatMoney(walletData.deliveredNotReady.total)} دج</p>
                      <p className="text-[10px] text-muted-foreground">{walletData.deliveredNotReady.count} طلب</p>
                    </div>
                    {expandedSection === "delivered" ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </button>

                  {expandedSection === "delivered" && walletData.deliveredNotReady.products.length > 0 && (
                    <div className="border-t border-border bg-amber-50/50 dark:bg-amber-900/5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="px-4 py-2 bg-amber-100/50 dark:bg-amber-900/10 border-b border-border">
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">تفاصيل المنتجات ({walletData.deliveredNotReady.units} وحدة)</p>
                      </div>
                      {walletData.deliveredNotReady.products.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            <div>
                              <p className="text-sm font-bold">{p.productName}</p>
                              <p className="text-[10px] text-muted-foreground">{p.units} وحدة</p>
                            </div>
                          </div>
                          <span className="text-sm font-black text-amber-600 dark:text-amber-400">{formatMoney(p.total)} دج</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {expandedSection === "delivered" && walletData.deliveredNotReady.products.length === 0 && (
                    <div className="border-t border-border p-6 text-center text-sm text-muted-foreground">
                      لا توجد طلبات في هذه الحالة
                    </div>
                  )}
                </div>

                {/* مدفوع جاهز */}
                <div className={cn(
                  "bg-card rounded-2xl border-2 overflow-hidden transition-all",
                  expandedSection === "ready" ? "border-emerald-400" : "border-border"
                )}>
                  <button
                    onClick={() => setExpandedSection(expandedSection === "ready" ? null : "ready")}
                    className="w-full flex items-center justify-between p-4 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">مدفوع جاهز</p>
                        <p className="text-[11px] text-muted-foreground">جاهز للدفع - تم التأكيد</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatMoney(walletData.paidReady.total)} دج</p>
                      <p className="text-[10px] text-muted-foreground">{walletData.paidReady.count} طلب</p>
                    </div>
                    {expandedSection === "ready" ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </button>

                  {expandedSection === "ready" && walletData.paidReady.products.length > 0 && (
                    <div className="border-t border-border bg-emerald-50/50 dark:bg-emerald-900/5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="px-4 py-2 bg-emerald-100/50 dark:bg-emerald-900/10 border-b border-border">
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">تفاصيل المنتجات ({walletData.paidReady.units} وحدة)</p>
                      </div>
                      {walletData.paidReady.products.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                            <div>
                              <p className="text-sm font-bold">{p.productName}</p>
                              <p className="text-[10px] text-muted-foreground">{p.units} وحدة</p>
                            </div>
                          </div>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatMoney(p.total)} دج</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {expandedSection === "ready" && walletData.paidReady.products.length === 0 && (
                    <div className="border-t border-border p-6 text-center text-sm text-muted-foreground">
                      لا توجد طلبات في هذه الحالة
                    </div>
                  )}
                </div>
              </div>

              {/* ===== COMPLETED PAYMENTS LOG ===== */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    سجل الدفعات المكتملة
                  </p>
                  <span className="text-xs text-muted-foreground">{batches.length} دفعة</span>
                </div>

                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {batchesLoading ? (
                    <div className="py-10 text-center"><Loader2 className="h-8 w-8 mx-auto text-muted-foreground/40 animate-spin" /></div>
                  ) : batches.length === 0 ? (
                    <div className="py-16 text-center">
                      <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-bold">لا توجد دفعات مكتملة بعد</p>
                      <p className="text-xs text-muted-foreground mt-1">عند تحديث حالة طلب إلى "مدفوع" ستظهر هنا</p>
                    </div>
                  ) : (
                    batches.map((batch) => (
                      <div key={batch.id} className="border-b border-border/50 last:border-0">
                        <button
                          onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-right hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">الدفعة رقم {batch.batchNumber}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {batch.orderCount} طلب | {new Date(batch.paidAt).toLocaleDateString("ar-DZ")} {new Date(batch.paidAt).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-base font-black text-purple-600 dark:text-purple-400">{formatMoney(batch.totalAmount)} دج</p>
                            {expandedBatch === batch.id ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
                          </div>
                        </button>

                        {expandedBatch === batch.id && (
                          <div className="px-4 pb-3 bg-purple-50/30 dark:bg-purple-900/5 animate-in fade-in duration-200">
                            <div className="rounded-xl bg-card border border-border p-3 space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">الإجمالي</span>
                                <span className="font-black text-purple-600 dark:text-purple-400">{formatMoney(batch.totalAmount)} دج</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">عدد الطلبات</span>
                                <span className="font-bold">{batch.orderCount}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">التاريخ</span>
                                <span className="font-bold">{new Date(batch.paidAt).toLocaleDateString("ar-DZ")}</span>
                              </div>
                              {/* Product Details */}
                              {batch.productDetails && (() => {
                                try {
                                  const details = JSON.parse(batch.productDetails) as { name: string; quantity: number; orderCount: number; total: number }[];
                                  return details.length > 0 && (
                                    <div>
                                      <p className="text-xs font-bold text-muted-foreground mb-2">تفاصيل المنتجات</p>
                                      <div className="space-y-1.5">
                                        {details.map((d, i) => (
                                          <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                                            <div>
                                              <p className="text-sm font-bold">{d.name}</p>
                                              <p className="text-[10px] text-muted-foreground">{d.orderCount} طلب</p>
                                            </div>
                                            <div className="text-left">
                                              <p className="text-sm font-bold">{d.quantity} وحدة</p>
                                              <p className="text-[10px] text-muted-foreground">{formatMoney(d.total)} دج</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                } catch { return null; }
                              })()}

                              <button
                                onClick={() => handleDeleteBatch(batch.id)}
                                disabled={deletingBatch === batch.id}
                                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-bold transition-colors"
                              >
                                {deletingBatch === batch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                حذف الدفعة
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
