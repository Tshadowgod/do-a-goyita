import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  price:       z.number().positive().optional(),
  cost:        z.number().nonnegative().optional(),
  quantity:    z.number().int().nonnegative().optional(),
  barcode:     z.string().optional(),
  imageUrl:    z.string().optional(),
  category:    z.string().optional(),
  unit:        z.string().optional(),
  minStock:    z.number().int().nonnegative().optional(),
  active:      z.boolean().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [product] = await db.select().from(products).where(eq(products.id, parseInt(id)));
    if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.price != null) updateData.price = String(data.price);
    if (data.cost  != null) updateData.cost  = String(data.cost);

    const [updated] = await db.update(products)
      .set(updateData)
      .where(eq(products.id, parseInt(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.update(products)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(products.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
