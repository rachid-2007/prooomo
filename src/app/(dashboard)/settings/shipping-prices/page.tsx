"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { WILAYAS_DATA } from "@/lib/constants";
import { Save, Loader2, ArrowRight, Check, Download, Upload } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface ShippingPrice {
  home: number;
  office: number;
}

export default function ShippingPricesPage() {
  const [prices, setPrices] = useState<Record<string, ShippingPrice>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleDownloadExcel = () => {
    const rows = WILAYAS_DATA.map((w) => ({
      "الكود": w.code,
      "الولاية": w.name,
      "المنزل": prices[w.code]?.home ?? 600,
      "المكتب": prices[w.code]?.office ?? 400,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 8 }, { wch: 22 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الشحن");
    XLSX.writeFile(wb, "shipping-prices.xlsx");
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
      // skip header row, columns: code | wilaya | home | office
      const next: Record<string, ShippingPrice> = { ...prices };
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length < 3) continue;
        const code = String(r[0] ?? "").padStart(2, "0");
        const home = parseInt(String(r[2] ?? "")) || 0;
        const office = parseInt(String(r[3] ?? "")) || 0;
        if (!WILAYAS_DATA.some((w) => w.code === code)) continue;
        if (home < 0 || office < 0) continue;
        next[code] = { home, office };
        count++;
      }
      setPrices(next);
      setImportMsg(count > 0 ? `تم تحميل ${count} ولاية — اضغط حفظ للتثبيت` : "لم يتم العثور على بيانات صالحة في الملف");
    } catch {
      setImportMsg("تعذر قراءة الملف — تأكد أنه Excel صحيح");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleUploadExcel}
              />
              <Button
                variant="outline"
                onClick={handleDownloadExcel}
                className="h-10 rounded-xl font-bold px-3 gap-1.5 text-xs"
                title="تحميل الأسعار الحالية كملف Excel"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">تحميل (Excel)</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="h-10 rounded-xl font-bold px-3 gap-1.5 text-xs"
                title="رفع أسعار من ملف Excel"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="hidden sm:inline">رفع (Excel)</span>
              </Button>
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
        </div>

        <div className="p-4">
          {importMsg && (
            <div className="mb-3 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300">
              {importMsg}
            </div>
          )}
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
