import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, saleItems, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  paymentMethod: z.string().optional(),
  notes:         z.string().optional(),
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

    const updateData: Record<string, unknown> = {};
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.notes         !== undefined) updateData.notes         = data.notes || null;

    const [updated] = await db.update(sales)
      .set(updateData)
      .where(eq(sales.id, parseInt(id)))
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
