import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const FB_KEYS = [
  "fb_pixel_id",
  "fb_access_token",
  "fb_test_event_code",
  "fb_pixel_enabled",
  "fb_capi_enabled",
];

export async function GET() {
  try {
    const settings = await prisma.settings.findMany({
      where: { key: { in: FB_KEYS } },
    });
    const result: Record<string, string> = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}

export async function PUT(request: Request) {
  try {
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
