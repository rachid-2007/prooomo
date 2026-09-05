import webpush from "web-push";
import { prisma } from "./db";

export interface NewOrderPush {
  orderId: string;
  orderNumber: string;
  productName: string;
  customerName: string;
  totalPrice: number;
}

let vapidReady: boolean | null = null;

function setupVapid(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@mega.market";
  if (!pub || !priv) {
    vapidReady = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    vapidReady = true;
  } catch {
    vapidReady = false;
  }
  return vapidReady;
}

export function isPushConfigured(): boolean {
  return setupVapid();
}

export function getVapidPublicKey(): string | null {
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  return pub || null;
}

// Sends a push notification to all subscribed devices.
// Returns the number of devices successfully notified.
// Expired/invalid subscriptions (410/404) are removed automatically.
export async function sendNewOrderPush(order: NewOrderPush): Promise<{ sent: number; total: number }> {
  if (!setupVapid()) return { sent: 0, total: 0 };

  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  const payload = JSON.stringify({
    type: "new-order",
    orderId: order.orderId,
    title: "طلب جديد",
    body: `${order.productName} — ${order.customerName} — ${order.totalPrice.toLocaleString("en-US")} دج`,
    url: `/orders?order=${order.orderId}`,
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { id: s.id } });
          } catch { /* ignore */ }
        }
      }
    })
  );

  return { sent, total: subs.length };
}
