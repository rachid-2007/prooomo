"use client";

import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function ShippingButton() {
  return (
    <Button className="w-full" size="sm">
      <Upload className="h-4 w-4 ml-2" />
      رفع الطلبات
    </Button>
  );
}
