import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { addStock } from "@/lib/inventory";

const itemSchema = z.object({
  name:     z.string().min(1),
  quantity: z.number().int().positive(),
  cost:     z.number().nonnegative(),
  price:    z.number().positive().optional(),
});

const importSchema = z.object({
  items: z.array(itemSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = importSchema.parse(body);

    // Load existing active products once, index by normalized name
    const existing = await db.select().from(products).where(eq(products.active, true));
    const byName = new Map(existing.map((p) => [p.name.trim().toLowerCase(), p]));

    let created = 0;
    let updated = 0;
    const details: { name: string; action: "creado" | "actualizado"; quantity: number }[] = [];

    for (const item of items) {
      const key = item.name.trim().toLowerCase();
      const match = byName.get(key);

      if (match) {
        // Existing product → refresh cost (and optionally price), then add the purchased stock
        await db.update(products)
          .set({
            cost:      String(item.cost),
            ...(item.price != null ? { price: String(item.price) } : {}),
            updatedAt: new Date(),
          })
          .where(eq(products.id, match.id));
        await addStock(match.id, item.quantity);
        updated++;
        details.push({ name: match.name, action: "actualizado", quantity: item.quantity });
      } else {
        // New product → create with the purchased stock
        const [inserted] = await db.insert(products).values({
          name:     item.name.trim(),
          quantity: item.quantity,
          cost:     String(item.cost),
          price:    String(item.price ?? item.cost),
          unit:     "unidad",
        }).returning();
        if (inserted) byName.set(key, inserted);
        created++;
        details.push({ name: item.name.trim(), action: "creado", quantity: item.quantity });
      }
    }

    return NextResponse.json({ created, updated, details });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
