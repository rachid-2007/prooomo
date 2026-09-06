import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, unauthorized } from "../../push/auth";
import { normalizePhone, type BlockType } from "@/lib/fraud";

const TYPES: BlockType[] = ["phone", "ip", "device"];

// GET /api/fraud/blocks - list all blocks (admin)
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();
  const list = await prisma.blockedEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(list);
}

// POST /api/fraud/blocks { type, value, note? } - block phone/ip/device (admin)
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  try {
    const body = await request.json();
    const type = body?.type as BlockType;
    let value = String(body?.value || "").trim();
    if (!TYPES.includes(type) || !value) {
      return NextResponse.json({ error: "Invalid type or value" }, { status: 400 });
    }
    if (type === "phone") value = normalizePhone(value);
    const entry = await prisma.blockedEntry.upsert({
      where: { type_value: { type, value } },
      create: { type, value, note: body?.note || null, createdBy: admin.id },
      update: { note: body?.note || null },
    });
    return NextResponse.json({ success: true, entry });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/fraud/blocks?type=&value= - unblock (admin)
export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "";
  let value = (searchParams.get("value") || "").trim();
  if (!TYPES.includes(type as BlockType) || !value) {
    return NextResponse.json({ error: "Invalid type or value" }, { status: 400 });
  }
  if (type === "phone") value = normalizePhone(value);
  await prisma.blockedEntry.deleteMany({ where: { type, value } });
  return NextResponse.json({ success: true });
}
