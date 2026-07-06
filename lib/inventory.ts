import { db } from "@/lib/db";
import { products, saleItems } from "@/lib/db/schema";
import { eq, sql, inArray } from "drizzle-orm";

// Control de stock directo: el stock vive en products.quantity.
// (El sistema de lotes PEPS/FIFO fue retirado temporalmente; las tablas
// inventory_lots y lot_consumptions siguen en la BD para reactivarlo luego.)

/**
 * Descuenta stock de un producto y devuelve el costo (COGS) de la línea,
 * valorado al costo de referencia actual del producto.
 */
export async function consumeStock(productId: number, quantity: number): Promise<number> {
  const [p] = await db.update(products)
    .set({
      quantity:  sql`GREATEST(${products.quantity} - ${quantity}, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId))
    .returning({ cost: products.cost });
  const unitCost = p?.cost ? parseFloat(p.cost) : 0;
  return unitCost * quantity;
}

/** Suma stock a un producto (compras, ajustes, devoluciones). */
export async function addStock(productId: number, quantity: number): Promise<void> {
  await db.update(products)
    .set({
      quantity:  sql`${products.quantity} + ${quantity}`,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
}

/** Devuelve al stock las cantidades de los ítems de una venta (al editarla o eliminarla). */
export async function restoreSaleStock(saleId: number): Promise<void> {
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));

  const byProduct = new Map<number, number>();
  for (const i of items) {
    if (i.productId != null) byProduct.set(i.productId, (byProduct.get(i.productId) ?? 0) + i.quantity);
  }
  if (byProduct.size === 0) return;

  // Solo restaurar productos que aún existen
  const existing = await db.select({ id: products.id }).from(products)
    .where(inArray(products.id, [...byProduct.keys()]));
  for (const { id } of existing) {
    await addStock(id, byProduct.get(id)!);
  }
}
