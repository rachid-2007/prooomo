import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const colorsSetting = await prisma.settings.findUnique({
      where: { key: "form_colors" },
    });

    if (!colorsSetting) {
      return NextResponse.json({
        primary: "#7c3aed",
        secondary: "#2563eb",
        background: "#ffffff",
        text: "#1f2937",
        accent: "#f59e0b",
      });
    }

    const response = NextResponse.json(JSON.parse(colorsSetting.value));
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch {
    return NextResponse.json({
      primary: "#7c3aed",
      secondary: "#2563eb",
      background: "#ffffff",
      text: "#1f2937",
      accent: "#f59e0b",
    });
  }
}

export async function PUT(request: Request) {
  try {
    const colors = await request.json();
    await prisma.settings.upsert({
      where: { key: "form_colors" },
      update: { value: JSON.stringify(colors) },
      create: { key: "form_colors", value: JSON.stringify(colors) },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
