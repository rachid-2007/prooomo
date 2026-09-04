"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/products/rich-text-editor";
import { ArrowRight, Save, Trash2, Loader2, Plus, X, Palette, Ruler } from "lucide-react";
import Link from "next/link";
import { ImageUpload } from "@/components/ui/image-upload";

interface ProductMeta {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  price: number;
  initialStock: number | null;
  hasOffers: boolean;
  hasColors: boolean;
  hasSizes: boolean;
  isActive: boolean;
  offers: ProductOffer[];
  colors: ProductColorItem[];
  sizes: ProductSizeItem[];
}

interface ProductOffer {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  sortOrder: number;
  isActive: boolean;
}

interface ProductColorItem {
  id?: string;
  name: string;
  image: string;
  stock: number;
  sortOrder: number;
  isActive: boolean;
}

interface ProductSizeItem {
  id?: string;
  name: string;
  stock: number;
  sortOrder: number;
  isActive: boolean;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [hasOffers, setHasOffers] = useState(false);
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [hasColors, setHasColors] = useState(false);
  const [colors, setColors] = useState<ProductColorItem[]>([]);
  const [hasSizes, setHasSizes] = useState(false);
  const [sizes, setSizes] = useState<ProductSizeItem[]>([]);

  useEffect(() => {
    fetch(`/api/products/${params.id}/meta`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data: ProductMeta) => {
        setName(data.name);
        setSlug(data.slug);
        setShortDescription(data.shortDescription || "");
        setFullDescription(data.fullDescription || "");
        setPrice(String(data.price));
        setInitialStock(String(data.initialStock ?? ""));
        setHasOffers(data.hasOffers || false);
        setOffers(data.offers || []);
        setHasColors(data.hasColors || false);
        setColors(data.colors || []);
        setHasSizes(data.hasSizes || false);
        setSizes(data.sizes || []);
        setLoading(false);

        fetch(`/api/products/${params.id}`)
          .then((r) => r.json())
          .then((full) => {
            try {
              const parsed = JSON.parse(full.images);
              setImages(Array.isArray(parsed) ? parsed : []);
            } catch {
              setImages([]);
            }
            setImagesLoading(false);
          })
          .catch(() => setImagesLoading(false));
      })
      .catch(() => {
        alert("المنتج غير موجود");
        router.push("/products");
      });
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!hasOffers && !price)) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          shortDescription,
          fullDescription,
          price: parseFloat(price),
          initialStock: initialStock ? parseInt(initialStock) : undefined,
          images: JSON.stringify(images),
          hasOffers,
          hasColors,
          hasSizes,
        }),
      });

      if (res.ok) {
        if (hasOffers) {
          await fetch(`/api/products/${params.id}/offers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offers: offers.map((o, i) => ({ ...o, sortOrder: i })) }),
          });
        }
        if (hasColors) {
          await fetch(`/api/products/${params.id}/colors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ colors: colors.map((c, i) => ({ ...c, sortOrder: i })) }),
          });
        }
        if (hasSizes) {
          await fetch(`/api/products/${params.id}/sizes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sizes: sizes.map((s, i) => ({ ...s, sortOrder: i })) }),
          });
        }
        router.push("/products");
      } else {
        alert("حدث خطأ أثناء الحفظ");
      }
    } catch {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${params.id}`, { method: "DELETE" });
      if (res.ok) router.push("/products");
    } catch {
      alert("حدث خطأ أثناء الحذف");
    } finally {
      setDeleting(false);
    }
  };

  const handleColorImageUpload = (idx: number, imageData: string) => {
    const next = [...colors];
    next[idx] = { ...next[idx], image: imageData };
    setColors(next);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Header title="تعديل المنتج" description="جاري التحميل..." />
        <div className="p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                  <div className="h-10 bg-muted rounded w-full mb-3" />
                  <div className="h-10 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header
        title="تعديل المنتج"
        description={name}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
            <Link href="/products">
              <Button variant="outline" size="sm">
                <ArrowRight className="h-4 w-4 ml-1" />
                رجوع
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 md:p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">اسم المنتج</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">الرابط (Slug)</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">وصف قصير</label>
                <Input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">السعر (دج)</label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={hasOffers}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المخزون الأولي</label>
                <Input
                  type="number"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الوصف التفصيلي</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={fullDescription}
                onChange={setFullDescription}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الصور</CardTitle>
            </CardHeader>
            <CardContent>
              {imagesLoading ? (
                <div className="flex items-center gap-3 p-6 border-2 border-dashed rounded-xl bg-muted/30">
                  <div className="h-20 w-20 bg-muted rounded-lg animate-pulse" />
                  <div className="h-20 w-20 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ) : (
                <ImageUpload
                  value={images}
                  onChange={setImages}
                  maxImages={10}
                />
              )}
            </CardContent>
          </Card>

          {/* Offers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">العروض</CardTitle>
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

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                الألوان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasColors}
                  onChange={(e) => setHasColors(e.target.checked)}
                  className="h-5 w-5 rounded"
                />
                <div>
                  <p className="font-medium">تفعيل الألوان</p>
                  <p className="text-sm text-muted-foreground">إضافة خيارات ألوان للمنتج</p>
                </div>
              </label>
              {hasColors && (
                <div className="space-y-3 mt-4">
                  {colors.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                      <div className="shrink-0">
                        {color.image ? (
                          <div className="relative group">
                            <img
                              src={color.image}
                              alt={color.name}
                              className="h-14 w-14 rounded-lg object-cover border"
                            />
                            <button
                              type="button"
                              onClick={() => handleColorImageUpload(idx, "")}
                              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center h-14 w-14 rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  handleColorImageUpload(idx, ev.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            <Palette className="h-5 w-5 text-muted-foreground" />
                          </label>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={color.name}
                          onChange={(e) => {
                            const next = [...colors];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setColors(next);
                          }}
                          placeholder="اسم اللون"
                        />
                        <Input
                          type="number"
                          value={color.stock || ""}
                          onChange={(e) => {
                            const next = [...colors];
                            next[idx] = { ...next[idx], stock: parseInt(e.target.value) || 0 };
                            setColors(next);
                          }}
                          placeholder="الكمية"
                          min="0"
                          className="h-9 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setColors(colors.filter((_, i) => i !== idx))}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setColors([...colors, { name: "", image: "", stock: 0, sortOrder: colors.length, isActive: true }])}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة لون
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sizes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                المقاسات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSizes}
                  onChange={(e) => setHasSizes(e.target.checked)}
                  className="h-5 w-5 rounded"
                />
                <div>
                  <p className="font-medium">تفعيل المقاسات</p>
                  <p className="text-sm text-muted-foreground">إضافة خيارات مقاسات للمنتج</p>
                </div>
              </label>
              {hasSizes && (
                <div className="space-y-3 mt-4">
                  {sizes.map((size, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={size.name}
                          onChange={(e) => {
                            const next = [...sizes];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setSizes(next);
                          }}
                          placeholder="اسم المقاس (مثلاً: S, M, L, XL)"
                        />
                        <Input
                          type="number"
                          value={size.stock || ""}
                          onChange={(e) => {
                            const next = [...sizes];
                            next[idx] = { ...next[idx], stock: parseInt(e.target.value) || 0 };
                            setSizes(next);
                          }}
                          placeholder="الكمية"
                          min="0"
                          className="h-9 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSizes(sizes.filter((_, i) => i !== idx))}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSizes([...sizes, { name: "", stock: 0, sortOrder: sizes.length, isActive: true }])}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مقاس
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Link href="/products">
              <Button type="button" variant="outline">إلغاء</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
