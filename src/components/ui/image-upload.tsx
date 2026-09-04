"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  className?: string;
}

function resizeImage(file: File, maxWidth = 1600, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxWidth && file.size < 500000) {
          resolve(reader.result as string);
          return;
        }
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context not available"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ value = [], onChange, maxImages = 5, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length && value.length + newUrls.length < maxImages; i++) {
      const file = files[i];
      try {
        const base64 = await resizeImage(file);
        newUrls.push(base64);
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    onChange([...value, ...newUrls]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />

      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={index} className="relative group">
            <img
              src={url}
              alt={`صورة ${index + 1}`}
              className="h-24 w-24 object-cover rounded-xl border-2 border-border shadow-sm"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 dark:bg-red-400 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "h-24 w-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 transition-all",
              "hover:border-primary hover:bg-primary/5 hover:shadow-sm",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">رفع صورة</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {value.length}/{maxImages} صور - اضغط على الصورة لإزالتها
      </p>
    </div>
  );
}
