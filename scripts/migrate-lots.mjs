import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

console.log("1. Adding cost column to sale_items...");
await sql`ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost numeric(10,2) DEFAULT 0`;

console.log("2. Creating inventory_lots...");
await sql`
  CREATE TABLE IF NOT EXISTS inventory_lots (
    id serial PRIMARY KEY,
    product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity integer NOT NULL,
    remaining integer NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    purchase_date date NOT NULL,
    created_at timestamp DEFAULT now()
  )`;

console.log("3. Creating lot_consumptions...");
await sql`
  CREATE TABLE IF NOT EXISTS lot_consumptions (
    id serial PRIMARY KEY,
    sale_id integer NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    lot_id integer REFERENCES inventory_lots(id) ON DELETE SET NULL,
    product_id integer REFERENCES products(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    unit_cost numeric(10,2) NOT NULL
  )`;

console.log("4. Deleting test sales (cascade)...");
const delSales = await sql`DELETE FROM sales`;
console.log("   sales deleted");

console.log("5. Creating initial lots for existing products (qty > 0, no lots yet)...");
const lots = await sql`
  INSERT INTO inventory_lots (product_id, quantity, remaining, unit_cost, purchase_date)
  SELECT id, quantity, quantity, COALESCE(cost, 0), CURRENT_DATE
  FROM products
  WHERE active = true AND quantity > 0
    AND id NOT IN (SELECT product_id FROM inventory_lots)
  RETURNING id`;
console.log(`   ${lots.length} initial lots created`);

console.log("Done.");
