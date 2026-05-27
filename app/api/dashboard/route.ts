import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sales, saleItems, expenses, products } from "@/lib/db/schema";
import { gte, lte, and, eq, lt, count } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { FIXED_EXPENSE_CATEGORIES } from "@/lib/utils";
import type { DashboardStats, SalesChartPoint } from "@/types";

export async function GET() {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Sales today
    const todaySalesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
    }).from(sales).where(gte(sales.createdAt, today));

    // Sales this month
    const monthSalesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
    }).from(sales).where(gte(sales.createdAt, firstOfMonth));

    // Expenses this month
    const monthExpensesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    }).from(expenses).where(gte(expenses.date, firstOfMonth.toISOString().split("T")[0]));

    // Fixed expenses this month
    const fixedExpensesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    }).from(expenses).where(
      and(
        gte(expenses.date, firstOfMonth.toISOString().split("T")[0]),
        sql`${expenses.category} = ANY(${JSON.stringify(FIXED_EXPENSE_CATEGORIES)}::text[])`,
      )
    );

    // Total & low-stock products
    const totalProductsRows = await db.select({ count: count() }).from(products).where(eq(products.active, true));
    const lowStockRows = await db.select({ count: count() }).from(products).where(
      and(eq(products.active, true), sql`${products.quantity} <= ${products.minStock}`)
    );

    const salesThisMonth    = parseFloat(monthSalesRows[0]?.total ?? "0");
    const expensesThisMonth = parseFloat(monthExpensesRows[0]?.total ?? "0");
    const fixedCosts        = parseFloat(fixedExpensesRows[0]?.total ?? "0");

    // Break-even calculation
    const variableCostRatio = salesThisMonth > 0 ? (expensesThisMonth - fixedCosts) / salesThisMonth : 0;
    const contributionMargin = 1 - variableCostRatio;
    const breakEvenRevenue = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
    const marginOfSafety = salesThisMonth > 0
      ? ((salesThisMonth - breakEvenRevenue) / salesThisMonth) * 100
      : 0;

    // Chart data – last 30 days
    const chart: SalesChartPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const dayStr = dayStart.toISOString().split("T")[0];

      const [dayS] = await db.select({
        total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      }).from(sales).where(and(gte(sales.createdAt, dayStart), lt(sales.createdAt, dayEnd)));

      const [dayE] = await db.select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      }).from(expenses).where(eq(expenses.date, dayStr));

      chart.push({
        date:     dayStr,
        ingresos: parseFloat(dayS?.total ?? "0"),
        egresos:  parseFloat(dayE?.total ?? "0"),
      });
    }

    const stats: DashboardStats = {
      salesToday:        parseFloat(todaySalesRows[0]?.total ?? "0"),
      salesThisMonth,
      expensesThisMonth,
      netIncome:         salesThisMonth - expensesThisMonth,
      totalProducts:     totalProductsRows[0]?.count ?? 0,
      lowStockProducts:  lowStockRows[0]?.count ?? 0,
      breakEven: {
        fixedCosts,
        variableCostRatio,
        breakEvenRevenue,
        currentRevenue:  salesThisMonth,
        isCovered:       salesThisMonth >= breakEvenRevenue,
        marginOfSafety,
      },
    };

    return NextResponse.json({ stats, chart });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 });
  }
}
