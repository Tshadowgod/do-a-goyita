import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const products = pgTable("products", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price:       numeric("price", { precision: 10, scale: 2 }).notNull(),
  cost:        numeric("cost",  { precision: 10, scale: 2 }),
  quantity:    integer("quantity").default(0).notNull(),
  barcode:     varchar("barcode", { length: 100 }).unique(),
  imageUrl:    text("image_url"),
  category:    varchar("category", { length: 100 }),
  unit:        varchar("unit", { length: 50 }).default("unidad"),
  minStock:    integer("min_stock").default(5),
  active:      boolean("active").default(true),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id:            serial("id").primaryKey(),
  total:         numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).default("efectivo"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id:          serial("id").primaryKey(),
  saleId:      integer("sale_id").references(() => sales.id, { onDelete: "cascade" }),
  productId:   integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  quantity:    integer("quantity").notNull(),
  unitPrice:   numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal:    numeric("subtotal",   { precision: 10, scale: 2 }).notNull(),
});

export const expenses = pgTable("expenses", {
  id:          serial("id").primaryKey(),
  amount:      numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category:    varchar("category", { length: 100 }).notNull().default("otros"),
  date:        date("date").notNull(),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow(),
});

// Relations
export const salesRelations = relations(sales, ({ many }) => ({
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale:    one(sales,    { fields: [saleItems.saleId],    references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  saleItems: many(saleItems),
}));

export type Product  = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Sale     = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Expense  = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
