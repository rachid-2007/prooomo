import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/settings?key=xxx or GET /api/settings (all)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const setting = await prisma.settings.findUnique({ where: { key } });
      return NextResponse.json(setting);
    }

    const settings = await prisma.settings.findMany();
    const response = NextResponse.json(settings);
    response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=240");
    return response;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PUT /api/settings  { key, value }
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value required" }, { status: 400 });
    }

    const existing = await prisma.settings.findUnique({ where: { key } });
    if (existing) {
      await prisma.settings.update({ where: { key }, data: { value: String(value) } });
    } else {
      await prisma.settings.create({ data: { key, value: String(value) } });
    }

    return NextResponse.json({ key, value });
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

// POST /api/settings/batch  { settings: [{ key, value }] }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: "settings array required" }, { status: 400 });
    }

    for (const { key, value } of settings) {
      const existing = await prisma.settings.findUnique({ where: { key } });
      if (existing) {
        await prisma.settings.update({ where: { key }, data: { value: String(value) } });
      } else {
        await prisma.settings.create({ data: { key, value: String(value) } });
      }
    }

    return NextResponse.json({ saved: settings.length });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
