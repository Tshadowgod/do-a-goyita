import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name:    z.string().min(1).optional(),
  contact: z.string().optional(),
  phone:   z.string().optional(),
  email:   z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes:   z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const body = await req.json();
    const data = updateSchema.parse(body);
    const [row] = await db.update(suppliers).set({
      ...data,
      email:   data.email   || null,
      contact: data.contact || null,
      phone:   data.phone   || null,
      address: data.address || null,
      notes:   data.notes   || null,
    }).where(eq(suppliers.id, id)).returning();
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    await db.update(suppliers).set({ active: false }).where(eq(suppliers.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al eliminar proveedor" }, { status: 500 });
  }
}
