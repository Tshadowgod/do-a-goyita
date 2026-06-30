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
  cost:        numeric("cost",       { precision: 10, scale: 2 }).default("0"), // COGS (FIFO) for this line
});

// Inventory lots — each purchase creates a lot with its own cost (FIFO / PEPS)
export const inventoryLots = pgTable("inventory_lots", {
  id:           serial("id").primaryKey(),
  productId:    integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity:     integer("quantity").notNull(),   // original lot size
  remaining:    integer("remaining").notNull(),  // remaining after FIFO consumption
  unitCost:     numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  createdAt:    timestamp("created_at").defaultNow(),
});

// Ledger of which lot each sale consumed (to restore stock on edit/delete)
export const lotConsumptions = pgTable("lot_consumptions", {
  id:        serial("id").primaryKey(),
  saleId:    integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  lotId:     integer("lot_id").references(() => inventoryLots.id, { onDelete: "set null" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  quantity:  integer("quantity").notNull(),
  unitCost:  numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
});

export const debtors = pgTable("debtors", {
  id:        serial("id").primaryKey(),
  name:      varchar("name", { length: 255 }).notNull(),
  phone:     varchar("phone", { length: 50 }),
  notes:     text("notes"),
  active:    boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fios = pgTable("fios", {
  id:          serial("id").primaryKey(),
  debtorId:    integer("debtor_id").references(() => debtors.id, { onDelete: "cascade" }).notNull(),
  amount:      numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date:        date("date").notNull(),
  paid:        boolean("paid").default(false),
  paidAt:      timestamp("paid_at"),
  createdAt:   timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id:        serial("id").primaryKey(),
  name:      varchar("name", { length: 255 }).notNull(),
  contact:   varchar("contact", { length: 255 }),
  phone:     varchar("phone", { length: 50 }),
  email:     varchar("email", { length: 255 }),
  address:   text("address"),
  notes:     text("notes"),
  active:    boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
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

// Customer orders placed from the public storefront (/tienda)
export const orders = pgTable("orders", {
  id:           serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  status:       varchar("status", { length: 20 }).notNull().default("pendiente"), // pendiente | confirmado | rechazado
  total:        numeric("total", { precision: 10, scale: 2 }).notNull(),
  notes:        text("notes"),
  saleId:       integer("sale_id").references(() => sales.id, { onDelete: "set null" }),
  createdAt:    timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id:          serial("id").primaryKey(),
  orderId:     integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId:   integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  quantity:    integer("quantity").notNull(),
  unitPrice:   numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal:    numeric("subtotal",   { precision: 10, scale: 2 }).notNull(),
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
  lots:      many(inventoryLots),
}));

export const inventoryLotsRelations = relations(inventoryLots, ({ one }) => ({
  product: one(products, { fields: [inventoryLots.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export type Product  = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Sale     = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Expense  = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type InventoryLot = typeof inventoryLots.$inferSelect;
export type LotConsumption = typeof lotConsumptions.$inferSelect;
export type Order     = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Supplier    = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type Debtor      = typeof debtors.$inferSelect;
export type Fio         = typeof fios.$inferSelect;
