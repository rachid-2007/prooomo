import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.weeklyAccount.findUnique({
      where: { id },
    });
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch weekly account" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const account = await prisma.weeklyAccount.update({
      where: { id },
      data: {
        title: body.title,
        weekStart: body.weekStart,
        weekEnd: body.weekEnd,
        totalOrders: body.totalOrders,
        confirmedOrders: body.confirmedOrders,
        abandonedOrders: body.abandonedOrders,
        adSpendEuro: body.adSpendEuro,
        exchangeRate: body.exchangeRate,
        deliveredOrders: body.deliveredOrders,
        deliveredAbandoned: body.deliveredAbandoned,
        deliveryRate: body.deliveryRate,
        abandonedDeliveryRate: body.abandonedDeliveryRate,
        confirmationExpenses: body.confirmationExpenses,
        packagingPerUnit: body.packagingPerUnit,
        productPurchasePrice: body.productPurchasePrice,
        sellingPrice: body.sellingPrice,
      },
    });
    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update weekly account" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.weeklyAccount.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete weekly account" }, { status: 500 });
  }
}
