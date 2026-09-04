"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge, STATUS_CONFIG, type StatusKey } from "./status-badge";
import { OrderWithRelations } from "@/types";
import {
  X,
  Phone,
  MapPin,
  Package,
  Clock,
  User,
  Copy,
  Check,
  Truck,
  Store,
  ShoppingBag,
  Send,
  MessageSquareText,
  Loader2,
  Pencil,
} from "lucide-react";

interface OrderDetailsSheetProps {
  order: OrderWithRelations | null;
  open: boolean;
  onClose: () => void;
}

interface LiveRemark {
  text: string;
  station: string;
  livreur: string;
  date: string;
}

export function OrderDetailsSheet({ order, open, onClose }: OrderDetailsSheetProps) {
  const [copied, setCopied] = useState(false);
  const [liveRemarks, setLiveRemarks] = useState<LiveRemark[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    if (!open || !order?.deliveryReference) {
      setLiveRemarks([]);
      return;
    }

    const hasStoredRemarks = (order.statusHistory || []).some(
      (h) => h.changedBy === "delivery_company" && h.note?.startsWith("DHD_REMARK:")
    );

    if (hasStoredRemarks) {
      setLiveRemarks([]);
      return;
    }

    setLoadingRemarks(true);
    fetch(`/api/delivery/remarks?tracking=${encodeURIComponent(order.deliveryReference)}`)
      .then((r) => r.json())
      .then((data) => setLiveRemarks(data.remarks || []))
      .catch(() => setLiveRemarks([]))
      .finally(() => setLoadingRemarks(false));
  }, [open, order?.deliveryReference, order?.statusHistory]);

  if (!order || !open) return null;

  const productImage = (() => {
    try {
      const imgs = JSON.parse(order.product?.images || "[]");
      return imgs[0] || null;
    } catch {
      return null;
    }
  })();

  const copyPhone = () => {
    navigator.clipboard.writeText(order.customerPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !order.deliveryReference) return;
    setSendingMessage(true);
    try {
      const settingsRes = await fetch("/api/settings");
      const settings = await settingsRes.json();
      const apiUrl = (settings.delivery_api_url || "").replace(/\/$/, "");
      const apiToken = settings.delivery_api_token || "";
      if (!apiUrl || !apiToken) { alert("إعدادات شركة الشحن غير مكتملة"); return; }
      const sendUrl = `${apiUrl}/api/v1/add/maj?api_token=${encodeURIComponent(apiToken)}&tracking=${encodeURIComponent(order.deliveryReference)}&content=${encodeURIComponent(messageText)}`;
      const res = await fetch(sendUrl, { method: "POST", headers: { Accept: "application/json" } });
      const result = await res.json();
      if (result.success) {
        setMessageSent(true);
        setMessageText("");
        setTimeout(() => setMessageSent(false), 3000);
      } else {
        alert("فشل إرسال الرسالة");
      }
    } catch {
      alert("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setSendingMessage(false);
    }
  };

  const statusHistory = order.statusHistory || [];
  const date = new Date(order.createdAt);
  const isOffice = !!order.customerAddress;

  const historyRemarks = statusHistory.filter(
    (h) => h.changedBy === "delivery_company" && h.note?.startsWith("DHD_REMARK:")
  );

  const allRemarks = [
    ...historyRemarks.map((h) => {
      const lines = (h.note || "").split("\n");
      return { text: lines[0]?.replace("DHD_REMARK: ", "") || "", extra: lines.slice(1).join(" | ") };
    }),
    ...liveRemarks.map((r) => ({
      text: r.text,
      extra: [r.station && `المحطة: ${r.station}`, r.livreur && `السائق: ${r.livreur}`, r.date && `التاريخ: ${r.date}`].filter(Boolean).join(" | "),
    })),
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-card rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="text-lg font-bold">تفاصيل الطلب</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.orderNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-70px)] px-5 py-4 space-y-4">

            {/* Product(s) */}
            {order.orderItems && order.orderItems.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground">المنتجات ({order.orderItems.length})</p>
                {order.orderItems.map((item: any) => {
                  const itemImg = (() => { try { const imgs = JSON.parse(item.product?.images || "[]"); return imgs[0] || null; } catch { return null; } })();
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-xl">
                      {itemImg ? (
                        <img src={itemImg} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-border flex-shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center ring-1 ring-border flex-shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.product?.name}{item.color?.name ? ` (${item.color.name})` : ""}{item.size?.name ? ` [${item.size.name}]` : ""}</p>
                        <p className="text-[10px] text-muted-foreground">{item.quantity} × {item.productPrice.toLocaleString()} دج</p>
                      </div>
                      <span className="text-xs font-bold">{(item.productPrice * item.quantity).toLocaleString()} دج</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                {productImage ? (
                  <img src={productImage} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border flex-shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center ring-1 ring-border flex-shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{order.product?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.quantity} × {order.productPrice.toLocaleString()} دج</p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-black text-primary">{order.totalPrice.toLocaleString()} دج</p>
                  <p className="text-[10px] text-muted-foreground">شحن: {order.shippingPrice.toLocaleString()} دج</p>
                </div>
              </div>
            )}

            {/* Customer Info Card */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold">معلومات العميل</span>
              </div>
              <div className="p-3 space-y-2.5">
                {/* Name */}
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold">{order.customerName}</span>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <a href={`tel:${order.customerPhone}`} className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline" dir="ltr">
                    {order.customerPhone}
                  </a>
                  <button onClick={copyPhone} className="p-1 rounded-md hover:bg-muted transition-colors mr-auto">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>

                {/* Address */}
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{order.wilaya?.name || (order as any).wilayaName || ""}{order.customerAddress ? ` · ${order.customerAddress}` : order.baladya?.name ? `, ${order.baladya.name}` : (order as any).baladyaName ? `, ${(order as any).baladyaName}` : ""}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isOffice ? "توصيل للمكتب" : "توصيل للمنزل"} — {order.shippingPrice.toLocaleString()} دج
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
              {order.orderItems && order.orderItems.length > 0 ? (
                order.orderItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> {item.product?.name} ({item.quantity}×)</span>
                    <span className="font-semibold">{(item.productPrice * item.quantity).toLocaleString()} دج</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> المنتج ({order.quantity}×)</span>
                  <span className="font-semibold">{(order.productPrice * order.quantity).toLocaleString()} دج</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  {isOffice ? <Store className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                  الشحن ({isOffice ? "مكتب" : "منزل"})
                </span>
                <span className="font-semibold">{order.shippingPrice.toLocaleString()} دج</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between font-bold">
                <span>المجموع</span>
                <span className="text-primary text-lg">{order.totalPrice.toLocaleString()} دج</span>
              </div>
            </div>

            {/* Status + Date */}
            <div className="flex items-center justify-between">
              <StatusBadge status={order.status as StatusKey} size="md" />
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{date.toLocaleDateString("ar-DZ")} {date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {/* Delivery Reference */}
            {order.deliveryReference && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">رقم تتبع شركة التوصيل</p>
                  <p className="text-sm font-mono font-bold text-blue-700 dark:text-blue-300">{order.deliveryReference}</p>
                </div>
              </div>
            )}

            {/* Delivery Remarks from Shipping Company */}
            {(allRemarks.length > 0 || loadingRemarks) && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquareText className="h-3.5 w-3.5" /> ملاحظات من شركة الشحن {loadingRemarks && <Loader2 className="h-3 w-3 animate-spin" />}
                </h4>
                {loadingRemarks ? (
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 text-center border border-amber-200 dark:border-amber-800/30">
                    <Loader2 className="h-5 w-5 mx-auto text-amber-500 animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground">جاري تحميل الملاحظات...</p>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 space-y-2 border border-amber-200 dark:border-amber-800/30">
                    {allRemarks.map((remark, i) => (
                      <div key={i} className="bg-card rounded-lg p-2.5 border border-border/50">
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{remark.text}</p>
                        {remark.extra && (
                          <p className="text-[10px] text-muted-foreground mt-1">{remark.extra}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Manual message to delivery company */}
                {order.deliveryReference && (
                  <div className="space-y-2">
                    {messageSent && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800/30">
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5" /> تم إرسال الرسالة
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="اكتب رسالة مخصصة..."
                        className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        onKeyDown={(e) => { if (e.key === "Enter" && messageText.trim() && !sendingMessage) handleSendMessage(); }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendingMessage}
                        className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        إرسال
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full Status History */}
            {(() => {
              const filteredHistory = statusHistory.filter(
                (h) => h.changedBy !== "delivery_company" && !h.note?.startsWith("DHD_REMARK:")
              );
              if (filteredHistory.length === 0) return null;

              const sorted = [...filteredHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

              return (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> سجل التغييرات ({sorted.length})
                  </h4>
                  <div className="bg-muted/30 rounded-xl p-3 space-y-0">
                    {sorted.map((history, index) => {
                      const hConfig = STATUS_CONFIG[history.newStatus as StatusKey];
                      const hDate = new Date(history.createdAt);
                      const isLast = index === sorted.length - 1;
                      const isFirst = index === 0;
                      return (
                        <div key={history.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 mt-0.5",
                              isFirst ? "border-primary bg-primary" : "border-border bg-background"
                            )} />
                            {!isLast && <div className="w-0.5 flex-1 bg-border/50 min-h-[20px]" />}
                          </div>
                          <div className={cn("pb-3 flex-1", isLast && "pb-0")}>
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-sm font-bold", hConfig?.color || "text-foreground")}>
                                {hConfig?.label || history.newStatus}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {hDate.toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — {hDate.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {history.note && (
                              <p className="text-xs text-muted-foreground mt-1 bg-background rounded-lg px-2 py-1 border border-border">{history.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="pb-2" />
          </div>
        </div>
      </div>
    </>
  );
}
