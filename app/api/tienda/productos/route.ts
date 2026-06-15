import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and, gt, asc } from "drizzle-orm";

// Public catalog: only active products with stock available
export async function GET() {
  try {
    const rows = await db.select({
      id:       products.id,
      name:     products.name,
      price:    products.price,
      quantity: products.quantity,
      category: products.category,
      unit:     products.unit,
      imageUrl: products.imageUrl,
    }).from(products)
      .where(and(eq(products.active, true), gt(products.quantity, 0)))
      .orderBy(asc(products.name));
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}
