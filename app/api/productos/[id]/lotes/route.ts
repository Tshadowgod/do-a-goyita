import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { inventoryLots } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { addLot } from "@/lib/inventory";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const lots = await db.select().from(inventoryLots)
      .where(eq(inventoryLots.productId, parseInt(id)))
      .orderBy(asc(inventoryLots.purchaseDate), asc(inventoryLots.id));
    return NextResponse.json(lots);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener lotes" }, { status: 500 });
  }
}

const lotSchema = z.object({
  quantity:     z.number().int().positive(),
  unitCost:     z.number().nonnegative(),
  purchaseDate: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = lotSchema.parse(body);

    await addLot(parseInt(id), data.quantity, data.unitCost, data.purchaseDate);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
