import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, unauthorized } from "../../push/auth";

// POST /api/delivery/track { trackingNumbers: string[] } (admin)
// Real connectivity check against the shipping company API.
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const trackingNumbers: string[] = Array.isArray(body.trackingNumbers)
      ? body.trackingNumbers.filter(Boolean)
      : [];
    if (trackingNumbers.length === 0) {
      return NextResponse.json({ error: "trackingNumbers required" }, { status: 400 });
    }

    const settingsRows = await prisma.settings.findMany({
      where: { key: { in: ["delivery_api_token", "delivery_api_url"] } },
    });
    const settings = settingsRows.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>
    );

    if (!settings.delivery_api_token || !settings.delivery_api_url) {
      return NextResponse.json({ error: "إعدادات شركة التوصيل ناقصة" }, { status: 400 });
    }

    const apiUrl = settings.delivery_api_url.replace(/\/$/, "");
    const url =
      `${apiUrl}/api/v1/get/orders/status` +
      `?api_token=${encodeURIComponent(settings.delivery_api_token)}` +
      `&trackings=${encodeURIComponent(trackingNumbers.join(","))}` +
      `&status=all`;

    let res: Response;
    try {
      res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    } catch {
      return NextResponse.json({ error: "تعذر الوصول لسيرفر شركة التوصيل" }, { status: 502 });
    }

    if (res.status === 403 || res.status === 401) {
      return NextResponse.json(
        { error: "شركة التوصيل رفضت التوكن (تحقق من التوكن أو فلترة IP)" },
        { status: 502 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `شركة التوصيل ردت بخطأ (${res.status})` },
        { status: 502 }
      );
    }

    const result = await res.json().catch(() => ({}));
    const data = result.data || {};
    return NextResponse.json({ ok: true, found: Object.keys(data).length, total: trackingNumbers.length });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
