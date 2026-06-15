import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, saleItems, expenses, products } from "@/lib/db/schema";
import { gte, and, eq, lt, count, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { FIXED_EXPENSE_CATEGORIES, boliviaDayStart, boliviaToday } from "@/lib/utils";
import type { DashboardStats, SalesChartPoint } from "@/types";

export async function GET() {
  try {
    const todayStr        = boliviaToday();                 // "YYYY-MM-DD" in Bolivia
    const today           = boliviaDayStart(todayStr);      // Bolivia midnight as UTC instant
    const firstOfMonthStr = todayStr.slice(0, 8) + "01";
    const firstOfMonth    = boliviaDayStart(firstOfMonthStr);

    // Sales today
    const todaySalesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
    }).from(sales).where(gte(sales.createdAt, today));

    // Sales this month
    const monthSalesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
    }).from(sales).where(gte(sales.createdAt, firstOfMonth));

    // Cost of goods sold (today / this month)
    const [todayCogsRow] = await db.select({
      total: sql<string>`COALESCE(SUM(${products.cost} * ${saleItems.quantity}), 0)`,
    }).from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(gte(sales.createdAt, today));

    const [monthCogsRow] = await db.select({
      total: sql<string>`COALESCE(SUM(${products.cost} * ${saleItems.quantity}), 0)`,
    }).from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(gte(sales.createdAt, firstOfMonth));

    // Expenses this month
    const monthExpensesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    }).from(expenses).where(gte(expenses.date, firstOfMonthStr));

    // Fixed expenses this month
    const fixedExpensesRows = await db.select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    }).from(expenses).where(
      and(
        gte(expenses.date, firstOfMonthStr),
        inArray(expenses.category, FIXED_EXPENSE_CATEGORIES),
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
    const cogsToday         = parseFloat(todayCogsRow?.total ?? "0");
    const cogsThisMonth     = parseFloat(monthCogsRow?.total ?? "0");
    const grossProfit       = salesThisMonth - cogsThisMonth;

    // Break-even calculation – product cost (COGS) and non-fixed expenses are variable
    const variableCosts = cogsThisMonth + Math.max(0, expensesThisMonth - fixedCosts);
    const variableCostRatio = salesThisMonth > 0 ? variableCosts / salesThisMonth : 0;
    const contributionMargin = 1 - variableCostRatio;
    const breakEvenRevenue = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
    const marginOfSafety = salesThisMonth > 0
      ? ((salesThisMonth - breakEvenRevenue) / salesThisMonth) * 100
      : 0;

    // Chart data – last 30 days (Bolivia calendar days)
    const chart: SalesChartPoint[] = [];
    const labelBase = new Date(`${todayStr}T00:00:00Z`); // label anchor (UTC, no DST)
    const DAY = 86400000;
    for (let i = 29; i >= 0; i--) {
      const dayStr     = new Date(labelBase.getTime() - i * DAY).toISOString().split("T")[0];
      const nextDayStr = new Date(labelBase.getTime() - (i - 1) * DAY).toISOString().split("T")[0];
      const dayStart   = boliviaDayStart(dayStr);
      const dayEnd     = boliviaDayStart(nextDayStr);

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

    const salesToday = parseFloat(todaySalesRows[0]?.total ?? "0");

    const stats: DashboardStats = {
      salesToday,
      profitToday:       salesToday - cogsToday,
      salesThisMonth,
      cogsThisMonth,
      grossProfit,
      expensesThisMonth,
      netIncome:         salesThisMonth - cogsThisMonth - expensesThisMonth,
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
