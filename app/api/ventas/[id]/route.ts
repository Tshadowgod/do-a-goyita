import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, saleItems, products, lotConsumptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { consumeFifo, restoreSaleConsumptions } from "@/lib/inventory";

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

    // If items were provided, reconcile stock (FIFO) and replace line items
    if (data.items) {
      // Validate stock: available = current stock + what THIS sale already consumed
      const oldCons = await db.select().from(lotConsumptions).where(eq(lotConsumptions.saleId, saleId));
      const consumedByProduct = new Map<number, number>();
      for (const c of oldCons) {
        if (c.productId != null) consumedByProduct.set(c.productId, (consumedByProduct.get(c.productId) ?? 0) + c.quantity);
      }
      const insufficient: string[] = [];
      for (const item of data.items) {
        if (item.productId == null) continue;
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        if (!product) { insufficient.push(`Producto #${item.productId} no existe`); continue; }
        const available = (product.quantity ?? 0) + (consumedByProduct.get(item.productId) ?? 0);
        if (available < item.quantity) {
          insufficient.push(`${product.name} (disponible: ${available}, pediste: ${item.quantity})`);
        }
      }
      if (insufficient.length) {
        return NextResponse.json(
          { error: `Stock insuficiente: ${insufficient.join("; ")}` },
          { status: 400 },
        );
      }

      // 1. Return the lots consumed by the original sale
      await restoreSaleConsumptions(saleId);

      // 2. Remove old line items
      await db.delete(saleItems).where(eq(saleItems.saleId, saleId));

      // 3. Insert new line items, consuming stock again via FIFO
      let total = 0;
      for (const item of data.items) {
        const subtotal = item.unitPrice * item.quantity;
        total += subtotal;

        const cogs = item.productId != null
          ? await consumeFifo(saleId, item.productId, item.quantity)
          : 0;

        await db.insert(saleItems).values({
          saleId,
          productId:   item.productId ?? null,
          productName: item.productName,
          quantity:    item.quantity,
          unitPrice:   String(item.unitPrice),
          subtotal:    String(subtotal),
          cost:        String(cogs),
        });
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

    // Return the consumed lots to stock, then delete (saleItems cascade)
    await restoreSaleConsumptions(saleId);
    await db.delete(sales).where(eq(sales.id, saleId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar venta" }, { status: 500 });
  }
}
