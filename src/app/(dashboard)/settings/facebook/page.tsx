"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Save, Loader2, ArrowRight, Check, Eye, EyeOff, Activity,
  Send, AlertTriangle, CheckCircle, XCircle, BarChart3,
} from "lucide-react";
import Link from "next/link";

interface FBSettings {
  fb_pixel_id: string;
  fb_access_token: string;
  fb_test_event_code: string;
  fb_pixel_enabled: string;
  fb_capi_enabled: string;
}

interface FBEvent {
  id: string;
  eventName: string;
  eventId: string | null;
  source: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export default function FacebookPage() {
  const [settings, setSettings] = useState<FBSettings>({
    fb_pixel_id: "",
    fb_access_token: "",
    fb_test_event_code: "",
    fb_pixel_enabled: "false",
    fb_capi_enabled: "false",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [events, setEvents] = useState<FBEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [sendingTest, setSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "events" | "stats">("settings");

  useEffect(() => {
    fetch("/api/facebook/settings")
      .then((r) => r.json())
      .then((d) => { setSettings((prev) => ({ ...prev, ...d })); setLoading(false); })
      .catch(() => setLoading(false));

    loadEvents();
  }, []);

  const loadEvents = () => {
    setEventsLoading(true);
    fetch("/api/facebook/events?limit=30")
      .then((r) => r.json())
      .then((d) => { setEvents(d.events || []); setStats(d.stats || []); setEventsLoading(false); })
      .catch(() => setEventsLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/facebook/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const sendTestEvent = async () => {
    setSendingTest(true);
    try {
      await fetch("/api/facebook/capi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "TestEvent",
          eventData: { value: 0, currency: "DZD", content_name: "test" },
        }),
      });
      setTimeout(() => loadEvents(), 1000);
    } catch {}
    setSendingTest(false);
  };

  const validateSettings = () => {
    const errors: string[] = [];
    if (!settings.fb_pixel_id || settings.fb_pixel_id.length < 5) errors.push("Pixel ID غير صحيح");
    if (settings.fb_pixel_enabled === "true" && !settings.fb_access_token) errors.push("Access Token مطلوب عند تفعيل CAPI");
    return errors;
  };

  const pixelEnabled = settings.fb_pixel_enabled === "true";
  const capiEnabled = settings.fb_capi_enabled === "true";
  const errors = validateSettings();

  const eventStats = events.reduce((acc, e) => {
    acc[e.eventName] = (acc[e.eventName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const successRate = events.length > 0
    ? Math.round((events.filter((e) => e.status === "success").length / events.length) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="p-2 rounded-xl hover:bg-muted transition-colors">
                <ArrowRight className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-black">Facebook Pixel</h1>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "h-10 rounded-xl font-bold px-4 gap-2 text-sm",
                saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{saved ? "تم" : "حفظ"}</span>
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {[
              { key: "settings" as const, label: "الإعدادات", icon: Activity },
              { key: "events" as const, label: "الأحداث", icon: Send },
              { key: "stats" as const, label: "الإحصائيات", icon: BarChart3 },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  activeTab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
            </div>
          ) : (
            <>
              {/* ===== SETTINGS TAB ===== */}
              {activeTab === "settings" && (
                <div className="space-y-4">
                  {/* Status Indicators */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      "rounded-xl border-2 p-4 text-center",
                      pixelEnabled ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-border"
                    )}>
                      {pixelEnabled ? <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2" /> : <XCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />}
                      <p className="text-sm font-bold">Pixel</p>
                      <p className={cn("text-xs font-bold", pixelEnabled ? "text-emerald-600" : "text-muted-foreground")}>{pixelEnabled ? "مفعّل" : "معطّل"}</p>
                    </div>
                    <div className={cn(
                      "rounded-xl border-2 p-4 text-center",
                      capiEnabled ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-border"
                    )}>
                      {capiEnabled ? <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2" /> : <XCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />}
                      <p className="text-sm font-bold">CAPI</p>
                      <p className={cn("text-xs font-bold", capiEnabled ? "text-emerald-600" : "text-muted-foreground")}>{capiEnabled ? "مفعّل" : "معطّل"}</p>
                    </div>
                  </div>

                  {/* Errors */}
                  {errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 space-y-1">
                      {errors.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-red-600 font-bold">
                          <AlertTriangle className="h-3.5 w-3.5" /> {e}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pixel ID */}
                  <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <h3 className="text-sm font-bold">Pixel ID</h3>
                    <Input
                      placeholder="123456789012345"
                      value={settings.fb_pixel_id}
                      onChange={(e) => setSettings((p) => ({ ...p, fb_pixel_id: e.target.value }))}
                      className="h-10 text-sm font-mono rounded-xl"
                    />
                  </div>

                  {/* Access Token */}
                  <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <h3 className="text-sm font-bold">Conversions API Access Token</h3>
                    <div className="relative">
                      <Input
                        type={showToken ? "text" : "password"}
                        placeholder="EAA..."
                        value={settings.fb_access_token}
                        onChange={(e) => setSettings((p) => ({ ...p, fb_access_token: e.target.value }))}
                        className="h-10 text-sm font-mono rounded-xl pl-10"
                      />
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                      >
                        {showToken ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {/* Test Event Code */}
                  <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <h3 className="text-sm font-bold">Test Event Code</h3>
                    <Input
                      placeholder="TEST12345"
                      value={settings.fb_test_event_code}
                      onChange={(e) => setSettings((p) => ({ ...p, fb_test_event_code: e.target.value }))}
                      className="h-10 text-sm font-mono rounded-xl"
                    />
                    <p className="text-[11px] text-muted-foreground">اختياري - لاختبار الأحداث في Events Manager</p>
                  </div>

                  {/* Toggles */}
                  <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">تفعيل Pixel</p>
                        <p className="text-[11px] text-muted-foreground">إرسال أحداث من المتجر</p>
                      </div>
                      <button
                        onClick={() => setSettings((p) => ({ ...p, fb_pixel_enabled: p.fb_pixel_enabled === "true" ? "false" : "true" }))}
                        className={cn(
                          "w-12 h-7 rounded-full transition-colors relative",
                          pixelEnabled ? "bg-emerald-500" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all",
                          pixelEnabled ? "right-0.5" : "right-5"
                        )} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">تفعيل CAPI</p>
                        <p className="text-[11px] text-muted-foreground">إرسال أحداث من السيرفر</p>
                      </div>
                      <button
                        onClick={() => setSettings((p) => ({ ...p, fb_capi_enabled: p.fb_capi_enabled === "true" ? "false" : "true" }))}
                        className={cn(
                          "w-12 h-7 rounded-full transition-colors relative",
                          capiEnabled ? "bg-emerald-500" : "bg-gray-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all",
                          capiEnabled ? "right-0.5" : "right-5"
                        )} />
                      </button>
                    </div>
                  </div>

                  {/* Test Button */}
                  <Button
                    onClick={sendTestEvent}
                    disabled={sendingTest || !pixelEnabled}
                    className="w-full h-12 rounded-xl font-bold gap-2"
                    variant="outline"
                  >
                    {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    إرسال حدث اختبار
                  </Button>
                </div>
              )}

              {/* ===== EVENTS TAB ===== */}
              {activeTab === "events" && (
                <div className="space-y-4">
                  <Button onClick={loadEvents} variant="outline" className="w-full rounded-xl font-bold gap-2" size="sm">
                    <Loader2 className={cn("h-3.5 w-3.5", eventsLoading && "animate-spin")} />
                    تحديث
                  </Button>

                  {events.length === 0 ? (
                    <div className="py-12 text-center bg-card rounded-xl border border-border">
                      <Send className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">لا توجد أحداث بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {events.map((event) => (
                        <div key={event.id} className="bg-card rounded-xl border border-border px-4 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                event.status === "success" ? "bg-emerald-500" : "bg-red-500"
                              )} />
                              <span className="text-sm font-bold">{event.eventName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-bold">{event.source}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(event.createdAt).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {event.eventId && (
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{event.eventId}</p>
                          )}
                          {event.error && (
                            <p className="text-[10px] text-red-500 mt-1 truncate">{event.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== STATS TAB ===== */}
              {activeTab === "stats" && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card rounded-xl border border-border p-4 text-center">
                      <p className="text-2xl font-black text-primary">{events.length}</p>
                      <p className="text-[11px] text-muted-foreground font-bold">إجمالي الأحداث</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4 text-center">
                      <p className="text-2xl font-black text-emerald-600">{successRate}%</p>
                      <p className="text-[11px] text-muted-foreground font-bold">معدل النجاح</p>
                    </div>
                  </div>

                  {/* Event Breakdown */}
                  <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                    <h3 className="text-sm font-bold">الأحداث حسب النوع</h3>
                    {Object.entries(eventStats).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs font-bold">{name}</span>
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{count as number}</span>
                      </div>
                    ))}
                    {Object.keys(eventStats).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
