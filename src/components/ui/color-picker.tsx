"use client";

import { useState, useRef, useCallback } from "react";
import { X, Check } from "lucide-react";

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { h: 220, s: 70, v: 60 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hh = 0;
  if (d !== 0) {
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  return { h: hh, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  onClose: () => void;
}

export function ColorPicker({ value, onChange, onClose }: ColorPickerProps) {
  const [hsv, setHsv] = useState(() => hexToHsv(value || "#396A9C"));
  const [hexInput, setHexInput] = useState(() => {
    const v = (value || "").trim();
    return /^#?[0-9a-fA-F]{6}$/.test(v) ? (v.startsWith("#") ? v.toUpperCase() : `#${v.toUpperCase()}`) : hsvToHex(hsv.h, hsv.s, hsv.v);
  });
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"sv" | "hue" | null>(null);

  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);

  const syncHexInput = (n: { h: number; s: number; v: number }) => {
    setHexInput(hsvToHex(n.h, n.s, n.v));
  };

  const pickSv = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const v = Math.min(100, Math.max(0, 100 - ((clientY - rect.top) / rect.height) * 100));
    setHsv((prev) => {
      const n = { ...prev, s, v };
      syncHexInput(n);
      return n;
    });
  }, []);

  const pickHue = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = Math.min(360, Math.max(0, ((clientX - rect.left) / rect.width) * 360));
    setHsv((prev) => {
      const n = { ...prev, h };
      syncHexInput(n);
      return n;
    });
  }, []);

  const onPointerDown = (kind: "sv" | "hue", e: React.PointerEvent) => {
    dragging.current = kind;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (kind === "sv") pickSv(e.clientX, e.clientY);
    else pickHue(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current === "sv") pickSv(e.clientX, e.clientY);
    else if (dragging.current === "hue") pickHue(e.clientX);
  };

  const onPointerUp = () => {
    dragging.current = null;
  };

  const applyHexInput = () => {
    let v = hexInput.trim();
    if (!v.startsWith("#")) v = `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      setHsv(hexToHsv(v));
      setHexInput(v.toUpperCase());
    } else {
      setHexInput(hex);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[70] animate-in fade-in duration-150" onClick={onClose} />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto bg-[#1c1c1e] rounded-2xl w-full max-w-[300px] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150" dir="ltr">
          {/* Preview swatch */}
          <div className="flex justify-center mb-3">
            <div
              className="h-12 w-12 rounded-lg ring-2 ring-white/30"
              style={{ backgroundColor: hex }}
            />
          </div>

          {/* Saturation / Value square */}
          <div
            ref={svRef}
            onPointerDown={(e) => onPointerDown("sv", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-crosshair touch-none select-none"
            style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
          >
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #fff, transparent)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #000, transparent)" }} />
            <div
              className="absolute h-5 w-5 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            onPointerDown={(e) => onPointerDown("hue", e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="relative h-3 rounded-full mt-3 cursor-pointer touch-none select-none"
            style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
          >
            <div
              className="absolute top-1/2 h-5 w-5 rounded-full border-[3px] border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
            />
          </div>

          {/* Hex + actions */}
          <div className="flex items-center gap-2 mt-3" dir="rtl">
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl border border-red-500/60 text-red-500 flex items-center justify-center hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
            <input
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={applyHexInput}
              onKeyDown={(e) => { if (e.key === "Enter") applyHexInput(); }}
              className="flex-1 h-10 px-3 rounded-xl bg-white/10 text-white text-sm font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-white/30"
              dir="ltr"
              maxLength={7}
            />
            <button
              onClick={() => { onChange(hex); onClose(); }}
              className="h-10 w-10 rounded-xl bg-[#9b7ede] hover:bg-[#8a6fd6] text-white flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
