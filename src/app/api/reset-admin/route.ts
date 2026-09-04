import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!admin) {
      return NextResponse.json({ error: "No admin found" }, { status: 404 });
    }

    // Reset admin password to "admin123"
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword, username: "admin" } as any,
    });

    return NextResponse.json({
      success: true,
      message: "Admin password reset to: admin123",
      email: admin.email,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
