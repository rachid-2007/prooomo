"use client";

import { useEffect, useCallback, useRef } from "react";

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

interface FacebookConfig {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  pixelEnabled: boolean;
  capiEnabled: boolean;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getFbp(): string {
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? match[1] : "";
}

function getFbc(): string {
  const match = document.cookie.match(/_fbc=([^;]+)/);
  return match ? match[1] : "";
}

async function sendCAPI(eventName: string, eventData: any, eventId: string) {
  try {
    const res = await fetch("/api/facebook/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        eventData: {
          ...eventData,
          event_source_url: window.location.href,
        },
        fbp: getFbp(),
        fbc: getFbc(),
      }),
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export function useFacebook(config: FacebookConfig | null) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!config?.pixelEnabled || !config.pixelId || initialized.current) return;

    // Load Pixel script
    const script = document.createElement("script");
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${config.pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);
    initialized.current = true;
  }, [config]);

  const track = useCallback(
    async (eventName: string, customData?: Record<string, any>) => {
      if (!config?.pixelEnabled || !config.pixelId) return;

      const eventId = generateEventId();

      // Fire Pixel with event_id for deduplication
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", eventName, { ...customData, event_id: eventId });
      }

      // Fire CAPI
      if (config.capiEnabled) {
        sendCAPI(eventName, customData || {}, eventId);
      }

      return eventId;
    },
    [config]
  );

  const trackCustom = useCallback(
    async (eventName: string, customData?: Record<string, any>) => {
      if (!config?.pixelEnabled || !config.pixelId) return;

      const eventId = generateEventId();

      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("trackCustom", eventName, { ...customData, event_id: eventId });
      }

      if (config.capiEnabled) {
        sendCAPI(eventName, customData || {}, eventId);
      }

      return eventId;
    },
    [config]
  );

  return { track, trackCustom };
}

export function FacebookPixel({ config }: { config: FacebookConfig | null }) {
  const { track } = useFacebook(config);

  useEffect(() => {
    if (!config?.pixelEnabled) return;
    // PageView already fired in init
  }, [config, track]);

  return null;
}
