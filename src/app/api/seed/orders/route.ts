import { NextResponse } from "next/server";
import prisma from "@/lib/db";

const NAMES = [
  "أحمد بن محمد", "فاطمة الزهراء", "محمد بن علي", "خديجة بنت أحمد",
  "عمر بن يوسف", "نور الدين بن محمد", "سارة بنت علي", "ياسين بن مرابط",
  "عبد الرحمن بن عبد الله", "مريم بنت حسين", "كريم بن بوزيد", "هدى بنت خالد",
  "يوسف بن إبراهيم", "آمنة بنت سعيد", "هشام بن موسى", "رنا بنت فاروق",
  "طارق بن عزيز", "سميرة بنت محمد", "نور هادي بن علي", "ليلى بنت حسن",
  "رشيد بن عبد القادر", "دنيا بنت عمر", "مصطفى بن عبد الرحمن", "عائشة بنت يوسف",
  "صالح بن أحمد", "حنان بنت مبروك", "جمال بن عبد العزيز", "وفاء بنت إسماعيل",
  "أمين بن خالد", "نادية بنت علي", "بلال بن موسى", "دانية بنت حسان",
  "عبد الحق بن محمد", "لطيفة بنت أحمد", "منير بن يحيى", "سناء بنت إبراهيم",
  "رضا بن عبد الله", "جميلة بنت كريم", "إسماعيل بن علي", "حليمة بنت محمد",
  "يحيى بن عمر", "نعيمة بنت عبد الرحمن", "عادل بن فتحي", "رجاء بنت حسن",
  "نبيل بن الصالح", "مونية بنت علي", "فؤاد بن عبد القادر", "كوثر بنت موسى",
  "ثابت بن محمد", "بشرى بنت أحمد",
];

const WILAYA_CODES = [
  "16", "19", "09", "25", "07", "15", "23", "06", "21", "31",
  "24", "34", "32", "39", "18", "36", "13", "05", "44", "48",
];

const SHIPPING_COMPANIES = ["yalidine", "zr_express", "mackall", "jumia", "other"];

const MANUAL_STATUSES = [
  "NEW", "CONFIRMED", "NOT_ANSWERED_1", "NOT_ANSWERED_2", "NOT_ANSWERED_3",
  "PHONE_CLOSED_1", "PHONE_CLOSED_2", "PHONE_CLOSED_3",
  "OUT_OF_COVERAGE_1", "OUT_OF_COVERAGE_2", "OUT_OF_COVERAGE_3",
  "WAITING_CALLBACK", "POSTPONED", "CANCELLED", "FAKE",
  "SHIPPED", "IN_DELIVERY", "ON_HOLD", "DELIVERED",
  "READY_FOR_PAYMENT", "PAID", "CUSTOMER_REORDERED",
  "RETURN_TRANSFER", "RETURN_READY", "RETURN_COMPLETED",
];

const DELIVERY_STATUSES = ["SHIPPED", "IN_DELIVERY", "ON_HOLD", "DELIVERED", "READY_FOR_PAYMENT", "PAID"];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  const prefixes = ["0550", "0551", "0552", "0553", "0555", "0556", "0557", "0558", "0559",
    "0660", "0661", "0662", "0663", "0664", "0665", "0666", "0667", "0668", "0669",
    "0770", "0771", "0772", "0773", "0774", "0775", "0776", "0777", "0778", "0779"];
  return randomPick(prefixes) + String(Math.floor(100000 + Math.random() * 900000));
}

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(8 + Math.random() * 14), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = Math.min(body.count || 50, 200);

    const products = await prisma.product.findMany({ where: { isActive: true } });
    if (products.length === 0) {
      return NextResponse.json({ error: "No active products found. Create products first." }, { status: 400 });
    }

    const wilayas = await prisma.wilaya.findMany();
    if (wilayas.length === 0) {
      return NextResponse.json({ error: "No wilayas found." }, { status: 400 });
    }

    const baladyas = await prisma.baladya.findMany();

    const totalBefore = await prisma.order.count();
    const createdOrders = [];

    for (let i = 0; i < count; i++) {
      const product = randomPick(products);
      const wilaya = randomPick(wilayas);
      const quantity = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 2 : 1;
      const productPrice = product.price;
      const shippingPrice = Math.random() > 0.3 ? 500 : 400;
      const totalPrice = productPrice * quantity + shippingPrice;
      const status = randomPick(MANUAL_STATUSES);
      const shippingMethod = Math.random() > 0.4 ? "home" : "office";
      const createdAt = randomDate(30);

      const orderNumber = `MEGA-${String(totalBefore + i + 1).padStart(6, "0")}`;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          productId: product.id,
          customerName: randomPick(NAMES),
          customerPhone: randomPhone(),
          customerAddress: shippingMethod === "office" ? `مكتب ${randomPick(SHIPPING_COMPANIES)}` : null,
          wilayaId: wilaya.id,
          baladyaId: shippingMethod === "home" && baladyas.length > 0 ? randomPick(baladyas).id : null,
          quantity,
          productPrice,
          shippingPrice,
          totalPrice,
          status,
          purchasePrice: productPrice * 0.4,
          notes: Math.random() > 0.7 ? "طلب تجريبي" : null,
          createdAt,
          updatedAt: createdAt,
          statusHistory: {
            create: {
              newStatus: "NEW",
              note: "تم إنشاء الطلب",
              createdAt,
            },
          },
        },
      });

      if (status !== "NEW" && status !== "CONFIRMED") {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            newStatus: status,
            note: `تم التغيير إلى ${status}`,
            createdAt: new Date(createdAt.getTime() + 3600000),
          },
        });
      }

      createdOrders.push({ id: order.id, orderNumber, status });
    }

    return NextResponse.json({
      message: `Created ${count} test orders`,
      orders: createdOrders.slice(0, 10),
      total: count,
    });
  } catch (error: any) {
    console.error("Error seeding orders:", error?.message || error);
    return NextResponse.json({ error: "Failed to seed orders", details: error?.message }, { status: 500 });
  }
}
