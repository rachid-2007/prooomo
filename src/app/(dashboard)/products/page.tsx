"use client";

import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Search, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string;
  _count: { orders: number };
}

const ProductCard = memo(function ProductCard({
  product,
  onDelete,
}: {
  product: Product;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square bg-muted">
        <img
          src={product.thumbnail || "/placeholder.svg"}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5">{product.price} دج</Badge>
      </div>
      <CardContent className="p-2.5 md:p-3">
        <h3 className="font-semibold text-xs md:text-sm mb-1 truncate">{product.name}</h3>
        <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
          {product._count.orders} طلب
        </p>
        <div className="flex items-center gap-1">
          <Link href={`/store/${product.slug}`} target="_blank" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-[10px] md:text-xs h-7 md:h-8">
              <ExternalLink className="h-3 w-3 ml-0.5" />
              المتجر
            </Button>
          </Link>
          <Link href={`/products/${product.id}/edit`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-[10px] md:text-xs h-7 md:h-8">
              <Edit className="h-3 w-3 ml-0.5" />
              تعديل
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(product.id)}
            className="h-7 w-7 p-0 md:h-8 md:w-8"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchProducts = useCallback(async (searchTerm?: string, pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      params.set("page", String(pageNum));
      params.set("limit", "20");
      const res = await fetch(`/api/products/cards?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts((prev) => (append ? [...prev, ...data.products] : data.products));
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProducts(search || undefined, 1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchProducts]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(search || undefined, nextPage, true);
  }, [page, search, fetchProducts]);

  const handleDelete = useCallback(async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  }, []);

  return (
    <DashboardLayout>
      <Header title="المنتجات" description="إدارة المنتجات" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0 md:w-64 md:flex-none">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 text-sm"
            />
          </div>
          <Link href="/products/new" className="flex-shrink-0">
            <Button className="text-sm">
              <Plus className="h-4 w-4 ml-2" />
              <span className="hidden sm:inline">إضافة منتج</span>
              <span className="sm:hidden">+</span>
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <CardContent className="p-2.5 md:p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد منتجات</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onDelete={handleDelete} />
              ))}
            </div>
            {page < totalPages && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  تحميل المزيد
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
