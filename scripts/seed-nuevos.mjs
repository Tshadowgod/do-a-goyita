import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const sql = neon(process.env.DATABASE_URL);
const __dirname = dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(readFileSync(join(__dirname, "nuevos-manifest.json"), "utf-8"));

// Se crean con precio 0 (marcador) y stock 0 -> NO aparecen en la tienda
// hasta que el dueño les ponga precio y stock desde el panel.
// active=true para que se vean y se puedan editar en /inventario.
let creados = 0, saltados = 0;
for (const p of items) {
  const imageUrl = `/productos/${p.slug}.jpg`;
  const existing = await sql`SELECT id FROM products WHERE name = ${p.name} LIMIT 1`;
  if (existing.length > 0) {
    console.log(`SALTADO (ya existe): ${p.name}`);
    saltados++;
    continue;
  }
  await sql`
    INSERT INTO products (name, description, price, image_url, category, unit, active, quantity)
    VALUES (${p.name}, ${p.description}, 0, ${imageUrl}, ${p.category}, ${p.unit}, true, 0)`;
  console.log(`OK -> ${p.name}`);
  creados++;
}
console.log(`\nListo. Creados: ${creados}, saltados: ${saltados}`);
