"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ShieldAlert,
  Loader2,
  Ban,
  Check,
  Power,
  KeyRound,
  BellRing,
} from "lucide-react";
import Link from "next/link";

interface BlockEntry {
  id: string;
  type: string;
  value: string;
  note: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  phone: "هاتف",
  ip: "IP",
  device: "جهاز",
};

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [turnstile, setTurnstile] = useState(false);
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [toggling, setToggling] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, blocksRes] = await Promise.all([
        fetch("/api/security/status"),
        fetch("/api/fraud/blocks"),
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json();
        setPaused(!!s.ordersPaused);
        setTurnstile(!!s.turnstileConfigured);
      }
      if (blocksRes.ok) {
        setBlocks(await blocksRes.json());
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePause = async () => {
    if (!confirm(paused ? "إعادة فتح استقبال الطلبات؟" : "إيقاف استقبال الطلبات مؤقتا؟ لن يتمكن الزبائن من الطلب")) return;
    setToggling(true);
    try {
      const res = await fetch("/api/security/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      if (res.ok) {
        const data = await res.json();
        setPaused(!!data.ordersPaused);
      }
    } catch { /* ignore */ } finally {
      setToggling(false);
    }
  };

  const unblock = async (b: BlockEntry) => {
    if (!confirm(`إلغاء حظر ${TYPE_LABELS[b.type] || b.type}؟`)) return;
    setUnblocking(b.id);
    try {
      await fetch(`/api/fraud/blocks?type=${b.type}&value=${encodeURIComponent(b.value)}`, { method: "DELETE" });
      setBlocks((prev) => prev.filter((x) => x.id !== b.id));
    } catch { /* ignore */ } finally {
      setUnblocking(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link href="/settings" className="p-2 rounded-xl hover:bg-muted transition-colors">
              <ArrowRight className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-black">الحماية من البوتات</h1>
          </div>
        </div>

        <div className="p-4 space-y-3 max-w-2xl">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 animate-spin" />
            </div>
          ) : (
            <>
              {/* Emergency kill-switch */}
              <div className={cn(
                "rounded-2xl border-2 p-4 transition-colors",
                paused
                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                  : "border-border bg-card"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0",
                    paused ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Power className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">إيقاف استقبال الطلبات</p>
                    <p className="text-[11px] text-muted-foreground">
                      {paused ? "متوقف حاليا - الزبائن لا يستطيعون الطلب" : "يعمل - اضغط للإيقاف المؤقت أثناء هجوم"}
                    </p>
                  </div>
                  <button
                    onClick={togglePause}
                    disabled={toggling}
                    className={cn(
                      "h-9 w-16 rounded-full p-1 transition-colors flex-shrink-0 disabled:opacity-50",
                      paused ? "bg-red-500" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "block h-7 w-7 rounded-full bg-white shadow transition-transform",
                      paused ? "-translate-x-7" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              {/* Turnstile status */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0",
                    turnstile ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                  )}>
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">تحقق Turnstile ضد البوتات</p>
                    <p className="text-[11px] text-muted-foreground">
                      {turnstile
                        ? "مفعّل - البوتات تُرفض تلقائيا"
                        : "غير مفعّل - أنشئ مفاتيح مجانية من Cloudflare وأضفها في متغيرات Vercel"}
                    </p>
                  </div>
                  {turnstile && <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
                </div>
                {!turnstile && (
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    الخطوات: حساب مجاني في dash.cloudflare.com ← Turnstile ← إضافة الموقع ← انسخ Site Key وSecret Key ←
                    أضفهما كـ TURNSTILE_SITE_KEY و TURNSTILE_SECRET_KEY في Vercel ثم redeploy
                  </p>
                )}
              </div>

              {/* Wave alarm info */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">إنذار موجة الطلبات</p>
                    <p className="text-[11px] text-muted-foreground">
                      عند تجاوز 20 طلب في 10 دقائق يصلك تنبيه Push + Telegram تلقائيا
                    </p>
                  </div>
                </div>
              </div>

              {/* Blocked list */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-black">قائمة الحظر ({blocks.length})</span>
                </div>
                {blocks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">لا يوجد محظورون</p>
                ) : (
                  <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                    {blocks.map((b) => (
                      <div key={b.id} className="flex items-center gap-2 px-4 py-2.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-muted flex-shrink-0">
                          {TYPE_LABELS[b.type] || b.type}
                        </span>
                        <span className="text-xs font-mono font-bold truncate flex-1" dir="ltr">{b.value}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[11px] font-bold flex-shrink-0"
                          disabled={unblocking === b.id}
                          onClick={() => unblock(b)}
                        >
                          {unblocking === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5 ml-1" />}
                          إلغاء الحظر
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
