const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

export async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function formatOrderNotification(order: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  shippingMethod: string;
  wilaya: string;
  baladya?: string | null;
  officeName?: string | null;
  address?: string | null;
  status: string;
  createdAt?: string;
}): string {
  return `🛒 New order
${order.productName} x${order.quantity}`;
}
