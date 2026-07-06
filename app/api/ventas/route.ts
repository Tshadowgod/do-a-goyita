import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, saleItems, products } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { consumeStock } from "@/lib/inventory";

const saleItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity:  z.number().int().positive(),
  unitPrice: z.number().positive(),
});

const saleSchema = z.object({
  items:         z.array(saleItemSchema).min(1),
  paymentMethod: z.string().optional(),
  notes:         z.string().optional(),
});

export async function GET() {
  try {
    const rows = await db.query.sales.findMany({
      with: { items: true },
      orderBy: [desc(sales.createdAt)],
      limit: 100,
    });
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = saleSchema.parse(body);

    // Fetch every product once; validate stock against the combined quantity per product
    const found = await db.select().from(products)
      .where(inArray(products.id, [...new Set(data.items.map((i) => i.productId))]));
    const byId = new Map(found.map((p) => [p.id, p]));

    const requested = new Map<number, number>();
    for (const i of data.items) requested.set(i.productId, (requested.get(i.productId) ?? 0) + i.quantity);

    const insufficient: string[] = [];
    for (const [productId, quantity] of requested) {
      const product = byId.get(productId);
      if (!product) { insufficient.push(`Producto #${productId} no existe`); continue; }
      if ((product.quantity ?? 0) < quantity) {
        insufficient.push(`${product.name} (disponible: ${product.quantity ?? 0}, pediste: ${quantity})`);
      }
    }
    if (insufficient.length) {
      return NextResponse.json(
        { error: `Stock insuficiente: ${insufficient.join("; ")}` },
        { status: 400 },
      );
    }

    const total = data.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    const [sale] = await db.insert(sales).values({
      total: String(total),
      paymentMethod: data.paymentMethod ?? "efectivo",
      notes: data.notes ?? null,
    }).returning();

    // get product names, discount stock and record COGS at the product's reference cost
    for (const item of data.items) {
      const product = byId.get(item.productId);
      if (!product) continue;

      const cogs = await consumeStock(item.productId, item.quantity);

      await db.insert(saleItems).values({
        saleId:      sale.id,
        productId:   item.productId,
        productName: product.name,
        quantity:    item.quantity,
        unitPrice:   String(item.unitPrice),
        subtotal:    String(item.unitPrice * item.quantity),
        cost:        String(cogs),
      });
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Error al registrar venta" }, { status: 500 });
  }
}
