import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

console.log("Creating orders...");
await sql`
  CREATE TABLE IF NOT EXISTS orders (
    id serial PRIMARY KEY,
    customer_name varchar(255) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pendiente',
    total numeric(10,2) NOT NULL,
    notes text,
    sale_id integer REFERENCES sales(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT now()
  )`;

console.log("Creating order_items...");
await sql`
  CREATE TABLE IF NOT EXISTS order_items (
    id serial PRIMARY KEY,
    order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id integer REFERENCES products(id) ON DELETE SET NULL,
    product_name varchar(255) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL
  )`;

console.log("Done.");
