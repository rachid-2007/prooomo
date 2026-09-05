import { NextResponse } from "next/server";
import { sendNewOrderPush, isPushConfigured } from "@/lib/push";
import { requireAdmin, unauthorized } from "../auth";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push not configured on server" }, { status: 503 });
  }

  const result = await sendNewOrderPush({
    orderId: "test",
    orderNumber: "TEST",
    productName: "تجربة الإشعارات",
    customerName: "تأكد أن الإشعارات تصلك على الهاتف",
    totalPrice: 0,
  });
  return NextResponse.json({ success: true, ...result });
}
