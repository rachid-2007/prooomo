import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, unauthorized } from "../../push/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const me = await requireUser(request);
    if (!me || (me.role !== "ADMIN" && !(me.role === "WORKER" && me.username === username))) {
      return unauthorized();
    }

    const worker = await prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, username: true, isActive: true },
    });

    if (!worker || !worker.isActive) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        stock: true,
        shortDescription: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ worker, products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
