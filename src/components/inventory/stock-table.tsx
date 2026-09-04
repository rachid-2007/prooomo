"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Package, AlertTriangle, CheckCircle, XCircle, Warehouse, Edit, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string;
  stock: number;
  initialStock: number;
  totalSales: number;
  committed: number;
  confirmedToShip: number;
  inDelivery: number;
  delivered: number;
  paid: number;
  inReturn: number;
  returned: number;
  cancelled: number;
  available: number;
  stockStatus: "ok" | "low" | "out";
}

export function StockTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "sales" | "stock">("name");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveStock(productId: string) {
    const newStock = parseInt(editValue, 10);
    if (isNaN(newStock) || newStock < 0) return;

    try {
      await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, stock: newStock }),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, stock: newStock, available: newStock - p.committed }
            : p
        )
      );
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update stock:", error);
    }
  }

  const filteredProducts = products
    .filter((p) => p.name.includes(searchQuery))
    .sort((a, b) => {
      if (sortBy === "sales") return b.totalSales - a.totalSales;
      if (sortBy === "stock") return b.stock - a.stock;
      return a.name.localeCompare(b.name);
    });

  const getStockStatus = (status: string) => {
    if (status === "out") return { label: "نفذ", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", icon: XCircle };
    if (status === "low") return { label: "منخفض", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300", icon: AlertTriangle };
    return { label: "متوفر", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", icon: CheckCircle };
  };

  const getProductImage = (images: string) => {
    try {
      const arr = JSON.parse(images);
      return arr.length > 0 ? arr[0] : null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="h-5 w-5 text-primary" />
            مخزونك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="h-5 w-5 text-primary" />
            مخزونك
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 w-48 h-8 text-xs"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "sales" | "stock")}
              className="h-8 px-3 text-xs bg-muted rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="name">المنتج</option>
              <option value="sales">المبيعات</option>
              <option value="stock">الكمية في المخزون</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold">المنتج</TableHead>
                <TableHead className="text-xs font-bold text-center">المبيعات</TableHead>
                <TableHead className="text-xs font-bold text-center">المخزون</TableHead>
                <TableHead className="text-xs font-bold text-center">متوفر</TableHead>
                <TableHead className="text-xs font-bold text-center">محجوز</TableHead>
                <TableHead className="text-xs font-bold text-center">قيد التوصيل</TableHead>
                <TableHead className="text-xs font-bold text-center">قيد الإرجاع</TableHead>
                <TableHead className="text-xs font-bold text-center">مرتجع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    لا توجد منتجات
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stockStatus);
                  const StockIcon = stockStatus.icon;
                  const imageUrl = getProductImage(product.images);
                  const isEditing = editingId === product.id;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                              <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                              📦
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold line-clamp-1">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.price.toLocaleString()} دج</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-primary">{product.totalSales}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-7 w-20 text-xs text-center"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveStock(product.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-green-600"
                                onClick={() => handleSaveStock(product.id)}
                              >
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className={cn("text-sm font-bold", product.stock <= 0 ? "text-red-600 dark:text-red-400" : product.stock <= 20 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400")}>
                                {product.stock}
                              </span>
                              <Badge className={cn("text-[10px]", stockStatus.color)}>
                                <StockIcon className="h-2.5 w-2.5 ml-0.5" />
                                {stockStatus.label}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setEditingId(product.id);
                                  setEditValue(product.stock.toString());
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("text-sm font-bold", product.available <= 0 ? "text-red-600 dark:text-red-400" : product.available <= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400")}>
                          {product.available}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold">{product.committed}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold">{product.inDelivery}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("text-sm font-bold", product.inReturn > 0 ? "text-red-600 dark:text-red-400" : "")}>
                          {product.inReturn}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold">{product.returned}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
