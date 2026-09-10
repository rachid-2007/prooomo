import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { requireAdmin, unauthorized } from "../../push/auth";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();
  const ok = await sendTelegramMessage("✅ تم اختبار البوت بنجاح!\n🧪 Mega Market Telegram Bot Test");
  if (ok) {
    return NextResponse.json({ success: true, message: "Test message sent" });
  }
  return NextResponse.json({ success: false, message: "Failed to send" }, { status: 500 });
}
