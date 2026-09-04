import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-DZ", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(amount) + " دج";
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("ar-DZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ORD-${year}${month}${day}-${random}`;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100 * 10) / 10;
}

export function getChangePercentage(today: number, yesterday: number): {
  value: number;
  direction: "up" | "down" | "same";
} {
  if (yesterday === 0) return { value: 0, direction: "same" };
  const change = ((today - yesterday) / yesterday) * 100;
  const rounded = Math.round(Math.abs(change));
  if (change > 0) return { value: rounded, direction: "up" };
  if (change < 0) return { value: rounded, direction: "down" };
  return { value: 0, direction: "same" };
}
