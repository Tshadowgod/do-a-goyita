import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const sql = neon(process.env.DATABASE_URL);
const __dirname = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(readFileSync(join(__dirname, "precios-map.json"), "utf-8"));
const hoy = new Date().toISOString().slice(0, 10);

let actualizados = 0;
for (const { id } of map) {
  // Precio temporal 1 Bs (marcador) para que no muestre Bs 0; el dueño lo ajusta en el panel.
  await sql`UPDATE products SET price = '1', quantity = 1, updated_at = now() WHERE id = ${id}`;
  // Lote de 1 unidad solo si el producto aun no tiene lotes (idempotente).
  const lotes = await sql`SELECT id FROM inventory_lots WHERE product_id = ${id} LIMIT 1`;
  if (lotes.length === 0) {
    await sql`INSERT INTO inventory_lots (product_id, quantity, remaining, unit_cost, purchase_date)
              VALUES (${id}, 1, 1, '0', ${hoy})`;
  }
  actualizados++;
}
console.log(`Actualizados: ${actualizados} productos (stock 1, precio 1 Bs marcador).`);
