import { db } from "@/lib/db";
import { inventoryLots, lotConsumptions, products } from "@/lib/db/schema";
import { eq, and, gt, asc, sql } from "drizzle-orm";

/** Recalculate a product's stock as the sum of its remaining lot quantities. */
export async function recomputeProductQuantity(productId: number): Promise<number> {
  const [row] = await db.select({
    total: sql<string>`COALESCE(SUM(${inventoryLots.remaining}), 0)`,
  }).from(inventoryLots).where(eq(inventoryLots.productId, productId));
  const total = parseInt(row?.total ?? "0", 10);
  await db.update(products)
    .set({ quantity: total, updatedAt: new Date() })
    .where(eq(products.id, productId));
  return total;
}

/** Register a purchase as a new lot, refresh latest cost, and recompute stock. */
export async function addLot(
  productId: number,
  quantity: number,
  unitCost: number,
  purchaseDate?: string,
): Promise<void> {
  await db.insert(inventoryLots).values({
    productId,
    quantity,
    remaining:    quantity,
    unitCost:     String(unitCost),
    purchaseDate: purchaseDate || new Date().toISOString().split("T")[0],
  });
  // keep product.cost as the most recent purchase cost (for display/reference)
  await db.update(products)
    .set({ cost: String(unitCost), updatedAt: new Date() })
    .where(eq(products.id, productId));
  await recomputeProductQuantity(productId);
}

/**
 * Consume `quantity` of a product using FIFO (oldest lots first).
 * Records consumption in the ledger and returns the total cost of goods sold.
 */
export async function consumeFifo(
  saleId: number,
  productId: number,
  quantity: number,
): Promise<number> {
  const lots = await db.select().from(inventoryLots)
    .where(and(eq(inventoryLots.productId, productId), gt(inventoryLots.remaining, 0)))
    .orderBy(asc(inventoryLots.purchaseDate), asc(inventoryLots.id));

  let need = quantity;
  let cogs = 0;

  for (const lot of lots) {
    if (need <= 0) break;
    const take = Math.min(lot.remaining, need);
    const unitCost = parseFloat(lot.unitCost);
    cogs += take * unitCost;
    need -= take;

    await db.update(inventoryLots)
      .set({ remaining: lot.remaining - take })
      .where(eq(inventoryLots.id, lot.id));

    await db.insert(lotConsumptions).values({
      saleId, lotId: lot.id, productId, quantity: take, unitCost: lot.unitCost,
    });
  }

  // Oversold beyond available lots: value the remainder at the product's last cost
  if (need > 0) {
    const [p] = await db.select().from(products).where(eq(products.id, productId));
    const fallback = p?.cost ? parseFloat(p.cost) : 0;
    cogs += need * fallback;
    await db.insert(lotConsumptions).values({
      saleId, lotId: null, productId, quantity: need, unitCost: String(fallback),
    });
  }

  await recomputeProductQuantity(productId);
  return cogs;
}

/** Undo all lot consumptions of a sale (used when editing or deleting it). */
export async function restoreSaleConsumptions(saleId: number): Promise<void> {
  const cons = await db.select().from(lotConsumptions).where(eq(lotConsumptions.saleId, saleId));
  const touched = new Set<number>();

  for (const c of cons) {
    if (c.lotId != null) {
      const [lot] = await db.select().from(inventoryLots).where(eq(inventoryLots.id, c.lotId));
      if (lot) {
        await db.update(inventoryLots)
          .set({ remaining: lot.remaining + c.quantity })
          .where(eq(inventoryLots.id, c.lotId));
      }
    }
    if (c.productId != null) touched.add(c.productId);
  }

  await db.delete(lotConsumptions).where(eq(lotConsumptions.saleId, saleId));
  for (const pid of touched) await recomputeProductQuantity(pid);
}
