"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Save, Loader2, ArrowRight, Check, Palette, Sparkles } from "lucide-react";
import Link from "next/link";

const DEFAULT_COLORS = {
  primary: "#7c3aed",
  secondary: "#2563eb",
  background: "#ffffff",
  text: "#1f2937",
  accent: "#f59e0b",
};

const LABELS: Record<string, string> = {
  primary: "اللون الرئيسي",
  secondary: "اللون الثانوي",
  background: "لون الخلفية",
  text: "لون النص",
  accent: "لون حواف الفورم",
};

const PRESETS = [
  { name: "أخضر نعناعي", colors: { primary: "#10b981", secondary: "#059669", background: "#f0fdf4", text: "#1f2937", accent: "#f59e0b" } },
  { name: "أزرق كلاسيكي", colors: { primary: "#2563eb", secondary: "#3b82f6", background: "#eff6ff", text: "#1f2937", accent: "#f59e0b" } },
  { name: "بنفسجي فاخر", colors: { primary: "#7c3aed", secondary: "#8b5cf6", background: "#f5f3ff", text: "#1f2937", accent: "#f59e0b" } },
  { name: "أحمر جذاب", colors: { primary: "#dc2626", secondary: "#ef4444", background: "#fef2f2", text: "#1f2937", accent: "#f59e0b" } },
  { name: "وردي حيوي", colors: { primary: "#ec4899", secondary: "#f472b6", background: "#fdf2f8", text: "#1f2937", accent: "#f59e0b" } },
  { name: "برتقالي دافئ", colors: { primary: "#ea580c", secondary: "#f97316", background: "#fff7ed", text: "#1f2937", accent: "#0ea5e9" } },
  { name: "أسود أنيق", colors: { primary: "#18181b", secondary: "#27272a", background: "#fafafa", text: "#18181b", accent: "#10b981" } },
  { name: "نيلي هادئ", colors: { primary: "#0ea5e9", secondary: "#38bdf8", background: "#f0f9ff", text: "#1f2937", accent: "#f59e0b" } },
];

export default function ColorsPage() {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/colors")
      .then((r) => r.json())
      .then((c) => { setColors(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "form_colors", value: JSON.stringify(colors) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setColors(preset.colors);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="p-2 rounded-xl hover:bg-muted transition-colors">
                <ArrowRight className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-black">ألوان الفورم</h1>
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
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
            </div>
          ) : (
            <>
              {/* Preset Themes */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> قوالب جاهزة
                  </p>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="p-3 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-right group"
                    >
                      <div className="flex gap-1 mb-2">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.colors.primary }} />
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.colors.secondary }} />
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: preset.colors.accent }} />
                      </div>
                      <p className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">{preset.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Pickers */}
              <div className="space-y-3">
                {Object.entries(LABELS).map(([key, label]) => (
                  <div key={key} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                    <div className="relative">
                      <input
                        type="color"
                        value={colors[key as keyof typeof colors]}
                        onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div
                        className="w-12 h-12 rounded-xl border-2 border-border shadow-inner cursor-pointer"
                        style={{ backgroundColor: colors[key as keyof typeof colors] }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{label}</p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{colors[key as keyof typeof colors]}</p>
                    </div>
                    <Input
                      value={colors[key as keyof typeof colors]}
                      onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-24 h-8 text-[11px] font-mono text-center rounded-lg"
                    />
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" /> معاينة
                  </p>
                </div>
                <div className="p-6 space-y-3" style={{ backgroundColor: colors.background }}>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: colors.primary }}>
                    <p className="text-sm font-bold text-white">زر رئيسي</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: colors.secondary }}>
                    <p className="text-sm font-bold text-white">زر ثانوي</p>
                  </div>
                  <div className="rounded-xl p-4 border-2" style={{ borderColor: colors.accent, color: colors.text }}>
                    <p className="text-sm font-bold">نموذج الطلب</p>
                    <p className="text-xs mt-1 opacity-70">هذا مثال على نص الفورم</p>
                  </div>
                  <div className="rounded-xl p-3 text-center border-2" style={{ borderColor: colors.primary, color: colors.primary }}>
                    <p className="text-sm font-bold">اطلب الآن</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
