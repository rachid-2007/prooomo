"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { WILAYAS_DATA, SHIPPING_PRICES, UNAVAILABLE_WILAYAS } from "@/lib/constants";
import { useOffices } from "@/hooks/use-offices";
import {
  X,
  Save,
  Loader2,
  Minus,
  Plus,
  Home,
  Store,
  Package,
} from "lucide-react";

const AVAILABLE_WILAYAS = WILAYAS_DATA.filter((w) => !UNAVAILABLE_WILAYAS.includes(w.code));

interface Product {
  id: string;
  name: string;
  price: number;
  purchasePrice: number;
  imageUrl?: string | null;
}

interface QuickOrderFormProps {
  open: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export function QuickOrderForm({ open, onClose, onOrderCreated }: QuickOrderFormProps) {
  const { offices: OFFICES_DATA } = useOffices();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [baladya, setBaladya] = useState("");
  const [baladyas, setBaladyas] = useState<{ id: string; name: string }[]>([]);
  const [loadingBaladyas, setLoadingBaladyas] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<"home" | "office">("home");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [productColors, setProductColors] = useState<{ id: string; name: string }[]>([]);
  const [productSizes, setProductSizes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/products?active=true")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.products || []);
        setProducts(list.map((p: any) => {
          let imageUrl = null;
          try { const imgs = JSON.parse(p.images || "[]"); imageUrl = imgs[0] || null; } catch {}
          return { id: p.id, name: p.name, price: p.price, purchasePrice: p.purchasePrice || 0, imageUrl };
        }));
      })
      .catch(() => {});
  }, [open]);

  // Fetch colors/sizes when product changes
  useEffect(() => {
    if (!selectedProductId) {
      setProductColors([]);
      setProductSizes([]);
      return;
    }
    fetch(`/api/products/${selectedProductId}`)
      .then((r) => r.json())
      .then((data) => {
        setProductColors(data?.colors || []);
        setProductSizes(data?.sizes || []);
      })
      .catch(() => {
        setProductColors([]);
        setProductSizes([]);
      });
  }, [selectedProductId]);

  useEffect(() => {
    if (!wilaya) { setBaladyas([]); setBaladya(""); setSelectedOffice(""); return; }
    setLoadingBaladyas(true);
    fetch(`/api/wilayas?code=${wilaya}`)
      .then((r) => r.json())
      .then((data) => {
        const w = Array.isArray(data) ? data[0] : null;
        setBaladyas(w?.baladyas || []);
        setLoadingBaladyas(false);
      })
      .catch(() => { setBaladyas([]); setLoadingBaladyas(false); });
  }, [wilaya]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const prices = SHIPPING_PRICES[wilaya] || { home: 500, office: 350 };
  const isOfficeDisabled = prices.office === 0;
  const shippingPrice = shippingMethod === "home" ? prices.home : prices.office;
  const productTotal = selectedProduct ? selectedProduct.price * quantity : 0;
  const totalPrice = productTotal + shippingPrice;
  const officeCommunes = wilaya ? (OFFICES_DATA[wilaya] || []).sort((a, b) => a.localeCompare(b)) : [];

  const canSave = selectedProductId && name && phone && wilaya && (shippingMethod === "office" ? selectedOffice : baladya);

  const handleSave = async () => {
    if (!canSave || !selectedProduct) return;
    setSaving(true);
    try {
      const wilayaObj = AVAILABLE_WILAYAS.find((w) => w.code === wilaya);
      const wilayaRes = await fetch(`/api/wilayas?code=${wilaya}`);
      const wilayas = await wilayaRes.json();
      const wilayaDb = Array.isArray(wilayas) ? wilayas.find((w: any) => w.code === wilaya) : null;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          productId: selectedProductId,
          quantity,
          productPrice: selectedProduct.price,
          purchasePrice: selectedProduct.purchasePrice,
          shippingPrice,
          totalPrice,
          wilayaId: wilayaDb?.id || null,
          baladyaId: shippingMethod === "home" ? baladya : null,
          customerAddress: shippingMethod === "office" ? selectedOffice : null,
            deliveryMethod: shippingMethod,
            colorId: selectedColor || null,
            sizeId: selectedSize || null,
            adminCreated: true,
          }),
      });
      if (!res.ok) throw new Error("Failed");
      setName(""); setPhone(""); setSelectedProductId(""); setQuantity(1); setWilaya(""); setBaladya(""); setSelectedOffice(""); setSelectedColor(""); setSelectedSize("");
      onOrderCreated();
      onClose();
    } catch {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-card rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-lg font-bold">طلب سريع</h3>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-70px)] px-5 py-4 space-y-4">
            {/* Product Picker */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-muted-foreground">المنتج</p>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={cn(
                      "p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                      selectedProductId === product.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                    )}
                  >
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-center truncate w-full">{product.name}</span>
                    <span className="text-[10px] text-primary font-bold">{product.price.toLocaleString()} دج</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            {productColors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">اللون</p>
                <div className="flex gap-2 flex-wrap">
                  {productColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(selectedColor === color.id ? "" : color.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-all",
                        selectedColor === color.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {productSizes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">المقاس</p>
                <div className="flex gap-2 flex-wrap">
                  {productSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(selectedSize === size.id ? "" : size.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-all",
                        selectedSize === size.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            {selectedProduct && (
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-xl font-black w-10 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="h-10 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم"
                className="h-12 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              <input type="tel" value={phone} onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); if (val.length <= 10) setPhone(val); }} placeholder="رقم هاتف" maxLength={10} dir="ltr"
                className="h-12 px-3 rounded-xl border border-border bg-background text-sm font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
            </div>

            {/* Wilaya */}
            <select value={wilaya} onChange={(e) => setWilaya(e.target.value)}
              className="w-full h-12 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none">
              <option value="">الولاية</option>
              {AVAILABLE_WILAYAS.map((w) => (
                <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
              ))}
            </select>

            {/* Baladya / Office */}
            {shippingMethod === "home" ? (
              <select value={baladya} onChange={(e) => setBaladya(e.target.value)} disabled={!wilaya || loadingBaladyas}
                className="w-full h-12 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none disabled:opacity-50">
                <option value="">{!wilaya ? "الولاية أولاً" : loadingBaladyas ? "جاري التحميل..." : "البلدية"}</option>
                {[...baladyas].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            ) : (
              <select value={selectedOffice} onChange={(e) => setSelectedOffice(e.target.value)} disabled={!wilaya || officeCommunes.length === 0}
                className="w-full h-12 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none disabled:opacity-50">
                <option value="">{!wilaya ? "الولاية أولاً" : officeCommunes.length === 0 ? "لا توجد مكاتب" : "بلديات بها مكتب"}</option>
                {officeCommunes.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}

            {/* Shipping Method */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShippingMethod("home")}
                className={cn("p-3 rounded-xl border-2 transition-all", shippingMethod === "home" ? "border-primary bg-primary/5" : "border-border")}>
                <div className="flex items-center gap-2">
                  <Home className={cn("h-5 w-5", shippingMethod === "home" ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-right"><p className="text-sm font-bold">المنزل</p><p className="text-xs text-muted-foreground">{prices.home} دج</p></div>
                </div>
              </button>
              <button type="button" onClick={() => setShippingMethod("office")} disabled={isOfficeDisabled}
                className={cn("p-3 rounded-xl border-2 transition-all", isOfficeDisabled ? "border-border opacity-50 cursor-not-allowed" : shippingMethod === "office" ? "border-primary bg-primary/5" : "border-border")}>
                <div className="flex items-center gap-2">
                  <Store className={cn("h-5 w-5", shippingMethod === "office" && !isOfficeDisabled ? "text-primary" : "text-muted-foreground")} />
                  <div className="text-right"><p className="text-sm font-bold">{isOfficeDisabled ? "غير متوفر" : "المكتب"}</p><p className="text-xs text-muted-foreground">{isOfficeDisabled ? "—" : `${prices.office} دج`}</p></div>
                </div>
              </button>
            </div>

            {/* Price Summary */}
            {selectedProduct && (
              <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedProduct.name} ({quantity}×)</span>
                  <span className="font-semibold">{productTotal.toLocaleString()} دج</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الشحن ({shippingMethod === "home" ? "منزل" : "مكتب"})</span>
                  <span className="font-semibold">{shippingPrice.toLocaleString()} دج</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between font-bold">
                  <span>المجموع</span>
                  <span className="text-primary">{totalPrice.toLocaleString()} دج</span>
                </div>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-border">
            <button onClick={handleSave} disabled={saving || !canSave}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "جاري الحفظ..." : "حفظ الطلب"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
