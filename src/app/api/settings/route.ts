import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, unauthorized } from "../push/auth";

// Settings safe for the public storefront. Secrets (API tokens, pixel secrets,
// pause flag internals) are admin-only.
const PUBLIC_SETTING_KEYS = ["shipping_prices", "offices", "form_colors"];

// GET /api/settings?key=xxx or GET /api/settings (all)
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      if (!admin && !PUBLIC_SETTING_KEYS.includes(key)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const setting = await prisma.settings.findUnique({ where: { key } });
      return NextResponse.json(setting);
    }

    const settings = await prisma.settings.findMany();
    const visible = admin ? settings : settings.filter((s) => PUBLIC_SETTING_KEYS.includes(s.key));
    const response = NextResponse.json(visible);
    response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=240");
    return response;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PUT /api/settings  { key, value } (admin only)
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();
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
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();
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
