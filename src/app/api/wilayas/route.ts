import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    const where: Record<string, any> = {};
    if (code) where.code = code;

    const wilayas = await prisma.wilaya.findMany({
      where,
      include: {
        baladyas: true,
      },
      orderBy: { code: "asc" },
    });

    const response = NextResponse.json(wilayas);
    response.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
    return response;
  } catch (error) {
    console.error("Error fetching wilayas:", error);
    return NextResponse.json(
      { error: "Failed to fetch wilayas" },
      { status: 500 }
    );
  }
}
