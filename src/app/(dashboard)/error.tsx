"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError = error.message?.includes("Loading chunk") || error.name === "ChunkLoadError";

  useEffect(() => {
    if (isChunkError) {
      const retries = parseInt(sessionStorage.getItem("_chunk_retries") || "0");
      if (retries < 3) {
        sessionStorage.setItem("_chunk_retries", String(retries + 1));
        setTimeout(() => window.location.reload(), 1000);
      } else {
        sessionStorage.removeItem("_chunk_retries");
      }
    } else {
      sessionStorage.removeItem("_chunk_retries");
    }
  }, [isChunkError]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center shadow-lg">
        <div className="h-16 w-16 rounded-2xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold mb-2">حدث خطأ</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isChunkError
            ? "فشل تحميل الصفحة. جارٍ إعادة التحميل..."
            : error.message || "حدث خطأ غير متوقع"}
        </p>
        <button
          onClick={() => {
            sessionStorage.removeItem("_chunk_retries");
            if (isChunkError) {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
