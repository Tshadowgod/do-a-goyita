import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, saleItems, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const itemSchema = z.object({
  productId:   z.number().int().positive().nullable().optional(),
  productName: z.string().min(1),
  quantity:    z.number().int().positive(),
  unitPrice:   z.number().nonnegative(),
});

const updateSchema = z.object({
  paymentMethod: z.string().optional(),
  notes:         z.string().optional(),
  items:         z.array(itemSchema).min(1).optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, parseInt(id)),
      with: { items: true },
    });
    if (!sale) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(sale);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener venta" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const saleId = parseInt(id);
    const updateData: Record<string, unknown> = {};
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.notes         !== undefined) updateData.notes         = data.notes || null;

    // If items were provided, reconcile stock and replace line items
    if (data.items) {
      // 1. Restore stock from the existing items
      const oldItems = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
      for (const item of oldItems) {
        if (item.productId == null) continue;
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        if (!product) continue;
        await db.update(products)
          .set({ quantity: (product.quantity ?? 0) + item.quantity, updatedAt: new Date() })
          .where(eq(products.id, item.productId));
      }

      // 2. Remove old line items
      await db.delete(saleItems).where(eq(saleItems.saleId, saleId));

      // 3. Insert new line items and deduct stock
      let total = 0;
      for (const item of data.items) {
        const subtotal = item.unitPrice * item.quantity;
        total += subtotal;

        await db.insert(saleItems).values({
          saleId,
          productId:   item.productId ?? null,
          productName: item.productName,
          quantity:    item.quantity,
          unitPrice:   String(item.unitPrice),
          subtotal:    String(subtotal),
        });

        if (item.productId != null) {
          const [product] = await db.select().from(products).where(eq(products.id, item.productId));
          if (product) {
            await db.update(products)
              .set({ quantity: Math.max(0, (product.quantity ?? 0) - item.quantity), updatedAt: new Date() })
              .where(eq(products.id, item.productId));
          }
        }
      }

      updateData.total = String(total);
    }

    const [updated] = await db.update(sales)
      .set(updateData)
      .where(eq(sales.id, saleId))
      .returning();

    if (!updated) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Error al actualizar venta" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const saleId = parseInt(id);

    // Restore stock for each item before deleting the sale
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
    for (const item of items) {
      if (item.productId == null) continue;
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (!product) continue;
      await db.update(products)
        .set({ quantity: (product.quantity ?? 0) + item.quantity, updatedAt: new Date() })
        .where(eq(products.id, item.productId));
    }

    // saleItems are removed automatically via ON DELETE CASCADE
    await db.delete(sales).where(eq(sales.id, saleId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar venta" }, { status: 500 });
  }
}
