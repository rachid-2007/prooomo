"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  product: string;
  quantity: number;
  totalPrice: number;
  status: string;
  date: string;
  wilaya: string;
}

interface StatsOrdersTableProps {
  title: string;
  orders: Order[];
  color: string;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  IN_DELIVERY: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  ON_HOLD: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  NOT_ANSWERED_1: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  NOT_ANSWERED_2: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  NOT_ANSWERED_3: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  PHONE_CLOSED_1: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  PHONE_CLOSED_2: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  PHONE_CLOSED_3: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  OUT_OF_COVERAGE_1: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  OUT_OF_COVERAGE_2: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  OUT_OF_COVERAGE_3: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  WAITING_CALLBACK: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  POSTPONED: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  FAKE: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300",
  SHIPPED: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  READY_FOR_PAYMENT: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  CUSTOMER_REORDERED: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  RETURN_TRANSFER: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  RETURN_READY: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  RETURN_COMPLETED: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  NEW: "جديد",
  CONFIRMED: "مؤكد",
  IN_DELIVERY: "قيد التسليم",
  ON_HOLD: "معلق",
  DELIVERED: "تم التوصيل",
  PAID: "مدفوع",
  CANCELLED: "ملغي",
  NOT_ANSWERED_1: "لايرد 1",
  NOT_ANSWERED_2: "لايرد 2",
  NOT_ANSWERED_3: "لايرد 3",
  PHONE_CLOSED_1: "مغلق 1",
  PHONE_CLOSED_2: "مغلق 2",
  PHONE_CLOSED_3: "مغلق 3",
  OUT_OF_COVERAGE_1: "خارج 1",
  OUT_OF_COVERAGE_2: "خارج 2",
  OUT_OF_COVERAGE_3: "خارج 3",
  WAITING_CALLBACK: "انتظار اتصال",
  POSTPONED: "مؤجل",
  FAKE: "وهمي",
  SHIPPED: "شُحن",
  READY_FOR_PAYMENT: "جاهز للدفع",
  CUSTOMER_REORDERED: "إعادة",
  RETURN_TRANSFER: "تحويل مرتجع",
  RETURN_READY: "جاهز للاستلام",
  RETURN_COMPLETED: "مرجع منتهي",
};

export function StatsOrdersTable({ title, orders, color, onClose }: StatsOrdersTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className={cn("flex items-center justify-between p-3 md:p-4", color)}>
        <div className="flex items-center gap-2 md:gap-3">
          <h3 className="text-sm font-bold">{title}</h3>
          <Badge variant="secondary" className="text-xs">{orders.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <ExternalLink className="h-3 w-3 ml-1" />
              <span className="hidden md:inline">عرض الكل</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs hidden md:table-cell">#</TableHead>
              <TableHead className="text-xs">المنتج</TableHead>
              <TableHead className="text-xs">العميل</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">الهاتف</TableHead>
              <TableHead className="text-xs">الحالة</TableHead>
              <TableHead className="text-xs">الكمية</TableHead>
              <TableHead className="text-xs">السعر</TableHead>
              <TableHead className="text-xs hidden md:table-cell">الولاية</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">التاريخ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-6 text-muted-foreground text-xs">
                  لا توجد طلبات
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => (
                <TableRow key={order.id}>
                  <TableCell className="text-xs font-bold hidden md:table-cell">{index + 1}</TableCell>
                  <TableCell className="text-xs font-bold">{order.product}</TableCell>
                  <TableCell className="text-xs">{order.customerName}</TableCell>
                  <TableCell dir="ltr" className="text-xs font-mono hidden lg:table-cell">{order.customerPhone}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] font-bold", statusColors[order.status])}>
                      {statusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">{order.quantity}</TableCell>
                  <TableCell className="text-xs font-bold">{order.totalPrice} دج</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{order.wilaya}</TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{order.date}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
