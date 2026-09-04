"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Phone,
  Home,
  Store,
  Minus,
  Plus,
  Send,
  PhoneCall,
  Loader2,
  Check,
  Package,
  Truck,
} from "lucide-react";
import { WILAYAS_DATA, SHIPPING_PRICES, UNAVAILABLE_WILAYAS } from "@/lib/constants";
import { useOffices } from "@/hooks/use-offices";
import { useFacebook } from "@/components/facebook/pixel";
import { lighten } from "@/lib/colors";

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  price: number;
  imageCount: number;
  hasOffers: boolean;
  offers: { id: string; name: string; quantity: number; price: number; sortOrder: number }[];
  hasColors: boolean;
  colors: { id: string; name: string; image: string; sortOrder: number }[];
  hasSizes: boolean;
  sizes: { id: string; name: string; sortOrder: number }[];
}

const AVAILABLE_WILAYAS = WILAYAS_DATA.filter((w) => !UNAVAILABLE_WILAYAS.includes(w.code));

export default function StoreClient({ productJson, colorsJson }: { productJson: string; colorsJson: string }) {
  const { offices: OFFICES_DATA } = useOffices();
  const [product, setProduct] = useState<Product | null>(() => {
    try { return JSON.parse(productJson); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [baladya, setBaladya] = useState("");
  const [baladyas, setBaladyas] = useState<{ id: string; name: string; arabicName: string | null }[]>([]);
  const [loadingBaladyas, setLoadingBaladyas] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<"home" | "office">("home");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [prevBaladya, setPrevBaladya] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusStep, setFocusStep] = useState<"name" | "phone" | "wilaya" | "baladya" | "submit">("name");
  const formRef = useRef<HTMLDivElement>(null);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);
  const [formColors, setFormColors] = useState(() => {
    try { return JSON.parse(colorsJson); } catch { return { primary: "#7c3aed", secondary: "#2563eb", background: "#ffffff", text: "#1f2937", accent: "#f59e0b" }; }
  });
  const [fbConfig, setFbConfig] = useState<any>(null);

  const pc = formColors.primary;
  const primaryBg = lighten(pc, 0.92);
  const primaryBgHover = lighten(pc, 0.88);
  const primaryBorderHover = lighten(pc, 0.6);
  const { track } = useFacebook(fbConfig);
  const [dbPrices, setDbPrices] = useState<Record<string, { home: number; office: number }>>({});
  const [dbOffices, setDbOffices] = useState<Record<string, string[]>>({});
  const abandonedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abandonedSentRef = useRef(false);

  const isNameValid = customerName.trim().length >= 2;
  const isPhoneValid = /^(0[567]\d{8})$/.test(customerPhone);
  const isWilayaValid = wilaya !== "";
  const isBaladyaValid = shippingMethod === "office" ? selectedOffice !== "" : baladya !== "";

  useEffect(() => {
    if (!isNameValid) setFocusStep("name");
    else if (!isPhoneValid) setFocusStep("phone");
    else if (!isWilayaValid) setFocusStep("wilaya");
    else if (!isBaladyaValid) setFocusStep("baladya");
    else setFocusStep("submit");
  }, [isNameValid, isPhoneValid, isWilayaValid, isBaladyaValid]);

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    if (submitted) return;
    const handleScroll = () => {
      if (!formRef.current) return;
      const rect = formRef.current.getBoundingClientRect();
      const formTop = rect.top;
      const formBottom = rect.bottom;
      const windowHeight = window.innerHeight;
      const formFullyVisible = formTop >= 0 && formBottom <= windowHeight;
      setShowFloatingBtn(!formFullyVisible);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [submitted]);

  // Product already loaded from server — track ViewContent
  useEffect(() => {
    if (product) {
      fetch("/api/facebook/settings").then((r) => r.json()).then((cfg) => {
        setFbConfig({
          pixelId: cfg.fb_pixel_id || "",
          accessToken: cfg.fb_access_token || "",
          testEventCode: cfg.fb_test_event_code || "",
          pixelEnabled: cfg.fb_pixel_enabled === "true",
          capiEnabled: cfg.fb_capi_enabled === "true",
        });
      }).catch(() => {});
    }
  }, [product?.id]);

  // Load settings (prices + offices) in BACKGROUND — colors already from server
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((settings) => {
      if (Array.isArray(settings)) {
        const pricesSetting = settings.find((s: any) => s.key === "shipping_prices");
        if (pricesSetting) {
          try { setDbPrices(JSON.parse(pricesSetting.value)); } catch {}
        }
        const officesSetting = settings.find((s: any) => s.key === "offices");
        if (officesSetting) {
          try {
            const parsed = JSON.parse(officesSetting.value);
            const grouped: Record<string, string[]> = {};
            parsed.forEach((o: any) => {
              if (!grouped[o.wilayaCode]) grouped[o.wilayaCode] = [];
              grouped[o.wilayaCode].push(o.name);
            });
            setDbOffices(grouped);
          } catch {}
        }
      }
    }).catch(() => {});
  }, []);

  const getFieldStyle = (step: "name" | "phone" | "wilaya" | "baladya"): React.CSSProperties => {
    if (focusStep === step) return { borderColor: "#ef4444", boxShadow: "0 0 0 1px #ef4444" };
    return {};
  };

  const getFieldClass = (step: "name" | "phone" | "wilaya" | "baladya") => {
    return focusStep === step ? "shake" : "";
  };

  // Track ViewContent when product and FB config are ready
  useEffect(() => {
    if (product && fbConfig) {
      track("ViewContent", {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: product.price,
        currency: "DZD",
      });
    }
  }, [product, fbConfig, track]);

  // Record page view
  useEffect(() => {
    if (product) {
      fetch("/api/pageviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => {});
    }
  }, [product]);

  useEffect(() => {
    if (!wilaya) {
      setBaladyas([]);
      setBaladya("");
      setSelectedOffice("");
      return;
    }
    setSelectedOffice("");
    setLoadingBaladyas(true);
    fetch(`/api/wilayas?code=${wilaya}`)
      .then((r) => r.json())
      .then((data) => {
        const w = Array.isArray(data) ? data[0] : null;
        setBaladyas(w?.baladyas || []);
        setBaladya("");
        setLoadingBaladyas(false);
      })
      .catch(() => {
        setBaladyas([]);
        setLoadingBaladyas(false);
      });
  }, [wilaya]);

  const images: string[] = useMemo(() => {
    if (!product) return ["/placeholder.svg"];
    if (product.imageCount === 0) return ["/placeholder.svg"];
    return Array.from({ length: product.imageCount }, (_, i) => `/api/products/${product.id}/image/${i}?size=800`);
  }, [product]);
  const hasWilaya = wilaya !== "";
  const prices = hasWilaya ? (dbPrices[wilaya] || SHIPPING_PRICES[wilaya] || { home: 750, office: 400 }) : { home: 0, office: 0 };
  const isOfficeDisabled = !hasWilaya || prices.office === 0;
  const shippingPrice = hasWilaya ? (shippingMethod === "home" ? prices.home : prices.office) : 0;
  const activeOffer = product?.hasOffers ? product.offers.find((o) => o.id === selectedOffer) : null;
  const effectiveQuantity = activeOffer ? activeOffer.quantity : quantity;
  const productTotal = activeOffer ? activeOffer.price : (product?.price || 0) * quantity;
  const totalPrice = productTotal + shippingPrice;
  const selectedWilaya = AVAILABLE_WILAYAS.find((w) => w.code === wilaya);
  const officeList = dbOffices[wilaya] || [];
  const constOfficeList = OFFICES_DATA[wilaya] || [];
  const allOffices = [...new Set([...officeList, ...constOfficeList])].sort((a: string, b: string) => a.localeCompare(b));

  // Abandoned order tracking
  const sendAbandoned = useCallback((reason: string) => {
    if (abandonedSentRef.current || !product || !isPhoneValid) return;
    if (!customerName.trim() && !customerPhone) return;
    abandonedSentRef.current = true;
    if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current);

    const wilayaObj = AVAILABLE_WILAYAS.find((w) => w.code === wilaya);
    fetch("/api/orders/abandoned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        productImages: "",
        customerName: customerName || null,
        customerPhone,
        wilayaCode: wilaya || null,
        wilayaName: wilayaObj?.name || null,
        baladyaName: shippingMethod === "office" ? selectedOffice : baladyas.find((b) => b.id === baladya)?.name || null,
        quantity: effectiveQuantity,
        productPrice: activeOffer ? activeOffer.price / activeOffer.quantity : product.price,
        shippingPrice,
        totalPrice: (activeOffer ? activeOffer.price : product.price * effectiveQuantity) + shippingPrice,
        offerId: activeOffer?.id || null,
        offerName: activeOffer ? `${activeOffer.quantity} قطع` : null,
        reason,
        deliveryMethod: shippingMethod,
      }),
    }).catch(() => {});
  }, [product, customerName, customerPhone, wilaya, shippingMethod, selectedOffice, baladya, baladyas, effectiveQuantity, activeOffer, shippingPrice, isPhoneValid]);

  // Start 90s timer when phone becomes valid
  useEffect(() => {
    if (isPhoneValid && !submitted && !abandonedSentRef.current) {
      if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current);
      abandonedTimerRef.current = setTimeout(() => sendAbandoned("timeout"), 90000);
    }
    return () => { if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current); };
  }, [isPhoneValid, submitted, sendAbandoned]);

  // Reset abandoned sent when phone changes to invalid
  useEffect(() => {
    if (!isPhoneValid) {
      abandonedSentRef.current = false;
      if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current);
    }
  }, [isPhoneValid]);

  // Send abandoned on page leave
  useEffect(() => {
    if (submitted) return;
    const handleBeforeUnload = () => { sendAbandoned("page_leave"); };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendAbandoned("page_leave");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [submitted, sendAbandoned]);

  useEffect(() => {
    if (isOfficeDisabled && shippingMethod === "office") {
      setShippingMethod("home");
    }
  }, [wilaya, isOfficeDisabled, shippingMethod]);

  const handleShippingChange = (method: "home" | "office") => {
    if (method === shippingMethod) return;
    setShippingMethod(method);
    if (method === "office") {
      setPrevBaladya(baladya);
      const currentBaladya = baladyas.find((b) => b.id === baladya);
      const matchedOffice = currentBaladya ? allOffices.find((c) => c === currentBaladya.name) : null;
      if (matchedOffice) {
        setSelectedOffice(matchedOffice);
        setBaladya("");
      } else {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !wilaya) return;
    setSubmitting(true);

    try {
      const wilayaRes = await fetch(`/api/wilayas?code=${wilaya}`);
      const wilayas = await wilayaRes.json();
      const wilayaObj = Array.isArray(wilayas) ? wilayas.find((w: any) => w.code === wilaya) : null;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          customerName,
          customerPhone,
          customerAddress: shippingMethod === "office" ? selectedOffice : null,
          wilayaId: wilayaObj?.id || wilaya,
          baladyaId: shippingMethod === "office" ? null : (baladya || null),
          quantity: effectiveQuantity,
          productPrice: activeOffer ? activeOffer.price / activeOffer.quantity : product.price,
          shippingPrice,
          offerId: activeOffer?.id || null,
          colorId: selectedColor || null,
          sizeId: selectedSize || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل إنشاء الطلب");
      }

      setSubmitted(true);
      setShowThankYou(true);
      abandonedSentRef.current = true;
      if (abandonedTimerRef.current) clearTimeout(abandonedTimerRef.current);

      // Track Purchase
      track("Purchase", {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: productTotal + shippingPrice,
        currency: "DZD",
        num_items: effectiveQuantity,
        phone: customerPhone,
        first_name: customerName.split(" ")[0],
        last_name: customerName.split(" ").slice(1).join(" "),
      });
    } catch (err: any) {
      alert(err?.message || "حدث خطأ، يرجى المحاولة مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-400">المنتج غير موجود</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg text-white flex items-center justify-center font-bold text-sm" style={{ backgroundColor: pc }}>
              E
            </div>
            <span className="font-bold text-lg text-gray-900">MEGA.MARKET</span>
          </div>
          <Button variant="ghost" size="icon">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Product Image Gallery */}
        <div className="mb-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
            <img
              src={images[selectedImage] || "/placeholder.svg"}
              alt={product.name}
              width={800}
              height={800}
              className="h-full w-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === idx
                      ? "shadow-md"
                      : "border-gray-200"
                  }`}
                  style={selectedImage === idx ? { borderColor: pc } : undefined}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-3 mb-4 sm:space-y-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.shortDescription && (
            <p className="text-base sm:text-lg text-gray-500">{product.shortDescription}</p>
          )}
          {(!product.hasOffers || product.offers.length === 0) && (
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 whitespace-nowrap">{product.price.toLocaleString()} دج</div>
          )}
        </div>

        {/* Offer Selection */}
        {product.hasOffers && product.offers.length > 0 && (
          <div className="space-y-3 mb-6">
            <p className="text-sm font-bold text-gray-500">اختر العرض</p>
            {product.offers.map((offer) => {
              const isSelected = selectedOffer === offer.id;
              return (
                <div
                  key={offer.id}
                  onClick={() => { if (!isSelected) setSelectedOffer(offer.id); }}
                  className="p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between bg-white"
                  style={{
                    borderColor: isSelected ? pc : undefined,
                    backgroundColor: isSelected ? primaryBg : undefined,
                  }}
                >
                  <span className="font-bold text-gray-900">{offer.quantity} قطع</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold whitespace-nowrap" style={{ color: pc }}>{offer.price.toLocaleString()} دج</span>
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: pc }}>
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Color Selection */}
        {product.hasColors && product.colors.length > 0 && (
          <div className="space-y-3 mb-6">
            <p className="text-sm font-bold text-gray-500">اختر اللون</p>
            <div className="flex gap-3 flex-wrap">
              {product.colors.map((color) => {
                const isSelected = selectedColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setSelectedColor(isSelected ? null : color.id)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`h-14 w-14 rounded-xl overflow-hidden border-2 transition-all ${isSelected ? "ring-2 ring-offset-1" : "border-gray-200"}`}
                      style={{ borderColor: isSelected ? pc : undefined }}
                    >
                      {color.image ? (
                        <img src={color.image} alt={color.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-500" style={{ backgroundColor: color.name.includes("#") ? color.name : "#e5e7eb" }}>
                          {color.name}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-600">{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size Selection */}
        {product.hasSizes && product.sizes.length > 0 && (
          <div className="space-y-3 mb-6">
            <p className="text-sm font-bold text-gray-500">اختر المقاس</p>
            <div className="flex gap-2 flex-wrap">
              {product.sizes.map((size) => {
                const isSelected = selectedSize === size.id;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSize(isSelected ? null : size.id)}
                    className="h-10 min-w-[40px] px-3 rounded-lg border-2 font-bold text-sm transition-all"
                    style={{
                      borderColor: isSelected ? pc : "#e5e7eb",
                      backgroundColor: isSelected ? primaryBg : "white",
                      color: isSelected ? pc : "#374151",
                    }}
                  >
                    {size.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Form */}
        <div ref={formRef}>
        <Card className="backdrop-blur-md shadow-[0_4px_40px_rgba(0,0,0,0.04)]" style={{ backgroundColor: formColors.background + "ee", borderColor: formColors.accent + "BB" }}>
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-bold text-lg sm:text-xl mb-4 sm:mb-6 flex items-center gap-2" style={{ color: formColors.text }}>
              <Package className="h-5 w-5" style={{ color: formColors.primary }} />
              املأ النموذج أدناه للطلب
            </h3>

            {submitted ? (
              <div className="text-center py-8 sm:py-12">
                <div className="rounded-3xl p-8 sm:p-10 border-2 shadow-lg" style={{ backgroundColor: formColors.primary + "08", borderColor: formColors.primary + "40" }}>
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full flex items-center justify-center" style={{ backgroundColor: formColors.primary + "20" }}>
                    <Check className="h-8 w-8" style={{ color: formColors.primary }} />
                  </div>
                  <span className="block font-bold text-xl sm:text-2xl mb-2" style={{ color: formColors.primary }}>تم استلام طلبك بنجاح</span>
                  <p className="text-sm" style={{ color: formColors.text + "80" }}>شكراً لك، سيتم التواصل معك قريباً لتأكيد طلبك</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer Name & Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="الاسم الكامل"
                    required
                    className={`h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 ${getFieldClass("name")}`}
                    style={getFieldStyle("name")}
                  />
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 10) setCustomerPhone(val);
                      if (val.length === 2 && !/[567]/.test(val[1])) {
                        setCustomerPhone(val[0]);
                      }
                    }}
                    placeholder="رقم هاتف"
                    maxLength={10}
                    pattern="^(0[567]\d{8})$"
                    required
                    className={`h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 text-left ${getFieldClass("phone")}`}
                    style={{ textAlign: "right", direction: "ltr", ...getFieldStyle("phone") }}
                  />
                </div>

                {/* Wilaya & Baladya/Office */}
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={wilaya}
                    onChange={(e) => setWilaya(e.target.value)}
                    required
                    className={`w-full h-12 px-3 rounded-md border bg-gray-50 border-gray-200 text-gray-900 text-sm focus:outline-none transition-all ${getFieldClass("wilaya")}`}
                    style={{ ...getFieldStyle("wilaya"), ["--tw-ring-color" as any]: pc }}
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
                      required
                      className={`w-full h-12 px-3 rounded-md border bg-gray-50 border-gray-200 text-gray-900 text-sm focus:outline-none transition-all disabled:opacity-50 ${getFieldClass("baladya")}`}
                      style={{ ...getFieldStyle("baladya"), ["--tw-ring-color" as any]: pc }}
                    >
                      <option value="">
                        {!wilaya ? "الولاية أولاً" : loadingBaladyas ? "جاري التحميل..." : "البلدية"}
                      </option>
                      {[...baladyas].sort((a, b) => a.name.localeCompare(b.name)).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <select
                        value={selectedOffice}
                        onChange={(e) => setSelectedOffice(e.target.value)}
                        disabled={!wilaya || allOffices.length === 0}
                        required
                        className={`w-full h-12 px-3 rounded-md border bg-gray-50 border-gray-200 text-gray-900 text-sm focus:outline-none transition-all disabled:opacity-50 ${getFieldClass("baladya")}`}
                        style={{ ...getFieldStyle("baladya"), ["--tw-ring-color" as any]: pc }}
                      >
                        <option value="">
                          {!wilaya ? "الولاية أولاً" : allOffices.length === 0 ? "لا توجد مكاتب في هذه الولاية" : "بلديات بها مكتب"}
                        </option>
                        {allOffices.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      {wilaya && allOffices.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">لا توجد مكاتب توصيل في هذه الولاية حالياً.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Shipping Method */}
                <div>
                  <p className="text-sm font-bold mb-2 text-gray-500">اختر طريقة شحن</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleShippingChange("home")}
                      disabled={!hasWilaya}
                      className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                        !hasWilaya
                          ? "border-gray-200 opacity-50 cursor-not-allowed bg-gray-50"
                          : "bg-white"
                      }`}
                      style={
                        hasWilaya && shippingMethod === "home"
                          ? { borderColor: pc, backgroundColor: primaryBg }
                          : hasWilaya
                          ? { borderColor: "#e5e7eb" }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Home className="h-5 w-5" style={{ color: shippingMethod === "home" && hasWilaya ? pc : "#9ca3af" }} />
                          <div className="text-right">
                            <p className="text-sm sm:text-base font-bold text-gray-900">المنزل</p>
                            <p className="text-xs text-gray-500 whitespace-nowrap">{hasWilaya ? `${prices.home} دج` : "اختر الولاية"}</p>
                          </div>
                        </div>
                        {shippingMethod === "home" && hasWilaya && (
                          <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: pc }}>
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => !isOfficeDisabled && handleShippingChange("office")}
                      disabled={isOfficeDisabled}
                      className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                        isOfficeDisabled
                          ? "border-gray-200 opacity-50 cursor-not-allowed bg-gray-50"
                          : "bg-white"
                      }`}
                      style={
                        !isOfficeDisabled && shippingMethod === "office"
                          ? { borderColor: pc, backgroundColor: primaryBg }
                          : !isOfficeDisabled
                          ? { borderColor: "#e5e7eb" }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="h-5 w-5" style={{ color: shippingMethod === "office" && !isOfficeDisabled ? pc : "#9ca3af" }} />
                          <div className="text-right">
                            <p className="text-sm sm:text-base font-bold text-gray-900">المكتب</p>
                            <p className="text-xs text-gray-500 whitespace-nowrap">{hasWilaya ? (isOfficeDisabled ? "—" : `${prices.office} دج`) : "اختر الولاية"}</p>
                          </div>
                        </div>
                        {shippingMethod === "office" && !isOfficeDisabled && (
                          <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: pc }}>
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Order Summary - Compact */}
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="font-bold text-sm sm:text-base text-gray-900 truncate">x{effectiveQuantity} {product.name}</span>
                    <span className="text-sm text-gray-500 whitespace-nowrap">{(productTotal).toLocaleString()} دج</span>
                  </div>
                  {hasWilaya && (
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2 gap-2">
                      <span className="truncate">التوصيل إلى {shippingMethod === "home" ? "المنزل" : "المكتب"}</span>
                      <span className="whitespace-nowrap">{shippingPrice.toLocaleString()} دج</span>
                    </div>
                  )}
                  <div className="h-px bg-gray-200 mb-2" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-base sm:text-lg text-gray-900">الإجمالي</span>
                    <span className="font-bold text-lg sm:text-xl whitespace-nowrap" style={{ color: pc }}>{totalPrice.toLocaleString()} دج</span>
                  </div>
                </div>

                {/* Submit + Quantity Row */}
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={`${product.hasOffers ? "w-full" : "flex-1"} h-12 text-base sm:text-lg font-bold text-white animate-pulse-slow ${focusStep === "submit" ? "shake" : ""}`}
                    style={{ backgroundColor: formColors.primary }}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Send className="h-4 w-4 ml-2" />
                    )}
                    {submitting ? "جاري الإرسال..." : "اطلب الآن"}
                  </Button>
                  {!product.hasOffers && (
                    <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl px-1.5 py-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-6 text-center font-bold text-sm text-gray-900">{quantity}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs sm:text-sm text-gray-400 flex items-center justify-center gap-1">
                  <PhoneCall className="h-3 w-3" />
                  سيتم تأكيد طلبك عبر المكالمة
                </p>
              </form>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Full Description */}
        {product.fullDescription && (
          <div className="mt-6 -mx-4 sm:-mx-6">
            <div
              ref={(el) => {
                if (el) {
                  el.querySelectorAll("img").forEach((img) => {
                    img.loading = "lazy";
                    img.decoding = "async";
                  });
                }
              }}
              className="px-4 sm:px-6 text-gray-700 [&_img]:w-full [&_img]:block [&_img]:my-0 [&_img]:border-0"
              dangerouslySetInnerHTML={{ __html: product.fullDescription }}
            />
          </div>
        )}
      </main>

      {/* Thank You Modal Overlay */}
      {showThankYou && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 animate-scale-in relative max-h-[90vh] overflow-y-auto" style={{ backgroundColor: formColors.background, border: `1px solid ${formColors.accent}20` }}>
            <button
              onClick={() => setShowThankYou(false)}
              className="absolute top-4 left-4 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: formColors.accent + "20", color: formColors.accent }}
            >
              ✕
            </button>

            {/* Success Icon */}
            <div className="text-center">
              <div className="relative inline-flex">
                <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ backgroundColor: formColors.primary + "20" }}>
                  <Check className="h-10 w-10" style={{ color: formColors.primary }} />
                </div>
                <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: formColors.primary }}>
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
              <h4 className="font-bold text-2xl mt-4 mb-1 text-gray-900">تم استلام طلبك!</h4>
              <p className="text-gray-500 text-sm">شكراً لك، جاري مراجعة طلبك</p>
            </div>

            {/* Phone Alert */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-amber-700 mb-1">
                    ! يرجى الإبقاء على هاتفك مفتوحاً
                  </p>
                  <p className="text-xs text-amber-600 leading-relaxed">
                    سيتصل بك فريق التأكيد خلال دقائق أو ساعات قليلة لتأكيد طلبك.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <h5 className="font-bold text-sm mb-3 flex items-center gap-2 text-gray-900">
                <Package className="h-4 w-4" style={{ color: pc }} />
                ملخص الطلب
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">المنتج</span>
                  <span className="font-medium text-gray-900">x{effectiveQuantity} {product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الاسم</span>
                  <span className="font-medium text-gray-900">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الهاتف</span>
                  <span className="font-medium text-gray-900" dir="ltr">{customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">طريقة الشحن</span>
                  <span className="font-medium text-gray-900">{shippingMethod === "home" ? "توصيل للمنزل" : "استلام من المكتب"}</span>
                </div>
                <div className="h-px bg-gray-200 my-1" />
                <div className="flex justify-between gap-2">
                  <span className="font-bold text-gray-900">الإجمالي</span>
                  <span className="font-bold text-base whitespace-nowrap" style={{ color: pc }}>{totalPrice.toLocaleString()} دج</span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <h5 className="font-bold text-sm text-blue-700">معلومات الشحن</h5>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-blue-700">شركة الشحن: <strong>DHD Livraison</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-blue-700">مدة التوصيل: <strong>24 ساعة - 48 ساعة</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-blue-700">ولايات الصحراء: <strong>3 - 5 أيام</strong></span>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <Button
              onClick={() => setShowThankYou(false)}
              className="w-full h-12 text-base font-bold rounded-xl text-white"
              style={{ backgroundColor: pc }}
            >
              <ShoppingCart className="h-5 w-5 ml-2" />
              العودة للمنتج
            </Button>
          </div>
        </div>
      )}

      {/* Floating Order Button */}
      {showFloatingBtn && !submitted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
          <button
            onClick={scrollToForm}
            className="w-[85%] mx-auto block py-4 text-white font-bold text-base rounded-2xl shadow-2xl shake flex items-center justify-center gap-2 pointer-events-auto"
            style={{ backgroundColor: formColors.primary }}
          >
            <Send className="h-5 w-5" />
            اطلب الآن
          </button>
        </div>
      )}
    </div>
  );
}
