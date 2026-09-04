"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Warehouse,
  Wallet,
  Sun,
  Moon,
  X,
  Users,
  LogOut,
  Calculator,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "./theme-provider";
import { useAuth } from "@/components/providers/auth-provider";

function SidebarNav({ collapsed, onLinkClick }: { collapsed: boolean; onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();

  const navigation = [
    { name: "لوحة القيادة", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { name: "الطلبات", href: "/orders", icon: ShoppingCart, adminOnly: false },
    { name: "المنتجات", href: "/products", icon: Package, adminOnly: false },
    { name: "المخزون", href: "/inventory", icon: Warehouse, adminOnly: false },
    { name: "المحفظة", href: "/wallet", icon: Wallet, adminOnly: false },
    { name: "ملخص التكامل", href: "/completion", icon: CalendarDays, adminOnly: false },
    { name: "الحسابات اليدوية", href: "/accounts", icon: Calculator, adminOnly: true },
    { name: "إدارة المستخدمين", href: "/users", icon: Users, adminOnly: true },
    { name: "الإعدادات", href: "/settings", icon: Settings, adminOnly: false },
  ].filter((item) => {
    if (authLoading) return !item.adminOnly;
    if (item.adminOnly) return user?.role === "ADMIN";
    return true;
  });

  return (
    <>
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2 space-y-1">
        {user && (
          <div className="px-3 py-2 text-sm">
            <p className="font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 w-full"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 flex-shrink-0" />
          ) : (
            <Moon className="h-5 w-5 flex-shrink-0" />
          )}
          {!collapsed && <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>}
        </button>

        <Link
          href="/store"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          <Store className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>عرض المتجر</span>}
        </Link>

        <button
          onClick={() => signOut().then(() => window.location.href = "/login")}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200 w-full"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) {
    if (!mobileOpen) return null;
    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        />
        <aside
          className="fixed right-0 top-0 z-50 h-screen w-72 bg-card border-l flex flex-col"
        >
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                E
              </div>
              <span className="text-lg font-bold">Mega.Market</span>
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <SidebarNav collapsed={false} onLinkClick={onClose} />
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 z-40 h-screen border-l bg-card transition-all duration-300 flex-col",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              E
            </div>
            <span className="text-lg font-bold">Mega.Market</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 hover:bg-muted transition-colors"
        >
          {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
