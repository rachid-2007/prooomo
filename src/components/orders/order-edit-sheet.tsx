"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { OrderWithRelations } from "@/types";
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
  Trash2,
  Package,
  AlertTriangle,
} from "lucide-react";

const AVAILABLE_WILAYAS = WILAYAS_DATA.filter((w) => !UNAVAILABLE_WILAYAS.includes(w.code));

interface OrderItemData {
  productId: string;
  productName: string;
  quantity: number;
  productPrice: number;
  purchasePrice: number;
  offerId?: string | null;
  imageUrl?: string | null;
}

interface OrderEditSheetProps {
  order: OrderWithRelations | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: OrderWithRelations) => void;
}

export function OrderEditSheet({ order, open, onClose, onSave }: OrderEditSheetProps) {
  const { offices: OFFICES_DATA } = useOffices();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [baladya, setBaladya] = useState("");
  const [baladyas, setBaladyas] = useState<{ id: string; name: string; arabicName: string | null }[]>([]);
  const [loadingBaladyas, setLoadingBaladyas] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<"home" | "office">("home");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [prevBaladya, setPrevBaladya] = useState("");
  const [shakeOffice, setShakeOffice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productOffers, setProductOffers] = useState<{ id: string; name: string; quantity: number; price: number }[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [productColors, setProductColors] = useState<{ id: string; name: string }[]>([]);
  const [productSizes, setProductSizes] = useState<{ id: string; name: string }[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);

  const [orderItems, setOrderItems] = useState<OrderItemData[]>([]);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; price: number; purchasePrice: number; imageUrl?: string | null }[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const [phoneDuplicates, setPhoneDuplicates] = useState<any[]>([]);
  const [checkingPhone, setCheckingPhone] = useState(false);

  useEffect(() => {
    fetch("/api/products?active=true")
      .then((r) => r.json())
      .then((data) => {
        const products = Array.isArray(data) ? data : (data.products || []);
        setAllProducts(products.map((p: any) => {
          let imageUrl = null;
          try { const imgs = JSON.parse(p.images || "[]"); imageUrl = imgs[0] || null; } catch {}
          return { id: p.id, name: p.name, price: p.price, purchasePrice: p.purchasePrice || 0, imageUrl };
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!order || !open) return;
    setSelectedOfferId(order.offerId || null);
    setQuantity(order.quantity);
    setSelectedColorId((order as any).colorId || null);
    setSelectedSizeId((order as any).sizeId || null);
    if (order.productId) {
      fetch(`/api/products/${order.productId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.hasOffers && data.offers?.length > 0) {
            setProductOffers(data.offers);
            if (!order.offerId) {
              setSelectedOfferId(data.offers[0].id);
              setQuantity(data.offers[0].quantity);
            }
          } else {
            setProductOffers([]);
          }
          setProductColors(data?.colors || []);
          setProductSizes(data?.sizes || []);
        })
        .catch(() => { setProductOffers([]); setProductColors([]); setProductSizes([]); });
    }
  }, [order, open]);

  useEffect(() => {
    if (!wilaya) {
      setBaladyas([]);
      setBaladya("");
      setSelectedOffice("");
      return;
    }
    setLoadingBaladyas(true);
    fetch(`/api/wilayas?code=${wilaya}`)
      .then((r) => r.json())
      .then((data) => {
        const w = Array.isArray(data) ? data[0] : null;
        const loaded = w?.baladyas || [];
        setBaladyas(loaded);
        setLoadingBaladyas(false);
        if (order && (order as any)._isAbandoned && loaded.length > 0) {
          const orderBaladyaName = (order as any).baladyaName;
          const shipping = (order as any).deliveryMethod;
          if (shipping === "home" && orderBaladyaName) {
            const match = loaded.find((b: any) => b.name === orderBaladyaName);
            if (match) setBaladya(match.id);
          }
        }
      })
      .catch(() => { setBaladyas([]); setLoadingBaladyas(false); });
  }, [wilaya]);

  useEffect(() => {
    if (!order || !open) return;
    setName(order.customerName);
    setPhone(order.customerPhone);
    setQuantity(order.quantity);
    const isAbandoned = (order as any)._isAbandoned === true;
    setWilaya(order.wilaya?.code || (order as any).wilayaCode || "");
    const isOffice = isAbandoned ? (order as any).deliveryMethod === "office" : !!order.customerAddress;
    setShippingMethod(isOffice ? "office" : "home");
    if (isOffice) {
      setSelectedOffice(isAbandoned ? (order as any).baladyaName || "" : order.customerAddress || "");
      setBaladya("");
      setPrevBaladya("");
    } else if (isAbandoned ? (order as any).baladyaName : order.baladyaId) {
      if (!isAbandoned) setBaladya(order.baladyaId || "");
      setSelectedOffice("");
      setPrevBaladya("");
    }

    if (order.orderItems && order.orderItems.length > 0) {
      setOrderItems(order.orderItems.map((item: any) => {
        let imageUrl = null;
        try { const imgs = JSON.parse(item.product?.images || "[]"); imageUrl = imgs[0] || null; } catch {}
        return {
          productId: item.productId,
          productName: item.product?.name || "منتج",
          quantity: item.quantity,
          productPrice: item.productPrice,
          purchasePrice: item.purchasePrice || 0,
          offerId: item.offerId,
          imageUrl,
        };
      }));
    } else if (order.productId) {
      let imageUrl = null;
      try { const imgs = JSON.parse(order.product?.images || "[]"); imageUrl = imgs[0] || null; } catch {}
      setOrderItems([{
        productId: order.productId,
        productName: order.product?.name || "منتج",
        quantity: order.quantity,
        productPrice: order.productPrice,
        purchasePrice: order.purchasePrice || 0,
        offerId: order.offerId,
        imageUrl,
      }]);
    } else {
      setOrderItems([]);
    }
  }, [order, open]);

  useEffect(() => {
    if (!phone || phone.length < 5 || !open) {
      setPhoneDuplicates([]);
      return;
    }
    const timer = setTimeout(() => {
      setCheckingPhone(true);
      const excludeId = order?.id || "";
      fetch(`/api/orders/check-phone?phone=${phone}&excludeOrderId=${excludeId}`)
        .then((r) => r.json())
        .then((data) => {
          setPhoneDuplicates(data.duplicates || []);
        })
        .catch(() => { setPhoneDuplicates([]); })
        .finally(() => setCheckingPhone(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [phone, open, order?.id]);

  if (!order || !open) return null;

  const prices = SHIPPING_PRICES[wilaya] || { home: 500, office: 350 };
  const isOfficeDisabled = prices.office === 0;
  const shippingPrice = shippingMethod === "home" ? prices.home : prices.office;
  const activeOffer = productOffers.find((o) => o.id === selectedOfferId);
  const officeCommunes = wilaya ? (OFFICES_DATA[wilaya] || []).sort((a, b) => a.localeCompare(b)) : [];
  const currentBaladyaName = baladyas.find((b) => b.id === baladya)?.name || "";

  const productTotal = orderItems.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
  const totalPrice = productTotal + shippingPrice;

  const handleShippingChange = (method: "home" | "office") => {
    if (method === shippingMethod) return;
    if (isOfficeDisabled && method === "office") return;
    setShippingMethod(method);
    if (method === "office") {
      setPrevBaladya(baladya);
      if (currentBaladyaName && officeCommunes.includes(currentBaladyaName)) {
        setSelectedOffice(currentBaladyaName);
        setBaladya("");
      } else {
        if (officeCommunes.length === 0) { setShakeOffice(true); setTimeout(() => setShakeOffice(false), 600); }
        setSelectedOffice("");
        setBaladya("");
      }
    } else {
      const canRestore = prevBaladya && baladyas.some((b) => b.id === prevBaladya);
      setBaladya(canRestore ? prevBaladya : "");
      setSelectedOffice("");
      setPrevBaladya("");
    }
  };

  const addProduct = (product: { id: string; name: string; price: number; purchasePrice: number; imageUrl?: string | null }) => {
    const existing = orderItems.find((i) => i.productId === product.id);
    if (existing) {
      setOrderItems(orderItems.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setOrderItems([...orderItems, { productId: product.id, productName: product.name, quantity: 1, productPrice: product.price, purchasePrice: product.purchasePrice || 0, imageUrl: product.imageUrl }]);
    }
    setShowProductPicker(false);
  };

  const removeProduct = (productId: string) => {
    setOrderItems(orderItems.filter((i) => i.productId !== productId));
  };

  const updateItemQuantity = (productId: string, qty: number) => {
    if (qty < 1) return removeProduct(productId);
    setOrderItems(orderItems.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const canSave = wilaya && (shippingMethod === "office" ? selectedOffice : (baladya || ((order as any)._isAbandoned && (order as any).baladyaName))) && orderItems.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const isAbandoned = (order as any)._isAbandoned === true;

      if (isAbandoned) {
        const wilayaObj = AVAILABLE_WILAYAS.find((w) => w.code === wilaya);
        const primaryItem = orderItems[0];
        const res = await fetch(`/api/orders/abandoned/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: name,
            customerPhone: phone,
            quantity: primaryItem?.quantity || quantity,
            wilayaCode: wilaya || null,
            wilayaName: wilayaObj?.name || null,
            baladyaName: shippingMethod === "office" ? selectedOffice : baladyas.find((b) => b.id === baladya)?.name || null,
            deliveryMethod: shippingMethod,
            productPrice: primaryItem?.productPrice || order.productPrice,
            shippingPrice,
            totalPrice,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updatedData = await res.json();
        onSave({ ...order, ...updatedData, _isAbandoned: true } as any);
        onClose();
        return;
      }

      let wilayaId = order.wilayaId;
      let baladyaId = order.baladyaId;
      let customerAddress: string | null = order.customerAddress;
      if (wilaya) {
        const wilayaRes = await fetch(`/api/wilayas?code=${wilaya}`);
        const wilayas = await wilayaRes.json();
        const wilayaObj = Array.isArray(wilayas) ? wilayas.find((w: any) => w.code === wilaya) : null;
        if (wilayaObj) {
          wilayaId = wilayaObj.id;
          if (shippingMethod === "office") {
            baladyaId = null;
            customerAddress = selectedOffice || null;
          } else if (shippingMethod === "home" && baladya) {
            baladyaId = baladya;
            customerAddress = null;
          } else {
            baladyaId = null;
            customerAddress = null;
          }
        }
      }

      const primaryItem = orderItems[0];
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          quantity: primaryItem?.quantity || quantity,
          shippingPrice,
          totalPrice,
          wilayaId,
          baladyaId,
          customerAddress,
          offerId: selectedOfferId,
          colorId: selectedColorId,
          sizeId: selectedSizeId,
          productPrice: primaryItem?.productPrice || order.productPrice,
          items: orderItems.length > 1 ? orderItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            productPrice: i.productPrice,
            purchasePrice: i.purchasePrice,
            offerId: i.offerId,
            colorId: selectedColorId,
            sizeId: selectedSizeId,
          })) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-card rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="text-lg font-bold">تعديل الطلب</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.orderNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="overflow-y-auto max-h-[calc(85vh-70px)] px-5 py-4 space-y-4">
            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم الكامل"
                className="h-12 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); if (val.length <= 10) setPhone(val); }}
                  placeholder="رقم هاتف"
                  maxLength={10}
                  dir="ltr"
                  className="h-12 px-3 rounded-xl border border-border bg-background text-sm font-mono text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                {phoneDuplicates.length > 0 && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-[10px] font-bold">طلب مكرر ({phoneDuplicates.length})</span>
                    </div>
                    {phoneDuplicates.slice(0, 2).map((d) => (
                      <p key={d.id} className="text-[9px] text-amber-600 dark:text-amber-500 mt-0.5 font-mono">
                        {d.orderNumber} - {d.customerName}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Wilaya & Baladya/Office */}
            <div className="grid grid-cols-2 gap-3">
              <select
                value={wilaya}
                onChange={(e) => setWilaya(e.target.value)}
                className="w-full h-12 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none"
              >
                <option value="">الولاية</option>
                {AVAILABLE_WILAYAS.map((w) => (
                  <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                ))}
              </select>

              {shippingMethod === "home" ? (
                <select
                  value={baladya}
                  onChange={(e) => setBaladya(e.target.value)}
                  disabled={!wilaya || loadingBaladyas}
                  className="w-full h-12 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none disabled:opacity-50"
                >
                  <option value="">{!wilaya ? "الولاية أولاً" : loadingBaladyas ? "جاري التحميل..." : "البلدية"}</option>
                  {[...baladyas].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <div>
                  <select
                    value={selectedOffice}
                    onChange={(e) => setSelectedOffice(e.target.value)}
                    disabled={!wilaya || officeCommunes.length === 0}
                    className={cn(
                      "w-full h-12 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none disabled:opacity-50",
                      shakeOffice ? "border-red-500 shake" : "border-border"
                    )}
                  >
                    <option value="">{!wilaya ? "الولاية أولاً" : officeCommunes.length === 0 ? "لا توجد مكاتب" : "بلديات بها مكتب"}</option>
                    {officeCommunes.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {wilaya && officeCommunes.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">لا توجد مكاتب توصيل في هذه الولاية</p>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Method */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleShippingChange("home")}
                className={cn("p-3 rounded-xl border-2 transition-all", shippingMethod === "home" ? "border-primary bg-primary/5" : "border-border hover:border-border/80")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className={cn("h-5 w-5", shippingMethod === "home" ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-right"><p className="text-sm font-bold">المنزل</p><p className="text-xs text-muted-foreground">{prices.home} دج</p></div>
                  </div>
                  {shippingMethod === "home" && <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-white" /></div>}
                </div>
              </button>
              <button type="button" onClick={() => handleShippingChange("office")} disabled={isOfficeDisabled}
                className={cn("p-3 rounded-xl border-2 transition-all", isOfficeDisabled ? "border-border opacity-50 cursor-not-allowed" : shippingMethod === "office" ? "border-primary bg-primary/5" : "border-border hover:border-border/80")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className={cn("h-5 w-5", shippingMethod === "office" && !isOfficeDisabled ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-right"><p className="text-sm font-bold">{isOfficeDisabled ? "غير متوفر" : "المكتب"}</p><p className="text-xs text-muted-foreground">{isOfficeDisabled ? "—" : `${prices.office} دج`}</p></div>
                  </div>
                  {shippingMethod === "office" && !isOfficeDisabled && <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-white" /></div>}
                </div>
              </button>
            </div>

            {/* Offer Selection */}
            {productOffers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">العرض</p>
                <div className="space-y-2">
                  {productOffers.map((offer) => {
                    const isSelected = selectedOfferId === offer.id;
                    return (
                      <button key={offer.id} type="button"
                        onClick={() => { if (isSelected) return; setSelectedOfferId(offer.id); setQuantity(offer.quantity); setOrderItems(orderItems.map((i, idx) => idx === 0 ? { ...i, quantity: offer.quantity, productPrice: offer.price / offer.quantity } : i)); }}
                        className={cn("w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between", isSelected ? "border-primary bg-primary/5" : "border-border hover:border-border/80")}>
                        <span className="font-bold text-sm">{offer.quantity} قطع</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{offer.price.toLocaleString()} دج</span>
                          {isSelected && <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-white" /></div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {productColors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">اللون</p>
                <div className="flex gap-2 flex-wrap">
                  {productColors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColorId(selectedColorId === color.id ? null : color.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-all",
                        selectedColorId === color.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
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
                      type="button"
                      onClick={() => setSelectedSizeId(selectedSizeId === size.id ? null : size.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition-all",
                        selectedSizeId === size.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                      )}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Order Items */}
            {orderItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">المنتجات</p>
                <div className="space-y-1.5">
                  {orderItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="h-8 w-8 rounded-lg object-cover ring-1 ring-border flex-shrink-0" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.productName}</p>
                        <p className="text-[10px] text-muted-foreground">{item.productPrice.toLocaleString()} دج × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-6 w-6 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-xs disabled:opacity-30 disabled:cursor-not-allowed">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                        <button onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                          className="h-6 w-6 rounded-lg border border-border flex items-center justify-center hover:bg-muted text-xs">
                          <Plus className="h-3 w-3" />
                        </button>
                        {orderItems.length > 1 && (
                          <button onClick={() => removeProduct(item.productId)}
                            className="h-6 w-6 rounded-lg border border-red-200 dark:border-red-800 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 ml-1">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowProductPicker(!showProductPicker)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  إضافة منتج
                </button>
                {showProductPicker && (
                  <div className="rounded-xl border border-border bg-card max-h-48 overflow-y-auto">
                    {allProducts.filter((p) => !orderItems.find((i) => i.productId === p.id)).map((product) => (
                      <button key={product.id} onClick={() => addProduct(product)}
                        className="w-full px-3 py-2.5 text-right text-xs font-bold hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-2">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-8 w-8 rounded-lg object-cover ring-1 ring-border flex-shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center ring-1 ring-border flex-shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        )}
                        <span className="flex-1 truncate">{product.name}</span>
                        <span className="text-muted-foreground flex-shrink-0">{product.price.toLocaleString()} دج</span>
                      </button>
                    ))}
                    {allProducts.filter((p) => !orderItems.find((i) => i.productId === p.id)).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">لا توجد منتجات أخرى</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Price Summary */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
              {orderItems.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.productName} ({item.quantity}×)</span>
                  <span className="font-semibold">{(item.productPrice * item.quantity).toLocaleString()} دج</span>
                </div>
              ))}
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
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border">
            <button onClick={handleSave} disabled={saving || !canSave}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
