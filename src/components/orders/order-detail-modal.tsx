"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, STATUS_CONFIG, StatusDot, StatusKey } from "./status-badge";
import { StatusDropdown } from "./status-dropdown";
import { formatDateTime } from "@/lib/utils";
import { OrderWithRelations } from "@/types";
import {
  Clock,
  User,
  Phone,
  MapPin,
  Copy,
  Edit3,
  Trash2,
  Save,
  X,
  Loader2,
  Truck,
} from "lucide-react";

interface OrderDetailModalProps {
  order: OrderWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (order: OrderWithRelations) => void;
  onDelete?: (orderId: string) => void;
}

export function OrderDetailModal({ order, open, onOpenChange, onUpdate, onDelete }: OrderDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editQuantity, setEditQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  if (!order) return null;

  const startEdit = () => {
    setEditName(order.customerName);
    setEditPhone(order.customerPhone);
    setEditQuantity(order.quantity);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: editName,
          customerPhone: editPhone,
          quantity: editQuantity,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate?.(updated);
        setEditing(false);
      }
    } catch (err) {
      console.error("Failed to update order:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: StatusKey) => {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate?.(updated);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(order.id);
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Failed to delete order:", err);
    }
  };

  const copyPhone = () => {
    navigator.clipboard.writeText(order.customerPhone);
  };

  const totalPrice = order.productPrice * editQuantity + order.shippingPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 mx-2 md:mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <StatusDot status={order.status as any} size="lg" />
            <div>
              <DialogTitle className="text-lg">{order.orderNumber}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusDropdown
              currentStatus={order.status as StatusKey}
              onStatusChange={handleStatusChange}
            />
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Customer Info Card */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                {editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">اسم العميل</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">رقم الهاتف</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        dir="ltr"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">الكمية</label>
                      <Input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                        min={1}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">الإجمالي</label>
                      <div className="h-10 flex items-center px-3 rounded-md border bg-muted font-bold">
                        {totalPrice.toLocaleString()} دج
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground font-mono" dir="ltr">{order.customerPhone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{order.wilaya?.name} {order.customerAddress ? `· ${order.customerAddress}` : order.baladya ? `· ${order.baladya.name}` : ""}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!editing && !order.deliveryReference && (
                  <>
                    <Button variant="outline" size="sm" onClick={copyPhone}>
                      <Copy className="h-3.5 w-3.5 ml-1" />
                      نسخ
                    </Button>
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      <Edit3 className="h-3.5 w-3.5 ml-1" />
                      تعديل
                    </Button>
                  </>
                )}
                {!editing && order.deliveryReference && (
                  <Button variant="outline" size="sm" onClick={copyPhone}>
                    <Copy className="h-3.5 w-3.5 ml-1" />
                    نسخ
                  </Button>
                )}
                {editing && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      <X className="h-3.5 w-3.5 ml-1" />
                      إلغاء
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 ml-1" />
                      )}
                      حفظ
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Product & Price */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-4 rounded-xl border">
            <img
              src={(() => { try { const imgs = JSON.parse(order.product?.images || '[]'); return imgs[0] || '/placeholder.svg'; } catch { return '/placeholder.svg'; } })()}
              alt={order.product?.name}
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
            />
            <div className="flex-1">
              <p className="font-semibold">{order.product?.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {editing ? `الكمية: ${editQuantity}` : `الكمية: ${order.quantity}`}
              </p>
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold">
                {(editing ? totalPrice : order.totalPrice).toLocaleString()} دج
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>{order.productPrice.toLocaleString()} منتج</span>
                <span>+</span>
                <span>{order.shippingPrice.toLocaleString()} شحن</span>
              </div>
            </div>
          </div>

          {/* Status History Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              سجل الحالات
            </h4>
            <div className="relative">
              <div className="absolute right-[15px] top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {[...order.statusHistory].reverse().map((history, index) => {
                  const isFirst = index === 0;
                  return (
                    <div key={history.id} className="relative flex items-start gap-4">
                      <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center ${
                        isFirst ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {isFirst ? (
                          <StatusDot status={history.newStatus as any} size="sm" />
                        ) : (
                          <span className="text-xs font-bold">{index}</span>
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={history.newStatus as any} size="sm" />
                          {isFirst && (
                            <Badge variant="outline" className="text-[10px]">الحالية</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(history.createdAt)}
                        </p>
                        {history.note && (
                          <p className="text-xs text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded">
                            {history.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delete / Return Button */}
          <div className="pt-4 border-t">
            {order.deliveryReference ? (
              <Button
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                onClick={async () => {
                  if (!confirm("هل تريد إرجاع هذا الطلب لحالة تم التأكيد؟ سيُحذف رقم التتبع")) return;
                  try {
                    const res = await fetch(`/api/orders/${order.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "CONFIRMED", deliveryReference: null }),
                    });
                    if (res.ok) {
                      const updated = await res.json();
                      onUpdate?.(updated);
                    }
                  } catch (err) {
                    console.error("Failed to return order:", err);
                  }
                }}
              >
                <Truck className="h-4 w-4 ml-2 rotate-180" />
                طلب ارجاع
              </Button>
            ) : (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 ml-2" />
                حذف الطلب
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
