"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, X, ShoppingCart, Smartphone, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type PhonePushState = "unknown" | "active" | "inactive" | "unsupported" | "unconfigured";

interface NewOrderToast {
  id: string;
  orderNumber: string;
  productName: string;
  customerName: string;
  totalPrice: number;
}

const POLL_MS = 20000;
const STORE_KEY = "new-order-sound";

// Cash-register "cha-ching" bell like Shopify/YouCan, synthesized - no audio files needed
function playOrderBell(ctx: AudioContext) {
  const t0 = ctx.currentTime + 0.01;

  // 1. "cha" - short metallic snap (filtered noise burst)
  const noiseLen = 0.09;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * noiseLen)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3600;
  band.Q.value = 1.1;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + noiseLen);
  noise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t0);

  // 2. "ching" - bright bell (inharmonic partials, long decay)
  const t1 = t0 + 0.07;
  const partials = [
    { f: 1318.5, g: 0.5, dec: 1.0 }, // E6
    { f: 1975.5, g: 0.28, dec: 0.7 }, // B6
    { f: 2637.0, g: 0.16, dec: 0.45 }, // E7
    { f: 3520.0, g: 0.08, dec: 0.3 }, // A7 shimmer
  ];
  partials.forEach(({ f, g, dec }) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t1);
    gain.gain.exponentialRampToValueAtTime(g, t1 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1 + dec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t1);
    osc.stop(t1 + dec + 0.05);
  });
}

export function NewOrderNotifier() {
  const [soundOn, setSoundOn] = useState(true);
  const [toasts, setToasts] = useState<NewOrderToast[]>([]);
  const [phonePush, setPhonePush] = useState<PhonePushState>("unknown");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const baselineSet = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(true);
  const router = useRouter();

  useEffect(() => {
    try {
      soundOnRef.current = localStorage.getItem(STORE_KEY) !== "off";
      setSoundOn(soundOnRef.current);
    } catch { /* ignore */ }
  }, []);

  const ensureAudio = useCallback(() => {
    try {
      if (!audioCtx.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        audioCtx.current = new AC();
      }
      if (audioCtx.current.state === "suspended") {
        audioCtx.current.resume().catch(() => {});
      }
      return audioCtx.current;
    } catch {
      return null;
    }
  }, []);

  // Unlock audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => ensureAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [ensureAudio]);

  // Ask for browser notification permission once
  useEffect(() => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignore */ }
  }, []);

  // Receive order ids already shown via real push (service worker relay) - no duplicates
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; orderId?: string } | null;
      if (data && data.type === "push-shown" && data.orderId) {
        seenIds.current.add(data.orderId);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);

  // Check phone push status on mount (existing subscription + server config)
  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !window.isSecureContext) {
          setPhonePush("unsupported");
          return;
        }
        const keyRes = await fetch("/api/push/vapid-key");
        if (!keyRes.ok) {
          setPhonePush("unconfigured");
          return;
        }
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        const sub = await reg?.pushManager.getSubscription().catch(() => null);
        setPhonePush(sub ? "active" : "inactive");
        // Re-sync existing subscription with the server (in case it was pruned)
        if (sub) {
          const json = sub.toJSON();
          if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
            }).catch(() => {});
          }
        }
      } catch {
        setPhonePush("inactive");
      }
    })();
  }, []);

  const enablePhonePush = async () => {
    setPhoneBusy(true);
    setPhoneMsg(null);
    try {
      if (Notification.permission === "denied") {
        setPhoneMsg("الإشعارات محظورة من إعدادات المتصفح — فعّلها ثم أعد المحاولة");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPhoneMsg("لازم تسمح بالإشعارات باش توصلك على الهاتف");
        return;
      }
      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) {
        setPhonePush("unconfigured");
        setPhoneMsg("الـPush غير مفعّل على السيرفر بعد");
        return;
      }
      const { publicKey } = await keyRes.json();
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setPhonePush("active");
      setPhoneMsg("تم التفعيل — توصلك الإشعارات حتى والموقع مغلق");
    } catch {
      setPhoneMsg("تعذر التفعيل — حاول مجددا");
    } finally {
      setPhoneBusy(false);
    }
  };

  const disablePhonePush = async () => {
    setPhoneBusy(true);
    setPhoneMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      const endpoint = sub?.endpoint;
      if (endpoint) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      await sub?.unsubscribe().catch(() => {});
      setPhonePush("inactive");
    } finally {
      setPhoneBusy(false);
    }
  };

  const sendTestPush = async () => {
    setPhoneBusy(true);
    setPhoneMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPhoneMsg(`تجربة مرسلة (${data.sent ?? 0}/${data.total ?? 0}) — شوف هاتفك`);
      } else {
        setPhoneMsg(data.error || "فشل إرسال التجربة");
      }
    } catch {
      setPhoneMsg("فشل إرسال التجربة");
    } finally {
      setPhoneBusy(false);
    }
  };

  const toggleSound = () => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    try {
      localStorage.setItem(STORE_KEY, next ? "on" : "off");
    } catch { /* ignore */ }
    if (next) {
      const ctx = ensureAudio();
      if (ctx) {
        try { playOrderBell(ctx); } catch { /* ignore */ }
      }
    }
  };

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((items: NewOrderToast[]) => {
    if (items.length === 0) return;
    if (soundOnRef.current) {
      const ctx = ensureAudio();
      if (ctx) {
        try { playOrderBell(ctx); } catch { /* ignore */ }
      }
    }
    const shown = items.slice(0, 3);
    setToasts((prev) => [...shown, ...prev].slice(0, 4));
    shown.forEach((t) => {
      setTimeout(() => dismiss(t.id), 15000);
    });
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        const first = items[0];
        const body =
          items.length > 1
            ? `${items.length} طلبات جديدة — أولها: ${first.productName} (${first.customerName})`
            : `${first.productName} — ${first.customerName} — ${first.totalPrice.toLocaleString()} دج`;
        const n = new Notification("طلب جديد", { body });
        n.onclick = () => {
          window.focus();
          router.push("/orders");
        };
      }
    } catch { /* ignore */ }
  }, [ensureAudio, dismiss, router]);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/orders?limit=10");
        if (!res.ok || stopped) return;
        const data = await res.json();
        const list: Record<string, unknown>[] = (data.orders || data || []) as Record<string, unknown>[];
        if (!baselineSet.current) {
          list.forEach((o) => {
            if (typeof o.id === "string") seenIds.current.add(o.id);
          });
          baselineSet.current = true;
          return;
        }
        // Skip orders already delivered by real push (no duplicates) -
        // those were notified on the phone even with the site closed.
        const fresh = list.filter(
          (o) => typeof o.id === "string" && !seenIds.current.has(o.id) && o.pushNotifiedAt == null
        );
        fresh.forEach((o) => seenIds.current.add(o.id as string));
        if (fresh.length > 0) {
          notify(
            fresh.map((o) => {
              const product = o.product as { name?: string } | undefined;
              return {
                id: o.id as string,
                orderNumber: (o.orderNumber as string) || "",
                productName: product?.name || "منتج",
                customerName: (o.customerName as string) || "",
                totalPrice: (o.totalPrice as number) || 0,
              };
            })
          );
        }
      } catch { /* ignore polling errors */ }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [notify]);

  return (
    <>
      {/* Phone push + sound toggles */}
      <div className="fixed bottom-4 left-4 z-[65] flex flex-col items-center gap-2">
        {phoneMsg && (
          <div className="max-w-[220px] px-3 py-2 rounded-xl bg-card border border-border shadow-lg text-[11px] font-bold text-center">
            {phoneMsg}
          </div>
        )}
        {phonePush === "active" && (
          <button
            onClick={sendTestPush}
            disabled={phoneBusy}
            className="px-3 h-8 rounded-full bg-card border border-border shadow text-[11px] font-bold hover:shadow-md transition-shadow disabled:opacity-50"
          >
            تجربة الإشعار
          </button>
        )}
        {phonePush !== "unsupported" && phonePush !== "unconfigured" && (
          <button
            onClick={phonePush === "active" ? disablePhonePush : enablePhonePush}
            disabled={phoneBusy}
            title={phonePush === "active" ? "إشعارات الهاتف مفعّلة — اضغط للإيقاف" : "تفعيل إشعارات الهاتف (حتى والموقع مغلق)"}
            className="relative h-11 w-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow disabled:opacity-50"
          >
            {phoneBusy ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Smartphone className={`h-5 w-5 ${phonePush === "active" ? "text-emerald-600" : "text-muted-foreground"}`} />
            )}
            {phonePush === "active" && (
              <span className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
            )}
          </button>
        )}
        <button
          onClick={toggleSound}
          title={soundOn ? "كتم صوت تنبيه الطلبات" : "تشغيل صوت تنبيه الطلبات"}
          className="h-11 w-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
        >
          {soundOn ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* New order toasts */}
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-80 z-[70] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-card border-2 border-primary/60 rounded-2xl shadow-2xl p-3 animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black">طلب جديد</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm font-bold mt-2 truncate">المنتج: {t.productName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {t.customerName} — {t.totalPrice.toLocaleString()} دج
            </p>
            <button
              onClick={() => {
                dismiss(t.id);
                router.push("/orders");
              }}
              className="mt-2 w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              عرض الطلب
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
