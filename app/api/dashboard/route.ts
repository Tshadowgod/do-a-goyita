import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { sales, saleItems, expenses, products } from "@/lib/db/schema";
import { gte, and, eq, count, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { FIXED_EXPENSE_CATEGORIES, boliviaDayStart, boliviaToday } from "@/lib/utils";
import type { DashboardStats, SalesChartPoint } from "@/types";

export async function GET() {
  try {
    const todayStr        = boliviaToday();                 // "YYYY-MM-DD" in Bolivia
    const today           = boliviaDayStart(todayStr);      // Bolivia midnight as UTC instant
    const firstOfMonthStr = todayStr.slice(0, 8) + "01";
    const firstOfMonth    = boliviaDayStart(firstOfMonthStr);

    // Chart window – last 30 Bolivia calendar days
    const DAY = 86400000;
    const labelBase  = new Date(`${todayStr}T00:00:00Z`); // label anchor (UTC, no DST)
    const chartFromStr = new Date(labelBase.getTime() - 29 * DAY).toISOString().split("T")[0];
    const chartFrom    = boliviaDayStart(chartFromStr);

    const [
      todaySalesRows,
      monthSalesRows,
      [todayCogsRow],
      [monthCogsRow],
      monthExpensesRows,
      fixedExpensesRows,
      totalProductsRows,
      lowStockRows,
      salesByDay,
      expensesByDay,
    ] = await Promise.all([
      // Sales today
      db.select({
        total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      }).from(sales).where(gte(sales.createdAt, today)),

      // Sales this month
      db.select({
        total: sql<string>`COALESCE(SUM(${sales.total}), 0)`,
      }).from(sales).where(gte(sales.createdAt, firstOfMonth)),

      // Cost of goods sold (FIFO cost recorded on each sale line)
      db.select({
        total: sql<string>`COALESCE(SUM(${saleItems.cost}), 0)`,
      }).from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(gte(sales.createdAt, today)),

      db.select({
        total: sql<string>`COALESCE(SUM(${saleItems.cost}), 0)`,
      }).from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(gte(sales.createdAt, firstOfMonth)),

      // Expenses this month
      db.select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      }).from(expenses).where(gte(expenses.date, firstOfMonthStr)),

      // Fixed expenses this month
      db.select({
        total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
      }).from(expenses).where(
        and(
          gte(expenses.date, firstOfMonthStr),
          inArray(expenses.category, FIXED_EXPENSE_CATEGORIES),
        )
      ),

      // Total & low-stock products
      db.select({ count: count() }).from(products).where(eq(products.active, true)),
      db.select({ count: count() }).from(products).where(
        and(eq(products.active, true), sql`${products.quantity} <= ${products.minStock}`)
      ),

      // Sales grouped by Bolivia calendar day (timestamps are UTC; Bolivia = UTC-4)
      db.select({
        day:   sql<string>`to_char(${sales.createdAt} - interval '4 hours', 'YYYY-MM-DD')`,
        total: sql<string>`SUM(${sales.total})`,
      }).from(sales)
        .where(gte(sales.createdAt, chartFrom))
        .groupBy(sql`1`),

      // Expenses grouped by their date column
      db.select({
        day:   expenses.date,
        total: sql<string>`SUM(${expenses.amount})`,
      }).from(expenses)
        .where(gte(expenses.date, chartFromStr))
        .groupBy(expenses.date),
    ]);

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

    // Chart data – last 30 days (Bolivia calendar days), filled from the grouped queries
    const salesMap    = new Map(salesByDay.map((r) => [r.day, parseFloat(r.total)]));
    const expensesMap = new Map(expensesByDay.map((r) => [r.day, parseFloat(r.total)]));
    const chart: SalesChartPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStr = new Date(labelBase.getTime() - i * DAY).toISOString().split("T")[0];
      chart.push({
        date:     dayStr,
        ingresos: salesMap.get(dayStr) ?? 0,
        egresos:  expensesMap.get(dayStr) ?? 0,
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
