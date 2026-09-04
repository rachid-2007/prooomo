"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, X } from "lucide-react";
import { useState } from "react";

export function DateFilter() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [product, setProduct] = useState("");
  const [worker, setWorker] = useState("");

  const hasFilters = dateFrom || dateTo || product || worker;

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setProduct("");
    setWorker("");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span>الفلاتر</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                placeholder="من تاريخ"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                placeholder="إلى تاريخ"
              />
            </div>

            <Select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              options={[
                { value: "", label: "جميع المنتجات" },
                { value: "1", label: "منتج A" },
                { value: "2", label: "منتج B" },
                { value: "3", label: "منتج C" },
              ]}
              className="w-44"
            />

            <Select
              value={worker}
              onChange={(e) => setWorker(e.target.value)}
              options={[
                { value: "", label: "جميع العمال" },
                { value: "1", label: "عامل 1" },
                { value: "2", label: "عامل 2" },
                { value: "3", label: "عامل 3" },
              ]}
              className="w-44"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 ml-1" />
              مسح الفلاتر
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
