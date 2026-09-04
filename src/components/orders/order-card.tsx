"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge, STATUS_CONFIG, type StatusKey } from "./status-badge";
import { OrderWithRelations } from "@/types";
import { WILAYAS_DATA } from "@/lib/constants";
import {
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  MapPin,
  Package,
  Truck,
  Store,
  X,
  Check,
  Send,
  Loader2,
  MessageSquareText,
  RotateCcw,
  AlertTriangle,
  Copy,
} from "lucide-react";

// Manual statuses
const MANUAL_STATUSES: StatusKey[] = [
  "NEW", "CONFIRMED", "NOT_ANSWERED_1", "NOT_ANSWERED_2", "NOT_ANSWERED_3",
  "PHONE_CLOSED_1", "PHONE_CLOSED_2", "PHONE_CLOSED_3",
  "OUT_OF_COVERAGE_1", "OUT_OF_COVERAGE_2", "OUT_OF_COVERAGE_3",
  "CANCELLED", "FAKE", "POSTPONED", "WAITING_CALLBACK",
];

// System statuses - updated by delivery sync only
const SYSTEM_STATUSES: StatusKey[] = [
  "SHIPPED", "IN_DELIVERY", "ON_HOLD", "DELIVERED",
  "READY_FOR_PAYMENT", "PAID", "CUSTOMER_REORDERED",
  "RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED",
];

const SEQUENTIAL_GROUPS: StatusKey[][] = [
  ["NOT_ANSWERED_1", "NOT_ANSWERED_2", "NOT_ANSWERED_3"],
  ["PHONE_CLOSED_1", "PHONE_CLOSED_2", "PHONE_CLOSED_3"],
  ["OUT_OF_COVERAGE_1", "OUT_OF_COVERAGE_2", "OUT_OF_COVERAGE_3"],
];

const NON_SEQUENTIAL_STATUSES: StatusKey[] = [
  "NEW", "CONFIRMED", "CANCELLED", "FAKE", "POSTPONED", "WAITING_CALLBACK",
];

function getAvailableStatuses(currentStatus: StatusKey): StatusKey[] {
  if (SYSTEM_STATUSES.includes(currentStatus)) return [];

  const result: StatusKey[] = [];

  for (const group of SEQUENTIAL_GROUPS) {
    const idx = group.indexOf(currentStatus);
    if (idx >= 0) {
      if (idx < group.length - 1) result.push(group[idx + 1]);
    } else {
      result.push(group[0]);
    }
  }

  for (const s of NON_SEQUENTIAL_STATUSES) {
    if (s !== currentStatus) result.push(s);
  }

  return result;
}

interface OrderCardProps {
  order: OrderWithRelations;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: StatusKey) => void;
  onReturnToConfirmed?: () => void;
  phoneWarning?: ("return" | "duplicate")[];
}

export function OrderCard({ order, onView, onEdit, onDelete, onStatusChange, onReturnToConfirmed, phoneWarning }: OrderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const productImage = (() => {
    try {
      const imgs = JSON.parse(order.product?.images || "[]");
      return imgs[0] || null;
    } catch {
      return null;
    }
  })();

  const productImages = (() => {
    if (order.orderItems && order.orderItems.length > 1) {
      return order.orderItems.map((item: any) => {
        try {
          const imgs = JSON.parse(item.product?.images || "[]");
          return imgs[0] || null;
        } catch {
          return null;
        }
      }).filter(Boolean);
    }
    return [];
  })();

  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("ar-DZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const timeStr = date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });

  const isOffice = !!order.customerAddress || (order as any).deliveryMethod === "office";

  const availableStatuses = useMemo(
    () => getAvailableStatuses(order.status as StatusKey),
    [order.status]
  );

  const canSendToDelivery = !order.deliveryReference && ["NEW", "CONFIRMED", "WAITING_CALLBACK"].includes(order.status);

  const handleSendToDelivery = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm("هل تريد إرسال هذا الطلب لشركة التوصيل؟")) return;
    setSending(true);
    try {
      const res = await fetch("/api/delivery/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`تم الإرسال بنجاح - رقم التتبع: ${data.tracking}`);
        window.location.reload();
      } else {
        alert(data.error || "حدث خطأ أثناء الإرسال");
      }
    } catch {
      alert("حدث خطأ أثناء الإرسال");
    } finally {
      setSending(false);
    }
  };

  const showWarningBadge = phoneWarning && phoneWarning.length > 0;
  const isReturnRisk = phoneWarning?.includes("return");
  const isDuplicate = phoneWarning?.includes("duplicate");
  const isDeliveryStatus = ["SHIPPED", "IN_DELIVERY", "ON_HOLD"].includes(order.status);
  const isReturnStatus = ["RETURN_TRANSFER", "RETURN_READY"].includes(order.status);
  const isManualStatus = !isDeliveryStatus && !isReturnStatus;

  const warningInfo = (() => {
    if (!showWarningBadge || !isManualStatus) return null;
    const labels: string[] = [];
    let color = "";
    let bg = "";
    if (isDuplicate) { labels.push("طلب مكرر"); color = "text-purple-700 dark:text-purple-300"; bg = "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/30"; }
    if (isReturnRisk) { labels.push("خطر ارجاع"); color = "text-red-700 dark:text-red-300"; bg = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"; }
    if (isDuplicate && isReturnRisk) { color = "text-red-700 dark:text-red-300"; bg = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"; }
    return { color, bg, label: labels.join(" + ") };
  })();

  const latestRemark = (() => {
    if (!isDeliveryStatus) return null;
    const history = order.statusHistory || [];
    const remarks = history
      .filter((h) => h.changedBy === "delivery_company" && h.note?.startsWith("DHD_REMARK:"))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (remarks.length === 0) return null;
    const text = (remarks[0].note || "").split("\n")[0].replace("DHD_REMARK: ", "").trim();
    return text || null;
  })();

  const returnStatusInfo = (() => {
    if (!isReturnStatus) return null;
    const history = order.statusHistory || [];
    const statusChanges = history
      .filter((h) => h.newStatus === order.status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastChange = statusChanges[0];
    if (!lastChange) return null;

    const now = new Date();
    const changed = new Date(lastChange.createdAt);
    const diffMs = now.getTime() - changed.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const labels: Record<string, string> = {
      RETURN_TRANSFER: "مرجع قيد تحويل",
      RETURN_READY: "مرجع جاهز للاستلام",
    };

    let color: string;
    let bg: string;
    if (days < 7) {
      color = "text-emerald-700 dark:text-emerald-300";
      bg = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30";
    } else if (days <= 13) {
      color = "text-orange-700 dark:text-orange-300";
      bg = "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/30";
    } else {
      color = "text-red-700 dark:text-red-300";
      bg = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30";
    }

    return { label: labels[order.status] || order.status, color, bg, days };
  })();

  const showBar = latestRemark || returnStatusInfo || warningInfo;
  const activeBar = warningInfo || returnStatusInfo || null;
  const barBg = activeBar ? activeBar.bg : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30";
  const barColor = activeBar ? activeBar.color : "text-amber-700 dark:text-amber-300";
  const barLabel = activeBar ? activeBar.label : latestRemark;
  const barDays = returnStatusInfo?.days;

  return (
    <>
      {/* Status bar */}
      {showBar && (
        <div className={cn("rounded-t-2xl border border-b-0 px-3 py-1.5 flex items-center justify-center gap-1.5", barBg)}>
          {warningInfo ? (
            <AlertTriangle className={cn("h-3.5 w-3.5", barColor)} />
          ) : returnStatusInfo ? (
            <RotateCcw className={cn("h-3.5 w-3.5", barColor)} />
          ) : (
            <MessageSquareText className={cn("h-3.5 w-3.5", barColor)} />
          )}
          <span className={cn("text-xs font-bold", barColor)}>
            {barLabel}
          </span>
          {barDays !== undefined && barDays !== null && (
            <span className={cn("text-[10px]", barColor, "opacity-70")}>
              — منذ {barDays === 0 ? "أقل من يوم" : barDays === 1 ? "يوم" : `${barDays} أيام`}
            </span>
          )}
        </div>
      )}
      <div className={cn("bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all relative", showBar && "rounded-t-none")}>
        <div className="flex">
          {/* ===== RIGHT SIDE ===== */}
          <div className="flex-1 min-w-0 p-3">
            <div className="flex items-center gap-2 mb-2">
              {productImages.length >= 2 ? (
                <div className="h-10 w-10 rounded-lg ring-1 ring-border flex-shrink-0 overflow-hidden grid" style={{ gridTemplateColumns: `repeat(${Math.min(productImages.length, 3)}, 1fr)` }}>
                  {productImages.slice(0, 3).map((img: string, idx: number) => (
                    <div key={idx} className="overflow-hidden">
                      <img src={img} alt="" className="h-full w-full object-cover" style={{ minWidth: productImages.length === 2 ? '50px' : '34px' }} />
                    </div>
                  ))}
                </div>
              ) : productImage ? (
                <img src={productImage} alt={order.product?.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-border flex-shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center ring-1 ring-border flex-shrink-0">
                  <Package className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="min-w-0">
                {order.orderItems && order.orderItems.length > 1 ? (
                  <>
                    <p className="text-[10px] text-muted-foreground">{order.orderItems.length} منتجات</p>
                    <p className="text-xs font-bold truncate">{order.orderItems.map((i: any) => {
                      let name = i.product?.name || "";
                      if (i.color?.name) name += ` (${i.color.name})`;
                      if (i.size?.name) name += ` [${i.size.name}]`;
                      return name;
                    }).join(" + ")}</p>
                  </>
                ) : (
                  <p className="text-xs font-bold truncate">x{order.quantity} {order.product?.name}{(order as any).color?.name ? ` (${(order as any).color.name})` : ""}{(order as any).size?.name ? ` [${(order as any).size.name}]` : ""}</p>
                )}
              </div>
            </div>

            <p className="text-[13px] font-bold text-foreground/80 mb-1.5">{order.customerName}</p>

            {isDuplicate && !phoneRevealed ? (
              <span
                onClick={(e) => { e.stopPropagation(); setPhoneRevealed(true); }}
                className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-wide cursor-pointer blur-sm select-none block mb-1.5 leading-none"
                dir="ltr"
              >
                {order.customerPhone}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 mb-1.5">
                <a href={`tel:${order.customerPhone}`} className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-wide hover:underline leading-none" dir="ltr" onClick={(e) => e.stopPropagation()}>
                  {order.customerPhone}
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.customerPhone); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-[13px] font-medium truncate">{WILAYAS_DATA.find((w) => w.code === order.wilaya?.code)?.name || order.wilaya?.name || ""}{order.customerAddress ? ` · ${order.customerAddress}` : order.baladya?.name ? `, ${order.baladya.name}` : ""}</span>
            </div>

            <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold", isOffice ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400" : "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400")}>
              {isOffice ? <Store className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
              {isOffice ? "مكتب" : "منزل"}
            </div>
          </div>

          {/* ===== LEFT SIDE ===== */}
          <div className="flex flex-col items-end justify-between py-3 pl-3 pr-2 gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{dateStr} {timeStr}</span>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <MoreVertical className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Status Badge - clickable only for manual statuses */}
            {SYSTEM_STATUSES.includes(order.status as StatusKey) ? (
              <StatusBadge status={order.status as StatusKey} size="md" />
            ) : (
              <button onClick={() => setStatusSheetOpen(true)}>
                <StatusBadge status={order.status as StatusKey} size="md" />
              </button>
            )}

            <div className="text-left">
              <p className="text-xl font-black text-primary leading-tight">{order.totalPrice.toLocaleString()} دج</p>
              {order.orderItems && order.orderItems.length > 1 ? (
                <p className="text-[10px] text-muted-foreground mt-0.5">{order.shippingPrice.toLocaleString()} + {order.orderItems.map((i: any) => (i.productPrice * i.quantity).toLocaleString()).join(" + ")}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">{order.productPrice.toLocaleString()} + {order.shippingPrice.toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== STATUS CENTERED MODAL ===== */}
      {statusSheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={() => setStatusSheetOpen(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card rounded-3xl w-full max-w-sm max-h-[70vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">تغيير الحالة</h3>
                <button onClick={() => setStatusSheetOpen(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-70px)] px-4 py-3">
                <div className="space-y-1.5">
                  {availableStatuses.map((status) => {
                    const config = STATUS_CONFIG[status];
                    const isActive = order.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          onStatusChange(status);
                          setStatusSheetOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-150 active:scale-[0.98]",
                          isActive
                            ? `${config.bg} ${config.border} ${config.color}`
                            : "border-border hover:border-border/80 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn("h-3 w-3 rounded-full flex-shrink-0", config.dot)} />
                          <span className="text-sm font-bold">{config.label}</span>
                        </div>
                        {isActive && <Check className="h-5 w-5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MENU CENTERED MODAL ===== */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-lg font-bold">خيارات الطلب</h3>
                <button onClick={() => setMenuOpen(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-3 py-2">
                <button onClick={() => { setMenuOpen(false); onView(); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                    <Eye className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-bold">عرض التفاصيل</span>
                </button>
                {!order.deliveryReference && (
                  <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                      <Edit3 className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm font-bold">تعديل الطلب</span>
                  </button>
                )}
                {canSendToDelivery && (
                  <button onClick={handleSendToDelivery} disabled={sending} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted transition-colors disabled:opacity-50">
                    <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                      {sending ? <Loader2 className="h-4.5 w-4.5 text-green-600 dark:text-green-400 animate-spin" /> : <Send className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />}
                    </div>
                    <span className="text-sm font-bold">{sending ? "جاري الإرسال..." : "إرسال للتوصيل"}</span>
                  </button>
                )}
                {order.deliveryReference && (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-muted/30 mx-1">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Truck className="h-4.5 w-4.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium">رقم التتبع</p>
                        <p className="text-sm font-mono font-bold">{order.deliveryReference}</p>
                      </div>
                    </div>
                    {onReturnToConfirmed && (
                      <button onClick={() => { setMenuOpen(false); onReturnToConfirmed(); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors">
                        <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                          <Truck className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400 rotate-180" />
                        </div>
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">طلب ارجاع</span>
                      </button>
                    )}
                  </>
                )}
                {!order.deliveryReference && (
                  <div className="h-px bg-border my-1 mx-3" />
                )}
                {!order.deliveryReference && (
                  <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-destructive/10 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
                      <Trash2 className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">حذف الطلب</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
