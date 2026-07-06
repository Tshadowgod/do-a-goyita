import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, ilike, or, asc } from "drizzle-orm";
import { z } from "zod";

const productSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  price:       z.number().positive(),
  cost:        z.number().nonnegative().optional(),
  quantity:    z.number().int().nonnegative(),
  barcode:     z.string().optional(),
  imageUrl:    z.string().url().optional().or(z.literal("")),
  category:    z.string().optional(),
  unit:        z.string().optional(),
  minStock:    z.number().int().nonnegative().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const barcode = searchParams.get("barcode");

    let rows;
    if (barcode) {
      rows = await db.select().from(products)
        .where(eq(products.barcode, barcode));
    } else if (q) {
      rows = await db.select().from(products)
        .where(or(
          ilike(products.name, `%${q}%`),
          ilike(products.category, `%${q}%`),
        ))
        .orderBy(asc(products.name));
    } else {
      rows = await db.select().from(products).orderBy(asc(products.name));
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = productSchema.parse(body);

    const [product] = await db.insert(products).values({
      ...data,
      quantity: data.quantity,
      price:    String(data.price),
      cost:     data.cost != null && data.cost !== 0 ? String(data.cost) : null,
      imageUrl: data.imageUrl  || null,
      barcode:  data.barcode   || null,
      category: data.category  || null,
    }).returning();

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
