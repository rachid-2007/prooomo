"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { RichTextEditor } from "@/components/products/rich-text-editor";
import { ArrowRight, Plus, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);
  const [offers, setOffers] = useState<{ name: string; quantity: number; price: number; sortOrder: number; isActive: boolean }[]>([]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}-]+/gu, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || images.length === 0) {
      alert("يرجى ملء جميع الحقول وإضافة صورة واحدة على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || generateSlug(name),
          shortDescription,
          fullDescription,
          price: parseFloat(price),
          images,
          initialStock: initialStock ? parseInt(initialStock) : 0,
          hasOffers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (hasOffers && offers.length > 0 && data.id) {
          await fetch(`/api/products/${data.id}/offers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offers: offers.map((o, i) => ({ ...o, sortOrder: i })) }),
          });
        }
        router.push("/products");
      } else {
        const data = await res.json();
        alert(data.error || "حدث خطأ أثناء إضافة المنتج");
      }
    } catch (error) {
      console.error("Failed to create product:", error);
      alert("حدث خطأ أثناء إضافة المنتج");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <Header
        title="إضافة منتج جديد"
        description="أضف منتجاً جديداً للمتجر"
        action={
          <Link href="/products">
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </Link>
        }
      />

      <div className="p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">اسم المنتج *</label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="أدخل اسم المنتج"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">الرابط (Slug)</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="product-slug"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  إذا تُرك فارغاً، سيتم إنشاؤه تلقائياً من اسم المنتج
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">الوصف المختصر</label>
                <Input
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="وصف مختصر للمنتج"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">السعر (دج) *</label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">المخزون الأولي</label>
                <Input
                  type="number"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">عدد الوحدات المتاحة للبيع</p>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>صور المنتج *</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={images}
                onChange={setImages}
                maxImages={5}
              />
            </CardContent>
          </Card>

          {/* Offers */}
          <Card>
            <CardHeader>
              <CardTitle>العروض</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasOffers}
                  onChange={(e) => setHasOffers(e.target.checked)}
                  className="h-5 w-5 rounded"
                />
                <div>
                  <p className="font-medium">تفعيل العروض</p>
                  <p className="text-sm text-muted-foreground">عرض خيارات الكمية والسعر بدلاً من حقل الكمية</p>
                </div>
              </label>
              {hasOffers && (
                <div className="space-y-3 mt-4">
                  {offers.map((offer, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={offer.name}
                          onChange={(e) => {
                            const next = [...offers];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setOffers(next);
                          }}
                          placeholder="اسم العرض"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            value={offer.quantity || ""}
                            onChange={(e) => {
                              const next = [...offers];
                              next[idx] = { ...next[idx], quantity: parseInt(e.target.value) || 0 };
                              setOffers(next);
                            }}
                            placeholder="الكمية"
                            min="1"
                          />
                          <Input
                            type="number"
                            value={offer.price || ""}
                            onChange={(e) => {
                              const next = [...offers];
                              next[idx] = { ...next[idx], price: parseFloat(e.target.value) || 0 };
                              setOffers(next);
                            }}
                            placeholder="السعر (دج)"
                            min="0"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOffers(offers.filter((_, i) => i !== idx))}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOffers([...offers, { name: `عرض ${offers.length + 1}`, quantity: 1, price: 0, sortOrder: offers.length, isActive: true }])}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة عرض
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full Description */}
          <Card>
            <CardHeader>
              <CardTitle>الوصف الكامل</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={fullDescription}
                onChange={setFullDescription}
                placeholder="اكتب الوصف التفصيلي للمنتج هنا..."
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              {submitting ? "جاري الإضافة..." : "إضافة المنتج"}
            </Button>
            <Link href="/products">
              <Button type="button" variant="outline" size="lg">
                إلغاء
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
