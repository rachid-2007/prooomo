"use client";

import { Sidebar } from "./sidebar";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="transition-all duration-300" style={{ marginRight: isMobile ? 0 : "16rem" }}>
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-4 py-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                E
              </div>
              <span className="text-base font-bold">Mega.Market</span>
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
