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
import { OrderStatusSelect } from "./order-status-select";
import { ORDER_STATUS_MAP } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Eye, Edit, MoreHorizontal } from "lucide-react";
import { OrderWithRelations } from "@/types";

interface OrdersTableProps {
  orders: OrderWithRelations[];
  onStatusChange: (orderId: string, newStatus: string) => void;
  onViewOrder: (order: OrderWithRelations) => void;
}

export function OrdersTable({ orders, onStatusChange, onViewOrder }: OrdersTableProps) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
            <TableHead>رقم الهاتف</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>السعر</TableHead>
            <TableHead>العميل</TableHead>
            <TableHead>الولاية</TableHead>
            <TableHead>البلدية</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead className="text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                لا توجد طلبات
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => {
              const statusInfo = ORDER_STATUS_MAP[order.status];
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(() => {
                        try {
                          const imgs = JSON.parse(order.product?.images || "[]");
                          return imgs[0] ? (
                            <img
                              src={imgs[0]}
                              alt={order.product?.name}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : null;
                        } catch { return null; }
                      })()}
                      <span className="font-medium">{order.product?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="font-mono">
                    {order.customerPhone}
                  </TableCell>
                  <TableCell>
                    <OrderStatusSelect
                      value={order.status}
                      onChange={(value) => onStatusChange(order.id, value)}
                      orderHistory={order.statusHistory?.map((h) => ({ status: h.newStatus }))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{order.totalPrice} دج</p>
                      <p className="text-xs text-muted-foreground">
                        {order.productPrice} + {order.shippingPrice}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.wilaya?.name}</TableCell>
                  <TableCell>{order.customerAddress || order.baladya?.name || "-"}</TableCell>
                  <TableCell className="text-center">{order.quantity}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
