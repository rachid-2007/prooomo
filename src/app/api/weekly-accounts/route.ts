import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const accounts = await prisma.weeklyAccount.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(Array.isArray(accounts) ? accounts : []);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const account = await prisma.weeklyAccount.create({
      data: {
        title: body.title,
        weekStart: body.weekStart,
        weekEnd: body.weekEnd,
        totalOrders: body.totalOrders || 0,
        confirmedOrders: body.confirmedOrders || 0,
        abandonedOrders: body.abandonedOrders || 0,
        adSpendEuro: body.adSpendEuro || 0,
        exchangeRate: body.exchangeRate || 0,
        deliveredOrders: body.deliveredOrders || 0,
        deliveredAbandoned: body.deliveredAbandoned || 0,
        deliveryRate: body.deliveryRate || 0,
        abandonedDeliveryRate: body.abandonedDeliveryRate || 0,
        confirmationExpenses: body.confirmationExpenses || 0,
        packagingPerUnit: body.packagingPerUnit || 0,
        productPurchasePrice: body.productPurchasePrice || 0,
        sellingPrice: body.sellingPrice || 0,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create weekly account" }, { status: 500 });
  }
}
