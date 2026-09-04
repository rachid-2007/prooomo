"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Key,
  Globe,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Truck,
  Copy,
  Check,
} from "lucide-react";
import { DELIVERY_STATUS_MAP } from "@/lib/constants";

export default function ShippingSettingsPage() {
  const [apiToken, setApiToken] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const settingsArray = Array.isArray(data) ? data : [];
        const settingsObj = settingsArray.reduce((acc: Record<string, string>, s: any) => {
          acc[s.key] = s.value;
          return acc;
        }, {});
        setApiToken(settingsObj.delivery_api_token || "");
        setApiUrl(settingsObj.delivery_api_url || "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [
            { key: "delivery_api_token", value: apiToken },
            { key: "delivery_api_url", value: apiUrl },
          ],
        }),
      });
      if (res.ok) {
        alert("تم الحفظ بنجاح");
      } else {
        alert("فشل الحفظ");
      }
    } catch {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiToken || !apiUrl) {
      alert("أدخل API Token و رابط API أولاً");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/delivery/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumbers: ["TEST"] }),
      });
      setTestResult(res.ok ? "success" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = "https://mega-market-alpha.vercel.app/api/delivery/sync";

  return (
    <DashboardLayout>
      <Header title="إعدادات شركة الشحن" description="إدارة اتصال شركة التوصيل" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-2xl">
        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              إعدادات API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">API Token</label>
              <Input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="أدخل API Token الخاص بشركة الشحن"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">رابط API (API URL)</label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://platform.dhd-dz.com"
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              كيف يعمل؟
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-bold">أرسل الطلب</p>
                <p className="text-xs text-muted-foreground">اضغط "إرسال للتوصيل" على الطلب → يُرسل لشركة التوصيل وتحصل على رقم تتبع</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm font-bold">زمّن الحالات</p>
                <p className="text-xs text-muted-foreground">اضغط زر التحديث (Truck icon) في صفحة الطلبات → يفحص حالة كل الطلب من الشركة ويحدّثها تلقائياً</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm font-bold">تتبع التغييرات</p>
                <p className="text-xs text-muted-foreground">الحالة تتحدث تلقائياً: SHIPPED → IN_DELIVERY → DELIVERED → PAID</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Mapping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              ربط حالات الشحن
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(DELIVERY_STATUS_MAP).map(([deliveryStatus, internalStatus]) => (
                <div key={deliveryStatus} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                  <Badge variant="outline" className="font-medium text-xs">{deliveryStatus}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">←</span>
                    <Badge variant="secondary" className="text-xs">{internalStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !loaded}>
            {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
            حفظ الإعدادات
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !apiToken || !apiUrl}>
            {testing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <TestTube className="h-4 w-4 ml-2" />}
            اختبار الاتصال
          </Button>
          {testResult === "success" && (
            <div className="flex items-center gap-1 text-emerald-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              الاتصال ناجح
            </div>
          )}
          {testResult === "error" && (
            <div className="flex items-center gap-1 text-destructive text-sm">
              <XCircle className="h-4 w-4" />
              فشل الاتصال
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
