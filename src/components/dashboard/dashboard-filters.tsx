"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar, X, Search, Package, ChevronDown } from "lucide-react";

type TimeFilter = "all" | "today" | "yesterday" | "7days" | "30days" | "custom" | "range";

interface ProductOption {
  value: string;
  name: string;
  icon: string;
}

interface DashboardFiltersProps {
  onFilterChange?: (filters: {
    time: TimeFilter;
    dateFrom?: string;
    dateTo?: string;
    product?: string;
    viewMode?: string;
  }) => void;
  products?: ProductOption[];
  viewMode?: string;
}

const timeFilters: { value: TimeFilter; label: string }[] = [
  { value: "today", label: "اليوم" },
  { value: "yesterday", label: "أمس" },
  { value: "7days", label: "آخر 7 أيام" },
  { value: "30days", label: "آخر 30 يوم" },
  { value: "custom", label: "تاريخ محدد" },
  { value: "range", label: "مدة زمنية" },
  { value: "all", label: "الكل" },
];

export function DashboardFilters({ onFilterChange, products: propProducts, viewMode: propViewMode }: DashboardFiltersProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [product, setProduct] = useState("");
  const [viewMode, setViewMode] = useState(propViewMode || "all");
  const [showCustom, setShowCustom] = useState(false);
  const [showRange, setShowRange] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiProducts, setApiProducts] = useState<ProductOption[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (propProducts && propProducts.length > 0) {
      setApiProducts(propProducts);
      return;
    }
    fetch("/api/products?limit=200")
      .then((res) => res.json())
      .then((data) => {
        const list: ProductOption[] = [
          { value: "", name: "جميع المنتجات", icon: "📦" },
          ...((data.products || (Array.isArray(data) ? data : [])).map((p: any) => ({
            value: p.id,
            name: p.name,
            icon: "📦",
          }))),
        ];
        setApiProducts(list);
      })
      .catch(() => {});
  }, [propProducts]);

  const products = apiProducts;

  const handleTimeFilter = (value: TimeFilter) => {
    setTimeFilter(value);
    setShowCustom(value === "custom");
    setShowRange(value === "range");

    if (value !== "custom" && value !== "range") {
      setDateFrom("");
      setDateTo("");
    }

    onFilterChange?.({
      time: value,
      dateFrom: undefined,
      dateTo: undefined,
      product: product || undefined,
      viewMode: viewMode || undefined,
    });
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
    onFilterChange?.({
      time: timeFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      product: product || undefined,
      viewMode: value || undefined,
    });
  };

  const handleProductSelect = (value: string) => {
    setProduct(value);
    setShowProductDropdown(false);
    setSearchQuery("");
    onFilterChange?.({
      time: timeFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      product: value || undefined,
      viewMode: viewMode || undefined,
    });
  };

  const handleCustomDate = () => {
    if (dateFrom) {
      onFilterChange?.({
        time: "custom",
        dateFrom,
        dateTo: undefined,
        product: product || undefined,
      });
    }
  };

  const handleRangeDate = () => {
    if (dateFrom && dateTo) {
      onFilterChange?.({
        time: "range",
        dateFrom,
        dateTo,
        product: product || undefined,
      });
    }
  };

  const clearFilters = () => {
    setTimeFilter("today");
    setDateFrom("");
    setDateTo("");
    setProduct("");
    setViewMode("all");
    setShowCustom(false);
    setShowRange(false);
    onFilterChange?.({ time: "today", product: undefined, viewMode: "all" });
  };

  const hasActiveFilter = timeFilter !== "today" || product || viewMode !== "all";

  const selectedProduct = products.find((p) => p.value === product);

  const filteredProducts = products.filter((p) =>
    p.name.includes(searchQuery) || p.value.includes(searchQuery)
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>الفلاتر</span>
            </div>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="h-3 w-3 ml-1" />
                مسح الفلاتر
              </Button>
            )}
          </div>

          <div className="flex flex-nowrap items-center gap-3">
            <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1 flex-1 min-w-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156,163,175,0.3) transparent' }}>
              <div className="flex gap-1.5 shrink-0">
                {timeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => handleTimeFilter(filter.value)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0",
                      timeFilter === filter.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-border shrink-0" />

              <div className="flex items-center gap-1 shrink-0">
                {[
                  { key: "all", label: "الكل" },
                  { key: "orders", label: "طلبات" },
                  { key: "abandoned", label: "متروكة" },
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => handleViewModeChange(v.key)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0",
                      viewMode === v.key
                        ? v.key === "abandoned"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setShowProductDropdown(!showProductDropdown)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  product
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {selectedProduct ? (
                  <>
                    <span>{selectedProduct.icon}</span>
                    <span>{selectedProduct.name}</span>
                  </>
                ) : (
                  <>
                    <Package className="h-3.5 w-3.5" />
                    <span>البحث عن المنتجات</span>
                  </>
                )}
                <ChevronDown className={cn("h-3 w-3 transition-transform", showProductDropdown && "rotate-180")} />
              </button>

              {showProductDropdown && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="البحث عن المنتجات..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-9 pl-3 py-2 text-xs bg-muted/50 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => handleProductSelect(p.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-right",
                          product === p.value && "bg-muted/50"
                        )}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showCustom && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full md:w-44 h-8 text-xs"
              />
              <Button size="sm" onClick={handleCustomDate} className="h-8 text-xs">
                تطبيق
              </Button>
            </div>
          )}

          {showRange && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full md:w-44 h-8 text-xs"
                placeholder="من تاريخ"
              />
              <span className="text-xs text-muted-foreground">إلى</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full md:w-44 h-8 text-xs"
                placeholder="إلى تاريخ"
              />
              <Button size="sm" onClick={handleRangeDate} className="h-8 text-xs">
                تطبيق
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
