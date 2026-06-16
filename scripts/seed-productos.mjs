import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const today = new Date().toISOString().split("T")[0];

// 11 productos identificados de las fotos. Precio en Bs, stock inicial = 1.
const PRODUCTOS = [
  { name: "Shampoo Sedal Zero Caspa 2en1 340ml",        price: 15, category: "Cuidado del cabello", unit: "unidad", image: "sedal-zero-caspa-340ml.jpg",        description: "Shampoo 2 en 1 con doble activo anticaspa. Contenido neto 340 ml." },
  { name: "Shampoo Plusbelle Hidratación 1000ml",        price: 25, category: "Cuidado del cabello", unit: "unidad", image: "plusbelle-hidratacion-1000ml.jpg",   description: "Shampoo hidratación con aceite de palta y té verde, sin siliconas. 1000 ml." },
  { name: "Shampoo Revive Chocolate 340ml",              price: 25, category: "Cuidado del cabello", unit: "unidad", image: "revive-chocolate-340ml.jpg",       description: "Shampoo hidratación profunda sin sal, aroma chocolate. 340 ml." },
  { name: "Suavizante Borita Aroma a Bebé 900ml",        price: 15, category: "Limpieza",            unit: "unidad", image: "borita-suavizante-bebe-900ml.jpg", description: "Suavizante para ropa, recarga económica, 7 días de perfume. 900 cm³." },
  { name: "Crema Skala 12 en 1 1000g",                   price: 25, category: "Cuidado del cabello", unit: "unidad", image: "skala-12en1-1000g.jpg",           description: "Crema de tratamiento 12 en 1, restauración y brillo, vegana. 1000 g." },
  { name: "Toallas Ruby Nocturna x10",                   price: 15, category: "Cuidado personal",    unit: "paquete", image: "ruby-nocturna-10u.jpg",          description: "Toallas femeninas nocturnas, tela extra suave, rápida absorción. 10 unidades." },
  { name: "Toallas Ruby Juvenil Invisible x10",          price: 13, category: "Cuidado personal",    unit: "paquete", image: "ruby-juvenil-invisible-10u.jpg", description: "Toallas femeninas juvenil invisible, tela microperforada. 10 unidades." },
  { name: "Toallas Ruby Rapisec x10",                    price: 13, category: "Cuidado personal",    unit: "paquete", image: "ruby-rapisec-10u.jpg",           description: "Toallas femeninas Rapisec, cubierta porosa, rápida absorción. 10 unidades." },
  { name: "Jabón Bolívar Bebés y Niños 190g",            price: 7,  category: "Limpieza",            unit: "unidad", image: "bolivar-bebes-ninos-190g.jpg",    description: "Jabón en barra para ropa de bebés y niños, fórmula hipoalergénica. 190 g." },
  { name: "Jabón Bolívar Cuidado Total 190g",            price: 7,  category: "Limpieza",            unit: "unidad", image: "bolivar-cuidado-total-190g.jpg",  description: "Jabón de lavar cuidado total, aroma floral, con glicerina. 190 g." },
  { name: "Detergente Sapolio Vajillero Limón 1250ml",   price: 25, category: "Limpieza",            unit: "unidad", image: "sapolio-vajillero-limon-1250ml.jpg", description: "Detergente vajillero nueva fórmula, aroma limón. 1250 ml." },
];

let creados = 0, saltados = 0;
for (const p of PRODUCTOS) {
  const imageUrl = `/productos/${p.image}`;

  // evita duplicados si se corre dos veces
  const existing = await sql`SELECT id FROM products WHERE name = ${p.name} LIMIT 1`;
  if (existing.length > 0) {
    console.log(`SALTADO (ya existe): ${p.name}`);
    saltados++;
    continue;
  }

  const [prod] = await sql`
    INSERT INTO products (name, description, price, image_url, category, unit, active, quantity)
    VALUES (${p.name}, ${p.description}, ${p.price}, ${imageUrl}, ${p.category}, ${p.unit}, true, 0)
    RETURNING id`;

  // lote inicial de stock = 1 (costo 0)
  await sql`
    INSERT INTO inventory_lots (product_id, quantity, remaining, unit_cost, purchase_date)
    VALUES (${prod.id}, 1, 1, 0, ${today})`;

  // stock del producto = suma de lotes restantes
  await sql`UPDATE products SET quantity = 1, updated_at = now() WHERE id = ${prod.id}`;

  console.log(`OK -> ${p.name}  (Bs ${p.price})`);
  creados++;
}

console.log(`\nListo. Creados: ${creados}, saltados: ${saltados}`);
