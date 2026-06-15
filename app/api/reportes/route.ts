import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, saleItems, products, expenses } from "@/lib/db/schema";
import { gte, lte, and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { boliviaDayStart, boliviaDayEnd } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    const conditions = [];
    if (from) conditions.push(gte(sales.createdAt, boliviaDayStart(from)));
    if (to)   conditions.push(lte(sales.createdAt, boliviaDayEnd(to)));

    const expConditions = [];
    if (from) expConditions.push(gte(expenses.date, from));
    if (to)   expConditions.push(lte(expenses.date, to));

    const [salesTotal] = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      count: sql<number>`COUNT(*)`,
    }).from(sales).where(conditions.length ? and(...conditions) : undefined);

    // Cost of goods sold = sum(product cost * quantity sold) over the period
    const [cogsRow] = await db.select({
      total: sql<string>`COALESCE(SUM(${products.cost} * ${saleItems.quantity}), 0)`,
    }).from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(conditions.length ? and(...conditions) : undefined);

    const [expensesTotal] = await db.select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    }).from(expenses).where(expConditions.length ? and(...expConditions) : undefined);

    const expensesByCategory = await db.select({
      category: expenses.category,
      total:    sql<string>`SUM(${expenses.amount})`,
    }).from(expenses)
      .where(expConditions.length ? and(...expConditions) : undefined)
      .groupBy(expenses.category);

    const sales_ = parseFloat(salesTotal?.total ?? "0");
    const cogs   = parseFloat(cogsRow?.total ?? "0");
    const exp    = parseFloat(expensesTotal?.total ?? "0");

    return NextResponse.json({
      salesTotal:          sales_,
      salesCount:          salesTotal?.count ?? 0,
      cogsTotal:           cogs,
      grossProfit:         sales_ - cogs,
      expensesTotal:       exp,
      netProfit:           sales_ - cogs - exp,
      expensesByCategory,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener reportes" }, { status: 500 });
  }
}
