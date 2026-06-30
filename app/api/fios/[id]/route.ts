import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { debtors, fios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/fios/[id] — get all fios for a debtor
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await db.select().from(fios)
      .where(eq(fios.debtorId, Number(id)))
      .orderBy(fios.date);
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener fíos" }, { status: 500 });
  }
}

// PATCH /api/fios/[id] — mark fio as paid or delete debtor
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.type === "pay_fio") {
      const [row] = await db.update(fios)
        .set({ paid: true, paidAt: new Date() })
        .where(eq(fios.id, Number(id)))
        .returning();
      return NextResponse.json(row);
    }

    if (body.type === "delete_debtor") {
      await db.update(debtors).set({ active: false }).where(eq(debtors.id, Number(id)));
      return NextResponse.json({ ok: true });
    }

    if (body.type === "delete_fio") {
      await db.delete(fios).where(eq(fios.id, Number(id)));
      return NextResponse.json({ ok: true });
    }

    if (body.type === "update_debtor") {
      const [row] = await db.update(debtors)
        .set({ name: body.name, phone: body.phone || null, notes: body.notes || null })
        .where(eq(debtors.id, Number(id)))
        .returning();
      return NextResponse.json(row);
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
