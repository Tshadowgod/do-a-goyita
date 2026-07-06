import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { orders, orderItems, sales, saleItems, products, debtors, fios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { consumeStock } from "@/lib/inventory";

const actionSchema = z.object({
  action:      z.enum(["confirmar", "rechazar", "fiar"]),
  paymentMethod: z.string().optional(),
  debtorId:    z.number().int().positive().optional(),
  debtorName:  z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    const { action, paymentMethod, debtorId, debtorName } = actionSchema.parse(await req.json());

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (order.status !== "pendiente") {
      return NextResponse.json({ error: "El pedido ya fue procesado" }, { status: 400 });
    }

    if (action === "rechazar") {
      const [updated] = await db.update(orders)
        .set({ status: "rechazado" })
        .where(eq(orders.id, orderId))
        .returning();
      return NextResponse.json(updated);
    }

    // action === "confirmar" → validate stock, then create the sale
    const insufficient: string[] = [];
    for (const item of order.items) {
      if (item.productId == null) { insufficient.push(`${item.productName} (ya no existe)`); continue; }
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (!product) { insufficient.push(`${item.productName} (ya no existe)`); continue; }
      if ((product.quantity ?? 0) < item.quantity) {
        insufficient.push(`${product.name} (disponible: ${product.quantity ?? 0}, pedido: ${item.quantity})`);
      }
    }
    if (insufficient.length) {
      return NextResponse.json(
        { error: `No hay stock suficiente: ${insufficient.join("; ")}` },
        { status: 400 },
      );
    }

    const total = order.items.reduce((s, i) => s + parseFloat(i.subtotal), 0);

    // Determine payment method and whether this is a fío
    const isFio = action === "fiar";
    const method = isFio ? "fío" : (paymentMethod ?? "efectivo");

    const [sale] = await db.insert(sales).values({
      total:         String(total),
      paymentMethod: method,
      notes:         `Pedido en línea de ${order.customerName}${isFio ? " (fío)" : ""}`,
    }).returning();

    for (const item of order.items) {
      if (item.productId == null) continue;
      const cogs = await consumeStock(item.productId, item.quantity);
      await db.insert(saleItems).values({
        saleId:      sale.id,
        productId:   item.productId,
        productName: item.productName,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice,
        subtotal:    item.subtotal,
        cost:        String(cogs),
      });
    }

    // If fío: look up or create debtor, then register the fío
    if (isFio) {
      let dId = debtorId;
      if (!dId) {
        const name = debtorName?.trim() || order.customerName;
        const [newDebtor] = await db.insert(debtors).values({ name }).returning();
        dId = newDebtor.id;
      }
      await db.insert(fios).values({
        debtorId:    dId,
        amount:      String(total),
        description: `Pedido #${orderId} — ${order.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ")}`,
        date:        new Date().toISOString().slice(0, 10),
      });
    }

    const [updated] = await db.update(orders)
      .set({ status: "confirmado", saleId: sale.id })
      .where(eq(orders.id, orderId))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.delete(orderItems).where(eq(orderItems.orderId, parseInt(id)));
    await db.delete(orders).where(eq(orders.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar pedido" }, { status: 500 });
  }
}
