import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, expenses } from "@/lib/db/schema";
import { gte, lte, and } from "drizzle-orm";
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

    const [expensesTotal] = await db.select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    }).from(expenses).where(expConditions.length ? and(...expConditions) : undefined);

    const expensesByCategory = await db.select({
      category: expenses.category,
      total:    sql<string>`SUM(${expenses.amount})`,
    }).from(expenses)
      .where(expConditions.length ? and(...expConditions) : undefined)
      .groupBy(expenses.category);

    return NextResponse.json({
      salesTotal:          parseFloat(salesTotal?.total ?? "0"),
      salesCount:          salesTotal?.count ?? 0,
      expensesTotal:       parseFloat(expensesTotal?.total ?? "0"),
      expensesByCategory,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener reportes" }, { status: 500 });
  }
}
