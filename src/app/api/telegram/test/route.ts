import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET() {
  const ok = await sendTelegramMessage("✅ تم اختبار البوت بنجاح!\n🧪 Mega Market Telegram Bot Test");
  if (ok) {
    return NextResponse.json({ success: true, message: "Test message sent" });
  }
  return NextResponse.json({ success: false, message: "Failed to send" }, { status: 500 });
}
