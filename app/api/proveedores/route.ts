import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { ilike, or } from "drizzle-orm";
import { z } from "zod";

const supplierSchema = z.object({
  name:    z.string().min(1),
  contact: z.string().optional(),
  phone:   z.string().optional(),
  email:   z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes:   z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const rows = q
      ? await db.select().from(suppliers).where(
          or(ilike(suppliers.name, `%${q}%`), ilike(suppliers.contact, `%${q}%`))
        )
      : await db.select().from(suppliers);
    return NextResponse.json(rows.filter((s) => s.active));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al obtener proveedores" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = supplierSchema.parse(body);
    const [row] = await db.insert(suppliers).values({
      ...data,
      email:   data.email   || null,
      contact: data.contact || null,
      phone:   data.phone   || null,
      address: data.address || null,
      notes:   data.notes   || null,
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
