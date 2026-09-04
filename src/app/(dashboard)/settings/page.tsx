"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Store, Palette, Package, BarChart3, Settings, Users, Bell, CreditCard } from "lucide-react";
import Link from "next/link";

const settingsItems = [
  {
    href: "/settings/shipping",
    icon: Truck,
    title: "شركات الشحن",
    description: "إعدادات API شركة التوصيل",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/50",
  },
  {
    href: "/settings/shipping-prices",
    icon: Package,
    title: "أسعار الشحن",
    description: "تعديل أسعار التوصيل لكل ولاية",
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/50",
  },
  {
    href: "/settings/offices",
    icon: Store,
    title: "المكاتب",
    description: "إضافة وحذف مكاتب التوصيل",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    border: "border-purple-100 dark:border-purple-900/50",
  },
  {
    href: "/settings/colors",
    icon: Palette,
    title: "ألوان الفورم",
    description: "تخصيص ألوان نموذج الطلب",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/50",
  },
  {
    href: "/settings/facebook",
    icon: BarChart3,
    title: "Facebook Pixel + CAPI",
    description: "تتبع الأحداث والتحويلات",
    color: "from-indigo-500 to-blue-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-100 dark:border-indigo-900/50",
  },
];

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black">الإعدادات</h1>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {settingsItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98] group overflow-hidden border ${item.border}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center">
                      <div className={`w-16 sm:w-20 flex items-center justify-center ${item.bg} flex-shrink-0 rounded-r-xl`}>
                        <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 px-3 sm:px-4 py-4 flex items-center justify-between min-w-0">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm mb-0.5 truncate">{item.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </div>
                        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 ms-2 group-hover:bg-primary/10 transition-colors">
                          <span className="text-muted-foreground text-xs sm:text-sm group-hover:text-primary transition-colors">←</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
