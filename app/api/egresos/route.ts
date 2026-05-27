import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

const expenseSchema = z.object({
  amount:      z.number().positive(),
  description: z.string().min(1),
  category:    z.string().min(1),
  date:        z.string().min(1),
  notes:       z.string().optional(),
});

export async function GET() {
  try {
    const rows = await db.select().from(expenses).orderBy(desc(expenses.date));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Error al obtener egresos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = expenseSchema.parse(body);

    const [expense] = await db.insert(expenses).values({
      ...data,
      amount: String(data.amount),
    }).returning();

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear egreso" }, { status: 500 });
  }
}
