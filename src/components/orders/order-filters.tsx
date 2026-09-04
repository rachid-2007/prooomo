"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";

interface OrderFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  product: string;
  onProductChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
}

export function OrderFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  product,
  onProductChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: OrderFiltersProps) {
  const hasFilters = search || status || product || dateFrom || dateTo;

  const clearFilters = () => {
    onSearchChange("");
    onStatusChange("");
    onProductChange("");
    onDateFromChange("");
    onDateToChange("");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span>البحث والفلاتر</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم الهاتف..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pr-9"
              />
            </div>

            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              options={[
                { value: "", label: "جميع الحالات" },
                { value: "NEW", label: "طلب جديد" },
                { value: "CONFIRMED", label: "تم التأكيد" },
                { value: "NOT_ANSWERED_1", label: "العميل لا يريد 1" },
                { value: "NOT_ANSWERED_2", label: "العميل لا يريد 2" },
                { value: "NOT_ANSWERED_3", label: "العميل لا يريد 3" },
                { value: "PHONE_CLOSED_1", label: "الهاتف مغلق 1" },
                { value: "PHONE_CLOSED_2", label: "الهاتف مغلق 2" },
                { value: "PHONE_CLOSED_3", label: "الهاتف مغلق 3" },
                { value: "OUT_OF_COVERAGE_1", label: "خارج مجال التغطية 1" },
                { value: "OUT_OF_COVERAGE_2", label: "خارج مجال التغطية 2" },
                { value: "OUT_OF_COVERAGE_3", label: "خارج مجال التغطية 3" },
                { value: "WAITING_CALLBACK", label: "في انتظار عودة اتصال العميل" },
                { value: "POSTPONED", label: "تم تأجيل الطلب" },
                { value: "CANCELLED", label: "تم إلغاء الطلب" },
                { value: "FAKE", label: "طلب وهمي" },
                { value: "SHIPPED", label: "تم الشحن" },
                { value: "IN_DELIVERY", label: "قيد التسليم" },
                { value: "ON_HOLD", label: "معلق" },
                { value: "DELIVERED", label: "تم التسليم" },
                { value: "READY_FOR_PAYMENT", label: "جاهز للدفع" },
                { value: "PAID", label: "مدفوع مكتمل" },
                { value: "CUSTOMER_REORDERED", label: "العميل أعاد الطلب" },
                { value: "RETURN_TRANSFER", label: "مرجع قيد التحويل" },
                { value: "RETURN_READY", label: "مرجع جاهز" },
                { value: "RETURN_COMPLETED", label: "مرجع مكتمل" },
              ]}
              className="w-44"
            />

            <Select
              value={product}
              onChange={(e) => onProductChange(e.target.value)}
              options={[
                { value: "", label: "جميع المنتجات" },
                { value: "1", label: "منتج A" },
                { value: "2", label: "منتج B" },
                { value: "3", label: "منتج C" },
              ]}
              className="w-44"
            />

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="w-40"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 ml-1" />
              مسح
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
