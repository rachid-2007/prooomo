"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { DailyCompletionSummary } from "@/components/dashboard/weekly-completion-summary";

export default function CompletionPage() {
  return (
    <DashboardLayout>
      <Header title="ملخص التكامل" description="نظرة يومية على أداء الطلبات" />
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156,163,175,0.3) transparent' }}>
        <div className="p-2 md:p-4 min-w-[1200px] md:min-w-0">
          <DailyCompletionSummary />
        </div>
      </div>
    </DashboardLayout>
  );
}
