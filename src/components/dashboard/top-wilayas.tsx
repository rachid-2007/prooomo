"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface TopWilayasProps {
  data: {
    name: string;
    count: number;
    rank: number;
  }[];
}

const medalColors = [
  "bg-yellow-500 text-white",
  "bg-gray-400 text-white dark:bg-gray-500",
  "bg-amber-600 text-white",
];

export function TopWilayas({ data }: TopWilayasProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="rounded-lg bg-yellow-500/10 p-1.5">
            <MapPin className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          أفضل الولايات
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="divide-y">
            {data.map((wilaya) => (
              <div key={wilaya.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    wilaya.rank <= 3 ? medalColors[wilaya.rank - 1] : "bg-muted text-muted-foreground"
                  }`}
                >
                  {wilaya.rank}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-bold truncate">{wilaya.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold">{wilaya.count}</span>
                  <span className="text-[10px] text-muted-foreground">طلب</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
