export type OrderStatus =
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
  | "WAITING_CALLBACK"
  | "POSTPONED"
  | "CANCELLED"
  | "FAKE"
  | "IN_DELIVERY"
  | "ON_HOLD"
  | "DELIVERED"
  | "PAID"
  | "SHIPPED"
  | "READY_FOR_PAYMENT"
  | "CUSTOMER_REORDERED"
  | "RETURN_TRANSFER"
  | "RETURN_READY"
  | "RETURN_COMPLETED";

export type OrderWithRelations = {
  id: string;
  orderNumber: string;
  productId: string;
  variantId: string | null;
  offerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  wilayaId: string;
  baladyaId: string | null;
  quantity: number;
  productPrice: number;
  shippingPrice: number;
  totalPrice: number;
  status: string;
  attemptCount: number;
  notes: string | null;
  deliveryReference: string | null;
  shippingCompany: string | null;
  lastRemarkType: string | null;
  recoveryStatus: string | null;
  recoveryNote: string | null;
  purchasePrice?: number;
  consumedEntries?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    fullDescription: string | null;
    price: number;
    images: string;
    orderCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  variant: {
    id: string;
    name: string;
    price: number;
    stock: number;
  } | null;
  wilaya: {
    id: string;
    name: string;
    code: string;
    baladyas: any[];
    orders: any[];
  };
  baladya: {
    id: string;
    name: string;
    arabicName: string | null;
    wilayaId: string;
    code: string | null;
    orders: any[];
  } | null;
  statusHistory: {
    id: string;
    orderId: string;
    oldStatus: string | null;
    newStatus: string;
    changedBy: string | null;
    note: string | null;
    createdAt: Date;
  }[];
  orderItems?: {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    productPrice: number;
    purchasePrice: number;
    offerId: string | null;
    product: {
      id: string;
      name: string;
      price: number;
      images: string;
    };
  }[];
};

export type ProductWithVariants = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  fullDescription: string | null;
  price: number;
  images: string;
  orderCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants: {
    id: string;
    productId: string;
    name: string;
    price: number;
    stock: number;
  }[];
  _count?: {
    orders: number;
  };
};

export type DashboardStats = {
  totalOrders: number;
  newOrders: number;
  confirmed: number;
  shipped: number;
  inDelivery: number;
  delivered: number;
  returned: number;
  confirmedPercentage: number;
  shippedPercentage: number;
  inDeliveryPercentage: number;
  deliveredPercentage: number;
  returnedPercentage: number;
  todayOrders: number;
  yesterdayOrders: number;
  todayChange: number;
  todayDirection: "up" | "down" | "same";
};

export type OrdersByProduct = {
  productName: string;
  count: number;
  percentage: number;
}[];

export type TopWilaya = {
  name: string;
  count: number;
  rank: number;
}[];

export type FilterParams = {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  status?: string;
  search?: string;
};

export type OrderStatusWithAttempt = {
  value: string;
  label: string;
  attempt?: number;
  disabled?: boolean;
};
