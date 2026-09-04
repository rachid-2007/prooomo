"use client";

import { WorkerSidebar } from "./worker-sidebar";

interface WorkerLayoutProps {
  children: React.ReactNode;
  username: string;
  workerName: string;
}

export function WorkerLayout({ children, username, workerName }: WorkerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <WorkerSidebar username={username} workerName={workerName} />
      <main className="md:mr-64 transition-all duration-300">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              E
            </div>
            <span className="text-base font-bold">Mega.Market</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
