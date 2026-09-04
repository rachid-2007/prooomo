import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const productId = searchParams.get("productId");

    const where: any = {};
    const now = new Date();

    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      where.date = { gte: start };
    } else if (period === "7days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      where.date = { gte: start };
    } else if (period === "30days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      where.date = { gte: start };
    } else if (period === "custom" && from && to) {
      const startDate = new Date(from);
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    }

    if (productId) where.productId = productId;

    const expenses = await prisma.expense.findMany({
      where,
      include: { product: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ expenses, total });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description, amount, category, productId, note, date } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: "الوصف والمبلغ مطلوبان" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        category: category || null,
        productId: productId || null,
        note: note || null,
        date: date ? new Date(date) : new Date(),
      },
      include: { product: { select: { id: true, name: true } } },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
