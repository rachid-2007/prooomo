import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, amount, category, productId, note, date } = body;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(category !== undefined && { category: category || null }),
        ...(productId !== undefined && { productId: productId || null }),
        ...(note !== undefined && { note: note || null }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: { product: { select: { id: true, name: true } } },
    });

    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
