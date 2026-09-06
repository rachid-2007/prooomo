"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Globe,
  Smartphone,
  Eye,
  Package,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

interface FraudData {
  ordersByPhone: number;
  cancelledByPhone: number;
  fakeByPhone: number;
  ordersByIp: number;
  ordersByDevice: number;
  abandonedByPhone: number;
  visitsByIp: number;
  blocked: { phone: boolean; ip: boolean; device: boolean };
  risk: number;
}

interface FraudSectionProps {
  orderId: string;
  phone: string;
  ip?: string | null;
  deviceId?: string | null;
  canBlock?: boolean;
}

export function FraudSection({ orderId, phone, ip, deviceId, canBlock = true }: FraudSectionProps) {
  const [data, setData] = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        phone,
        ...(ip ? { ip } : {}),
        ...(deviceId ? { device: deviceId } : {}),
        excludeOrderId: orderId,
      });
      const res = await fetch(`/api/fraud/check?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [phone, ip, deviceId, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const copy = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  };

  const toggleBlock = async (type: "phone" | "ip" | "device", value: string, isBlocked: boolean) => {
    if (!value) return;
    if (isBlocked && !confirm("إلغاء الحظر؟")) return;
    if (!isBlocked && !confirm("حظر؟ لن تصل طلبات جديدة من هذا المصدر")) return;
    setActing(type);
    try {
      if (isBlocked) {
        await fetch(`/api/fraud/blocks?type=${type}&value=${encodeURIComponent(value)}`, { method: "DELETE" });
      } else {
        await fetch("/api/fraud/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, value, note: `حظر من الطلب` }),
        });
      }
      await load();
    } catch { /* ignore */ } finally {
      setActing(null);
    }
  };

  const riskColor =
    !data || data.risk < 30
      ? "text-emerald-700 dark:text-emerald-300"
      : data.risk < 70
        ? "text-amber-700 dark:text-amber-300"
        : "text-red-700 dark:text-red-300";
  const riskBg =
    !data || data.risk < 30
      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30"
      : data.risk < 70
        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30"
        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30";

  const rows: { key: string; label: string; value: string | null; blocked: boolean; type: "phone" | "ip" | "device"; icon: React.ReactNode }[] = [
    {
      key: "phone",
      label: "رقم الهاتف",
      value: phone || null,
      blocked: !!data?.blocked.phone,
      type: "phone",
      icon: <Package className="h-3.5 w-3.5 text-muted-foreground" />,
    },
    {
      key: "ip",
      label: "عنوان IP",
      value: ip || null,
      blocked: !!data?.blocked.ip,
      type: "ip",
      icon: <Globe className="h-3.5 w-3.5 text-muted-foreground" />,
    },
    {
      key: "device",
      label: "معرف الجهاز",
      value: deviceId || null,
      blocked: !!data?.blocked.device,
      type: "device",
      icon: <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />,
    },
  ];

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data && data.risk >= 70 ? (
            <ShieldAlert className="h-4 w-4 text-red-600" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-primary" />
          )}
          <span className="text-xs font-bold">الحماية من الطلبات المزيفة</span>
        </div>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          data && (
            <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-lg border", riskColor, riskBg)}>
              خطر {data.risk}%
            </span>
          )
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {/* Counts */}
        {data && (
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className="bg-muted/40 rounded-lg px-2 py-1.5">
              <p className="text-base font-black">{data.ordersByPhone}</p>
              <p className="text-[10px] text-muted-foreground font-bold">طلبات بنفس الرقم</p>
              {(data.cancelledByPhone > 0 || data.fakeByPhone > 0) && (
                <p className="text-[10px] font-bold text-red-600">ملغاة/مزيفة: {data.cancelledByPhone + data.fakeByPhone}</p>
              )}
            </div>
            <div className="bg-muted/40 rounded-lg px-2 py-1.5">
              <p className="text-base font-black">{data.ordersByIp}</p>
              <p className="text-[10px] text-muted-foreground font-bold">طلبات بنفس IP</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-2 py-1.5">
              <p className="text-base font-black">{data.ordersByDevice}</p>
              <p className="text-[10px] text-muted-foreground font-bold">طلبات بنفس الجهاز</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-2 py-1.5">
              <p className="text-base font-black flex items-center justify-center gap-1">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                {data.visitsByIp}
              </p>
              <p className="text-[10px] text-muted-foreground font-bold">زيارات + {data.abandonedByPhone} متروكة</p>
            </div>
          </div>
        )}

        {/* Identifiers + block buttons */}
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-bold">{r.label}</p>
              {r.value ? (
                <button
                  onClick={() => copy(r.value as string, r.key)}
                  className="flex items-center gap-1.5 text-xs font-mono font-bold hover:text-primary transition-colors max-w-full"
                  dir="ltr"
                >
                  <span className="truncate">{r.value}</span>
                  {copied === r.key ? <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" /> : <Copy className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                </button>
              ) : (
                <p className="text-[11px] text-muted-foreground/60">غير متوفر (طلب قديم)</p>
              )}
            </div>
            {canBlock && r.value && (
              <button
                onClick={() => toggleBlock(r.type, r.value as string, r.blocked)}
                disabled={acting === r.type}
                className={cn(
                  "h-8 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors flex-shrink-0 disabled:opacity-50",
                  r.blocked
                    ? "bg-muted text-muted-foreground hover:bg-muted/70"
                    : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60"
                )}
              >
                {acting === r.type ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Ban className="h-3 w-3" />
                )}
                {r.blocked ? "إلغاء الحظر" : "حظر"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
