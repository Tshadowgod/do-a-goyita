import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Bolivia uses a fixed UTC-4 offset (no daylight saving)
const BO_OFFSET = "-04:00";

/** Start of a Bolivian calendar day (YYYY-MM-DD) as a UTC instant. */
export function boliviaDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000${BO_OFFSET}`);
}

/** End of a Bolivian calendar day (YYYY-MM-DD) as a UTC instant. */
export function boliviaDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999${BO_OFFSET}`);
}

/** Today's date in Bolivia as YYYY-MM-DD. */
export function boliviaToday(): string {
  const now = new Date();
  return new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export const EXPENSE_CATEGORIES = [
  { value: "alquiler",    label: "Alquiler / Renta" },
  { value: "servicios",   label: "Servicios (luz, agua, etc.)" },
  { value: "sueldos",     label: "Sueldos" },
  { value: "banco",       label: "Depósito al banco" },
  { value: "mercaderia",  label: "Compra de mercadería" },
  { value: "transporte",  label: "Transporte" },
  { value: "otros",       label: "Otros" },
] as const;

export const PAYMENT_METHODS = [
  { value: "efectivo",    label: "Efectivo" },
  { value: "tarjeta",     label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
] as const;

export const FIXED_EXPENSE_CATEGORIES = ["alquiler", "servicios", "sueldos"];
