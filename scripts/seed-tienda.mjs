import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

// 26 productos nuevos de FOTOS/Tienda/procesadas.
// Se crean SIN precio (0, marcador) y SIN stock (0) -> NO aparecen en la tienda
// hasta que el dueño les ponga precio y stock desde el panel.
// active=true para que SÍ se vean y se puedan editar en /inventario.
const PRODUCTOS = [
  { name: "Papel Higiénico Finesse Aromas Floral x6",            category: "Hogar",               unit: "paquete", image: "papel-finesse-floral-6r.jpg",        description: "Papel higiénico doble hoja, fragancia floral. 6 rollos." },
  { name: "Lavandina Mr. Cloro 250 ml",                          category: "Limpieza",            unit: "unidad",  image: "mr-cloro-lavandina-250ml.jpg",      description: "Lavandina con gran poder desinfectante. 250 ml." },
  { name: "Lavandina Concentrada Chifón",                        category: "Limpieza",            unit: "unidad",  image: "chifon-lavandina-concentrada.jpg",  description: "Lavandina concentrada, quita lo percudido." },
  { name: "Acondicionador Sedal Glycol + Vita C 190 ml",         category: "Cuidado del cabello", unit: "unidad",  image: "sedal-acond-glycol-vitac-190ml.jpg",description: "Acondicionador Luminous UV, repara señales de daño UV. 190 ml." },
  { name: "Limpiador Ola Maximus Antigrasa Experto 800 ml",      category: "Limpieza",            unit: "unidad",  image: "ola-maximus-antigrasa-800ml.jpg",   description: "Limpiador antigrasa en gatillo, fórmula original. 800 ml." },
  { name: "Limpiador Ola Maximus Antisarro 500 ml",              category: "Limpieza",            unit: "unidad",  image: "ola-maximus-antisarro-500ml.jpg",   description: "Limpiador antisarro, desincrusta y desinfecta. 500 ml." },
  { name: "Fósforos Paraná caja x40",                            category: "Hogar",               unit: "unidad",  image: "fosforos-parana-caja.jpg",          description: "Fósforos de seguridad, cabeza verde. Caja de 40." },
  { name: "Fósforos Paraná pack x10 cajas",                      category: "Hogar",               unit: "paquete", image: "fosforos-parana-pack10.jpg",        description: "Pack de 10 cajas de madera con 40 fósforos cada una." },
  { name: "Toallas Doncella Normal x8",                          category: "Cuidado personal",    unit: "paquete", image: "toallas-doncella-normal-8u.jpg",    description: "Toallas femeninas normal con alas, tela suave sin perfume. 8 unidades." },
  { name: "Detergente Patito sachet (Limón / Bebé)",             category: "Limpieza",            unit: "unidad",  image: "patito-sachet-limon-bebe.jpg",      description: "Detergente en polvo, gran poder sacamanchas. Sachet (limón o bebé)." },
  { name: "Detergente Patito Limón 640 g",                       category: "Limpieza",            unit: "unidad",  image: "patito-limon-640g.jpg",             description: "Detergente en polvo aroma limón, gran poder sacamanchas. 640 g." },
  { name: "Detergente Todo Brillo Floral 140 g",                 category: "Limpieza",            unit: "unidad",  image: "todo-brillo-floral-140g.jpg",       description: "Detergente en polvo multiuso, gran poder multiespuma, floral. 140 g." },
  { name: "Detergente Cielo 700 g",                              category: "Limpieza",            unit: "unidad",  image: "cielo-700g.jpg",                    description: "Detergente alta espuma, antibacterial, varios aromas. 700 g." },
  { name: "Detergente Opal Ultra Floral 700 g",                  category: "Limpieza",            unit: "unidad",  image: "opal-ultra-floral-700g.jpg",        description: "Detergente Multipower, ropa blanca y de color, floral. 700 g." },
  { name: "Detergente Surf Bicarbonato 650 g",                   category: "Limpieza",            unit: "unidad",  image: "surf-bicarbonato-650g.jpg",         description: "Detergente con bicarbonato, fragancia más intensa. 650 g." },
  { name: "Detergente Todo Brillo Toque de Suavizante 650 g",    category: "Limpieza",            unit: "unidad",  image: "todo-brillo-suavizante-650g.jpg",   description: "Detergente en polvo con toque de suavizante, floral. 650 g." },
  { name: "Detergente Wish Floral 700 g",                        category: "Limpieza",            unit: "unidad",  image: "wish-floral-700g.jpg",              description: "Detergente enjuague fácil, ropa blanca y de color, floral. 700 g." },
  { name: "Detergente Uno 5 en 1 620 g",                         category: "Limpieza",            unit: "unidad",  image: "uno-5en1-620g.jpg",                 description: "Detergente fórmula 5 en 1, varios aromas. 620 g." },
  { name: "Jabón Dove Original 90 g",                            category: "Cuidado personal",    unit: "unidad",  image: "dove-original-90g.jpg",             description: "Barra de belleza hidratante con ¼ de crema humectante. 90 g." },
  { name: "Jabón Guaira Deluxe Limón 180 g",                     category: "Limpieza",            unit: "unidad",  image: "guaira-deluxe-limon-180g.jpg",      description: "Jabón para lavar la ropa, fragancia limón, con glicerina. 180 g." },
  { name: "Jabón TOP Neutro Glicerinado x5 (1 kg)",              category: "Limpieza",            unit: "paquete", image: "top-neutro-5x200g.jpg",             description: "Jabón neutro glicerinado. 5 unidades de 200 g (1 kg)." },
  { name: "Jabón Astro x5 barras (1.2 kg)",                      category: "Limpieza",            unit: "paquete", image: "astro-5barras-1200g.jpg",           description: "Jabón con glicerina y fragancia. 5 barras (1.2 kg)." },
  { name: "Jabón Protex Nutri Protect 110 g",                    category: "Cuidado personal",    unit: "unidad",  image: "protex-nutri-110g.jpg",             description: "Jabón antibacterial con glicerina y macadamia, elimina 99.9% de bacterias. 110 g." },
  { name: "Jabón Palmolive Naturals Avena 110 g",               category: "Cuidado personal",    unit: "unidad",  image: "palmolive-avena-110g.jpg",          description: "Jabón de tocador exfoliación diaria, avena y azúcar morena. 110 g." },
  { name: "Jabón Lux Botanicals Orquídea Negra 120 g",          category: "Cuidado personal",    unit: "unidad",  image: "lux-orquidea-negra-120g.jpg",       description: "Jabón con glicerina, vitamina C y aceites esenciales, orquídea negra. 120 g." },
  { name: "Shampoo Sedal sachet 45 ml",                          category: "Cuidado del cabello", unit: "unidad",  image: "sedal-shampoo-sachet-45ml.jpg",     description: "Shampoo Sedal en sachet, varios tipos. 45 ml." },
];

let creados = 0, saltados = 0;
for (const p of PRODUCTOS) {
  const imageUrl = `/productos/${p.image}`;
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
