import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, unauthorized } from "../../push/auth";

// Keys safe to expose to the public storefront (pixel needs these, never secrets)
const PUBLIC_KEYS = ["fb_pixel_id", "fb_pixel_enabled", "fb_capi_enabled"];

const FB_KEYS = [
  "fb_pixel_id",
  "fb_access_token",
  "fb_test_event_code",
  "fb_pixel_enabled",
  "fb_capi_enabled",
];

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const settings = await prisma.settings.findMany({
      where: { key: { in: FB_KEYS } },
    });
    const result: Record<string, string> = {};
    settings.forEach((s) => {
      // Never leak secrets (access token, test code) to non-admin callers
      if (!admin && !PUBLIC_KEYS.includes(s.key)) return;
      result[s.key] = s.value;
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();
    const body = await request.json();
    const results = await Promise.all(
      Object.entries(body).filter(([k]) => FB_KEYS.includes(k)).map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );
    return NextResponse.json({ saved: results.length });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
