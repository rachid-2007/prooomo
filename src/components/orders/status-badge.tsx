"use client";

import { cn } from "@/lib/utils";

export type StatusKey =
  | "NEW"
  | "CONFIRMED"
  | "NOT_ANSWERED_1"
  | "NOT_ANSWERED_2"
  | "NOT_ANSWERED_3"
  | "PHONE_CLOSED_1"
  | "PHONE_CLOSED_2"
  | "PHONE_CLOSED_3"
  | "OUT_OF_COVERAGE_1"
  | "OUT_OF_COVERAGE_2"
  | "OUT_OF_COVERAGE_3"
  | "CANCELLED"
  | "FAKE"
  | "POSTPONED"
  | "WAITING_CALLBACK"
  | "SHIPPED"
  | "IN_DELIVERY"
  | "ON_HOLD"
  | "DELIVERED"
  | "READY_FOR_PAYMENT"
  | "PAID"
  | "CUSTOMER_REORDERED"
  | "RETURN_TRANSFER"
  | "RETURN_READY"
  | "RETURN_COMPLETED";

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

export const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  NEW:              { label: "طلب جديد",              color: "text-sky-600 dark:text-sky-400",      bg: "bg-sky-50 dark:bg-sky-950/50",      border: "border-sky-200 dark:border-sky-800",      dot: "bg-sky-500" },
  CONFIRMED:        { label: "تم التأكيد",            color: "text-emerald-600 dark:text-emerald-400",  bg: "bg-emerald-50 dark:bg-emerald-950/50",  border: "border-emerald-200 dark:border-emerald-800",  dot: "bg-emerald-500" },
  NOT_ANSWERED_1:   { label: "العميل لايرد",          color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/50",   border: "border-orange-200 dark:border-orange-800",   dot: "bg-orange-500" },
  NOT_ANSWERED_2:   { label: "العميل لايرد 2",        color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/50",   border: "border-orange-200 dark:border-orange-800",   dot: "bg-orange-500" },
  NOT_ANSWERED_3:   { label: "العميل لايرد 3",        color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/50",   border: "border-orange-200 dark:border-orange-800",   dot: "bg-orange-500" },
  PHONE_CLOSED_1:   { label: "الهاتف مغلق",           color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/50",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500" },
  PHONE_CLOSED_2:   { label: "الهاتف مغلق 2",         color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/50",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500" },
  PHONE_CLOSED_3:   { label: "الهاتف مغلق 3",         color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/50",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500" },
  OUT_OF_COVERAGE_1:{ label: "خارج مجال التغطية",     color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/50",   border: "border-violet-200 dark:border-violet-800",   dot: "bg-violet-500" },
  OUT_OF_COVERAGE_2:{ label: "خارج مجال التغطية 2",   color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/50",   border: "border-violet-200 dark:border-violet-800",   dot: "bg-violet-500" },
  OUT_OF_COVERAGE_3:{ label: "خارج مجال التغطية 3",   color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/50",   border: "border-violet-200 dark:border-violet-800",   dot: "bg-violet-500" },
  CANCELLED:        { label: "تم إلغاء الطلب",        color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/50",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500" },
  FAKE:             { label: "طلب وهمي",              color: "text-gray-600 dark:text-gray-400",     bg: "bg-gray-50 dark:bg-gray-950/50",     border: "border-gray-200 dark:border-gray-800",     dot: "bg-gray-500" },
  POSTPONED:        { label: "تم تأجيل الطلب",        color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-950/50",    border: "border-amber-200 dark:border-amber-800",    dot: "bg-amber-500" },
  WAITING_CALLBACK: { label: "في انتظار عودة اتصال العميل", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/50", border: "border-cyan-200 dark:border-cyan-800", dot: "bg-cyan-500" },
  SHIPPED:          { label: "تم الشحن",              color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-950/50",     border: "border-blue-200 dark:border-blue-800",     dot: "bg-blue-500" },
  IN_DELIVERY:      { label: "قيد التسليم",           color: "text-blue-700 dark:text-blue-300",     bg: "bg-blue-50 dark:bg-blue-950/50",     border: "border-blue-200 dark:border-blue-800",     dot: "bg-blue-600" },
  ON_HOLD:          { label: "معلق",                  color: "text-yellow-600 dark:text-yellow-400",   bg: "bg-yellow-50 dark:bg-yellow-950/50",   border: "border-yellow-200 dark:border-yellow-800",   dot: "bg-yellow-500" },
  DELIVERED:        { label: "تم التسليم",            color: "text-emerald-600 dark:text-emerald-400",  bg: "bg-emerald-50 dark:bg-emerald-950/50",  border: "border-emerald-200 dark:border-emerald-800",  dot: "bg-emerald-500" },
  READY_FOR_PAYMENT:{ label: "جاهز للدفع",           color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/50",   border: "border-orange-200 dark:border-orange-800",   dot: "bg-orange-500" },
  PAID:             { label: "مدفوع مكتمل",           color: "text-green-600 dark:text-green-400",    bg: "bg-green-50 dark:bg-green-950/50",    border: "border-green-200 dark:border-green-800",    dot: "bg-green-500" },
  CUSTOMER_REORDERED:{ label: "العميل أعاد الطلب",   color: "text-teal-600 dark:text-teal-400",     bg: "bg-teal-50 dark:bg-teal-950/50",     border: "border-teal-200 dark:border-teal-800",     dot: "bg-teal-500" },
  RETURN_TRANSFER:  { label: "مرجع قيد التحويل",      color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/50",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500" },
  RETURN_READY:     { label: "مرجع جاهز للاستلام",    color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/50",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500" },
  RETURN_COMPLETED: { label: "مرجع مكتمل",            color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/50",      border: "border-red-200 dark:border-red-800",      dot: "bg-red-500" },
};

interface StatusBadgeProps {
  status: StatusKey;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  showDot = true,
  onClick,
  active,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
    lg: "px-4 py-2 text-sm gap-2",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center font-medium rounded-full transition-all duration-200",
        sizes[size],
        config.bg,
        config.color,
        config.border,
        "border",
        onClick && "cursor-pointer hover:shadow-sm active:scale-95",
        active && "ring-2 ring-offset-1 ring-current shadow-sm",
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      )}
      <span>{config.label}</span>
    </button>
  );
}

interface StatusDotProps {
  status: StatusKey;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusDot({ status, size = "md", className }: StatusDotProps) {
  const config = STATUS_CONFIG[status];
  const sizes = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };

  return (
    <span className={cn("relative flex items-center justify-center", className)}>
      <span className={cn("rounded-full animate-ping absolute opacity-75", sizes[size], config.dot)} />
      <span className={cn("rounded-full relative", sizes[size], config.dot)} />
    </span>
  );
}
