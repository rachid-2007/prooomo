"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

interface OrdersByProductProps {
  data: {
    productName: string;
    image: string;
    count: number;
    totalQuantity: number;
  }[];
}

export function OrdersByProduct({ data }: OrdersByProductProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Package className="h-4 w-4 text-primary" />
          </div>
          ملخص الطلبات حسب المنتج
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="divide-y">
            {data.map((item, index) => (
              <div key={item.productName} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">{index + 1}</span>

                {item.image ? (
                  <img src={item.image} alt={item.productName} className="h-8 w-8 rounded-lg object-cover border" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center border">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{item.productName}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold">{item.count}</span>
                  <span className="text-[10px] text-muted-foreground">طلب</span>
                  <span className="text-[10px] text-muted-foreground">|</span>
                  <span className="text-xs font-bold">{item.totalQuantity}</span>
                  <span className="text-[10px] text-muted-foreground">وحدة</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
