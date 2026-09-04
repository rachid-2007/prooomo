"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WILAYAS_DATA } from "@/lib/constants";
import { Save, Loader2, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

interface ShippingPrice {
  home: number;
  office: number;
}

export default function ShippingPricesPage() {
  const [prices, setPrices] = useState<Record<string, ShippingPrice>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => {
        const s = settings.find((x: any) => x.key === "shipping_prices");
        if (s) {
          try {
            const loaded = JSON.parse(s.value);
            setPrices(loaded);
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updatePrice = (code: string, field: "home" | "office", val: string) => {
    const num = parseInt(val) || 0;
    setPrices((prev) => ({
      ...prev,
      [code]: { ...prev[code], [field]: num },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "shipping_prices", value: JSON.stringify(prices) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
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
              <h1 className="text-xl font-black">أسعار الشحن</h1>
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

        <div className="p-4">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4 animate-spin" />
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_90px_90px] gap-2 px-4 py-2.5 bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground">
                <span>#</span>
                <span>الولاية</span>
                <span className="text-center">المنزل</span>
                <span className="text-center">المكتب</span>
              </div>
              <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
                {WILAYAS_DATA.map((w) => (
                  <div key={w.code} className="grid grid-cols-[40px_1fr_90px_90px] gap-2 px-4 py-2 border-b border-border/50 last:border-0 items-center hover:bg-muted/30 transition-colors">
                    <span className="text-[11px] font-mono text-muted-foreground">{w.code}</span>
                    <span className="text-sm font-medium truncate">{w.name}</span>
                    <Input
                      type="number"
                      value={prices[w.code]?.home ?? 600}
                      onChange={(e) => updatePrice(w.code, "home", e.target.value)}
                      className="h-8 text-center text-xs font-bold rounded-lg"
                    />
                    <Input
                      type="number"
                      value={prices[w.code]?.office ?? 400}
                      onChange={(e) => updatePrice(w.code, "office", e.target.value)}
                      className="h-8 text-center text-xs font-bold rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
