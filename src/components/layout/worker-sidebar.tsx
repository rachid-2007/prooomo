"use client";

import Link from "next/link";
import { ShoppingCart, Sun, Moon, LogOut, X } from "lucide-react";
import { useTheme } from "./theme-provider";

interface WorkerSidebarProps {
  username: string;
  workerName: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function WorkerSidebar({ username, workerName, mobileOpen = false, onClose }: WorkerSidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed right-0 top-0 z-40 h-screen w-64 border-l bg-card transition-all duration-300 flex-col hidden md:flex">
        <div className="flex h-16 items-center border-b px-4">
          <Link href={`/worker/${username}`} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              E
            </div>
            <span className="text-lg font-bold">Mega.Market</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          <Link
            href={`/worker/${username}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground shadow-sm"
          >
            <ShoppingCart className="h-5 w-5 flex-shrink-0" />
            <span>طلباتي</span>
          </Link>
        </nav>
        <div className="border-t p-2 space-y-1">
          <div className="px-3 py-2 text-sm">
            <p className="font-medium truncate">{workerName}</p>
            <p className="text-xs text-muted-foreground truncate">@{username}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 w-full"
          >
            {theme === "dark" ? <Sun className="h-5 w-5 flex-shrink-0" /> : <Moon className="h-5 w-5 flex-shrink-0" />}
            <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={onClose}
          />
          <aside className="fixed right-0 top-0 z-50 h-screen w-72 bg-card border-l flex flex-col md:hidden">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link href={`/worker/${username}`} className="flex items-center gap-2" onClick={onClose}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  E
                </div>
                <span className="text-lg font-bold">Mega.Market</span>
              </Link>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="إغلاق القائمة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-2">
              <Link
                href={`/worker/${username}`}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground shadow-sm"
              >
                <ShoppingCart className="h-5 w-5 flex-shrink-0" />
                <span>طلباتي</span>
              </Link>
            </nav>
            <div className="border-t p-2 space-y-1">
              <div className="px-3 py-2 text-sm">
                <p className="font-medium truncate">{workerName}</p>
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 w-full"
              >
                {theme === "dark" ? <Sun className="h-5 w-5 flex-shrink-0" /> : <Moon className="h-5 w-5 flex-shrink-0" />}
                <span>{theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
