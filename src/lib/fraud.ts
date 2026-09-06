import { prisma } from "./db";

// Limits against fake/spam orders
export const PHONE_ORDERS_PER_DAY = 4;
export const IP_ORDERS_PER_HOUR = 8;

export type BlockType = "phone" | "ip" | "device";

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || null;
  return request.headers.get("x-real-ip")?.trim() || null;
}

export function normalizePhone(phone: string | null | undefined): string {
  return (phone || "").replace(/\D/g, "");
}

// Returns the block reason if any of phone/ip/device is blocked
export async function findBlock(
  phone: string | null | undefined,
  ip: string | null | undefined,
  deviceId: string | null | undefined
): Promise<{ type: BlockType; value: string } | null> {
  const checks: { type: BlockType; value: string | null | undefined }[] = [
    { type: "phone", value: phone ? normalizePhone(phone) : null },
    { type: "ip", value: ip },
    { type: "device", value: deviceId },
  ];
  for (const c of checks) {
    if (!c.value) continue;
    const hit = await prisma.blockedEntry.findUnique({
      where: { type_value: { type: c.type, value: c.value } },
      select: { type: true, value: true },
    });
    if (hit) return { type: hit.type as BlockType, value: hit.value };
  }
  return null;
}

// Rate limits: too many orders from the same phone (24h) or IP (1h)
export async function checkRateLimit(
  phone: string | null | undefined,
  ip: string | null | undefined
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const now = new Date();

  if (phone) {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const count = await prisma.order.count({
      where: { customerPhone: normalizePhone(phone), createdAt: { gte: dayAgo } },
    });
    if (count >= PHONE_ORDERS_PER_DAY) {
      return { allowed: false as const, reason: "لقد تجاوزت الحد الأقصى للطلبات بهذا الرقم، يرجى الاتصال بنا" };
    }
  }

  if (ip) {
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const count = await prisma.order.count({
      where: { ipAddress: ip, createdAt: { gte: hourAgo } },
    });
    if (count >= IP_ORDERS_PER_HOUR) {
      return { allowed: false as const, reason: "عدد كبير من الطلبات، حاول مجددا لاحقا" };
    }
  }

  return { allowed: true as const };
}
