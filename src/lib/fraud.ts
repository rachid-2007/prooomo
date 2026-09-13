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

// Check if IP is in a blocked subnet (e.g., blocked 105.235.137.0 means 105.235.137.*)
export async function findSubnetBlock(
  ip: string | null | undefined
): Promise<{ type: "subnet"; value: string } | null> {
  if (!ip) return null;
  // Get the /24 subnet (e.g., 105.235.137)
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;

  // Check for subnet block like "105.235.137.0/24"
  const subnetEntry = await prisma.blockedEntry.findUnique({
    where: { type_value: { type: "subnet", value: `${subnet}.0/24` } },
    select: { type: true, value: true },
  });
  if (subnetEntry) return { type: "subnet", value: subnetEntry.value };

  return null;
}

// Validate Algerian phone number format
export function isValidAlgerianPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = normalizePhone(phone);
  // Algerian mobile: 05xx, 06xx, 07xx (10 digits) or international +213
  if (cleaned.length === 10 && /^(0[567])\d{8}$/.test(cleaned)) return true;
  if (cleaned.length === 12 && cleaned.startsWith("213") && /^(213[567])\d{8}$/.test(cleaned)) return true;
  return false;
}

// Risk scoring: returns a score 0-100 (higher = more suspicious)
// Also returns reasons for the score
export async function calculateRiskScore(params: {
  phone: string | null | undefined;
  ip: string | null | undefined;
  deviceId: string | null | undefined;
  productId?: string;
}): Promise<{ score: number; reasons: string[]; autoBlock: boolean }> {
  let score = 0;
  const reasons: string[] = [];
  const phone = params.phone ? normalizePhone(params.phone) : null;
  const ip = params.ip;
  const deviceId = params.deviceId;

  if (!phone && !ip && !deviceId) return { score: 0, reasons: [], autoBlock: false };

  const now = new Date();

  // 1. Same IP/subnet, many different phones (bot pattern: same machine, rotating phones)
  if (ip) {
    const parts = ip.split(".");
    const subnet = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}` : null;

    if (subnet) {
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      // Count distinct phones from same subnet in last hour
      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "customerPhone") as count
        FROM "Order"
        WHERE "ipAddress" LIKE ${subnet + '.%'}
          AND "createdAt" >= ${hourAgo}
      `;
      const distinctPhones = Number(result[0]?.count || 0);
      if (distinctPhones >= 3) {
        score += 35;
        reasons.push(`${distinctPhones} أرقام هواتف مختلفة من نفس الشبكة`);
      } else if (distinctPhones >= 2) {
        score += 15;
        reasons.push(`${distinctPhones} أرقام هواتف مختلفة من نفس الشبكة`);
      }
    }

    // Count orders from same IP in last hour
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const ipOrders = await prisma.order.count({
      where: { ipAddress: ip, createdAt: { gte: hourAgo } },
    });
    if (ipOrders >= 3) {
      score += 25;
      reasons.push(`${ipOrders} طلبات من نفس IP في آخر ساعة`);
    } else if (ipOrders >= 2) {
      score += 10;
      reasons.push(`${ipOrders} طلبات من نفس IP في آخر ساعة`);
    }
  }

  // 2. Same device, many different phones (device fingerprint rotation)
  if (deviceId) {
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const devicePhones = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "customerPhone") as count
      FROM "Order"
      WHERE "deviceId" = ${deviceId}
        AND "createdAt" >= ${hourAgo}
    `;
    const dPhones = Number(devicePhones[0]?.count || 0);
    if (dPhones >= 3) {
      score += 40;
      reasons.push(`${dPhones} أرقام هواتف مختلفة من نفس الجهاز`);
    } else if (dPhones >= 2) {
      score += 20;
      reasons.push(`${dPhones} أرقام هواتف مختلفة من نفس الجهاز`);
    }
  }

  // 3. Phone used from many different IPs (fake phone, real human would have 1-2 IPs)
  if (phone) {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const phoneIps = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "ipAddress") as count
      FROM "Order"
      WHERE "customerPhone" = ${phone}
        AND "createdAt" >= ${dayAgo}
        AND "ipAddress" IS NOT NULL
    `;
    const pIps = Number(phoneIps[0]?.count || 0);
    if (pIps >= 3) {
      score += 30;
      reasons.push(`${pIps} عناوين IP مختلفة لهذا الرقم`);
    } else if (pIps >= 2) {
      score += 10;
      reasons.push(`${pIps} عناوين IP مختلفة لهذا الرقم`);
    }
  }

  // 4. Rapid-fire orders (same product, within minutes)
  if (params.productId) {
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const recentSameProduct = await prisma.order.count({
      where: {
        productId: params.productId,
        createdAt: { gte: tenMinAgo },
      },
    });
    if (recentSameProduct >= 3) {
      score += 30;
      reasons.push(`${recentSameProduct} طلبات لنفس المنتج في آخر 10 دقائق`);
    }
  }

  // 5. Invalid phone format
  if (phone && !isValidAlgerianPhone(phone)) {
    score += 10;
    reasons.push("رقم الهاتف غير صالح");
  }

  // Auto-block if score >= 70
  return { score, reasons, autoBlock: score >= 70 };
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
