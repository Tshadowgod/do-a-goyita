import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { orders, orderItems, products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";

const orderSchema = z.object({
  customerName: z.string().min(1, "Nombre requerido").max(255),
  notes:        z.string().max(500).optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    quantity:  z.number().int().positive(),
  })).min(1, "El pedido está vacío"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = orderSchema.parse(body);

    // Validate stock and compute total from server-side prices
    let total = 0;
    const lines: { productId: number; productName: string; quantity: number; unitPrice: number; subtotal: number }[] = [];
    const insufficient: string[] = [];

    // Merge duplicate product lines so stock is validated against the combined quantity
    const merged = new Map<number, number>();
    for (const i of data.items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity);
    const items = [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));

    const found = await db.select().from(products)
      .where(inArray(products.id, items.map((i) => i.productId)));
    const byId = new Map(found.map((p) => [p.id, p]));

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product || !product.active) { insufficient.push(`Producto #${item.productId} no disponible`); continue; }
      if ((product.quantity ?? 0) < item.quantity) {
        insufficient.push(`${product.name} (disponible: ${product.quantity ?? 0})`);
        continue;
      }
      const unitPrice = parseFloat(product.price);
      const subtotal  = unitPrice * item.quantity;
      total += subtotal;
      lines.push({ productId: product.id, productName: product.name, quantity: item.quantity, unitPrice, subtotal });
    }

    if (insufficient.length) {
      return NextResponse.json(
        { error: `Algunos productos ya no tienen stock suficiente: ${insufficient.join("; ")}` },
        { status: 400 },
      );
    }

    const [order] = await db.insert(orders).values({
      customerName: data.customerName.trim(),
      status:       "pendiente",
      total:        String(total),
      notes:        data.notes?.trim() || null,
    }).returning();

    await db.insert(orderItems).values(lines.map((l) => ({
      orderId:     order.id,
      productId:   l.productId,
      productName: l.productName,
      quantity:    l.quantity,
      unitPrice:   String(l.unitPrice),
      subtotal:    String(l.subtotal),
    })));

    return NextResponse.json({ ok: true, orderId: order.id, total }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Error al enviar el pedido" }, { status: 500 });
  }
}
