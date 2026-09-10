import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OFFICES_DATA } from "@/lib/constants";
import { requireAdmin, unauthorized } from "../push/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return unauthorized();
    const merged = { ...OFFICES_DATA };

    try {
      const setting = await prisma.settings.findUnique({ where: { key: "offices" } });
      if (setting && setting.value) {
        const customOffices: { wilayaCode: string; name: string }[] = JSON.parse(setting.value);
        for (const office of customOffices) {
          if (!merged[office.wilayaCode]) {
            merged[office.wilayaCode] = [];
          }
          if (!merged[office.wilayaCode].includes(office.name)) {
            merged[office.wilayaCode].push(office.name);
          }
        }
      }
    } catch {}

    for (const key of Object.keys(merged)) {
      merged[key] = merged[key].sort((a: string, b: string) => a.localeCompare(b));
    }

    return NextResponse.json(merged);
  } catch {
    return NextResponse.json(OFFICES_DATA);
  }
}
