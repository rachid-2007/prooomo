import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          price: true,
          thumbnail: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const response = NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
