"use client";

import { useEffect, useState } from "react";
import { FacebookPixel } from "@/components/facebook/pixel";

interface FBConfig {
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  pixelEnabled: boolean;
  capiEnabled: boolean;
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const [fbConfig, setFbConfig] = useState<FBConfig | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");

    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    fetch("/api/facebook/settings")
      .then((r) => r.json())
      .then((d) => {
        setFbConfig({
          pixelId: d.fb_pixel_id || "",
          accessToken: d.fb_access_token || "",
          testEventCode: d.fb_test_event_code || "",
          pixelEnabled: d.fb_pixel_enabled === "true",
          capiEnabled: d.fb_capi_enabled === "true",
        });
      })
      .catch(() => {});

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <FacebookPixel config={fbConfig} />
      {children}
    </>
  );
}
