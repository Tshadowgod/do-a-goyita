import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "node:fs";
const sql = neon(process.env.DATABASE_URL);

const order = ["Despensa","Galletas y dulces","Bebidas e infusiones","Aceites y condimentos","Enlatados y conservas","Untables y mermeladas","Limpieza","Hogar","Cigarrillos"];
const rows = await sql`SELECT id, name, category FROM products WHERE price = 0 AND active = true ORDER BY name`;
rows.sort((a, b) => {
  const ra = order.indexOf(a.category), rb = order.indexOf(b.category);
  return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.name.localeCompare(b.name);
});
let n = 0, last = "";
const map = [];
for (const r of rows) {
  if (r.category !== last) { console.log("\n### " + r.category); last = r.category; }
  n++; map.push({ n, id: r.id });
  console.log(n + ": " + r.name);
}
writeFileSync(new URL("./precios-map.json", import.meta.url), JSON.stringify(map));
console.log("\nTOTAL: " + n);
