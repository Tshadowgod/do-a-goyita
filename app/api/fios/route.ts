import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { debtors, fios } from "@/lib/db/schema";
import { eq, sum, and, ilike } from "drizzle-orm";
import { z } from "zod";

const debtorSchema = z.object({
  name:  z.string().min(1),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const fioSchema = z.object({
  debtorId:    z.number().int().positive(),
  amount:      z.number().positive(),
  description: z.string().min(1),
  date:        z.string(),
});

// GET /api/fios?q=... — list debtors with their pending total
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    const rows = q
      ? await db.select().from(debtors).where(
          and(eq(debtors.active, true), ilike(debtors.name, `%${q}%`))
        )
      : await db.select().from(debtors).where(eq(debtors.active, true));

    // For each debtor, sum pending fios
    const withTotals = await Promise.all(
      rows.map(async (d) => {
        const [{ total }] = await db
          .select({ total: sum(fios.amount) })
          .from(fios)
          .where(and(eq(fios.debtorId, d.id), eq(fios.paid, false)));
        return { ...d, totalPending: Number(total ?? 0) };
      })
    );

    return NextResponse.json(withTotals);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener fíos" }, { status: 500 });
  }
}

// POST /api/fios  — create debtor OR fio depending on body
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Create debtor
    if (body.type === "debtor") {
      const data = debtorSchema.parse(body);
      const [row] = await db.insert(debtors).values({
        name:  data.name,
        phone: data.phone || null,
        notes: data.notes || null,
      }).returning();
      return NextResponse.json(row, { status: 201 });
    }

    // Create fio
    const data = fioSchema.parse(body);
    const [row] = await db.insert(fios).values({
      debtorId:    data.debtorId,
      amount:      String(data.amount),
      description: data.description,
      date:        data.date,
    }).returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
