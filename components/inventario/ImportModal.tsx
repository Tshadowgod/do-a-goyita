"use client";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  name:     string;
  quantity: number;
  cost:     number;
  price?:   number;
  valid:    boolean;
  reason?:  string;
}

function parseLine(line: string): ParsedRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Detect separator: tab > pipe > semicolon > comma
  const sep = trimmed.includes("\t") ? "\t"
            : trimmed.includes("|")  ? "|"
            : trimmed.includes(";")  ? ";"
            : ",";
  const parts = trimmed.split(sep).map((p) => p.trim());

  const name     = parts[0] ?? "";
  const quantity = parseFloat((parts[1] ?? "").replace(",", "."));
  const cost     = parseFloat((parts[2] ?? "").replace(",", "."));
  const priceRaw = parts[3] ?? "";
  const price    = priceRaw ? parseFloat(priceRaw.replace(",", ".")) : undefined;

  const row: ParsedRow = { name, quantity, cost, price, valid: true };

  if (!name) {
    row.valid = false; row.reason = "Falta el nombre";
  } else if (!Number.isFinite(quantity) || quantity <= 0) {
    row.valid = false; row.reason = "Cantidad inválida";
  } else if (!Number.isFinite(cost) || cost < 0) {
    row.valid = false; row.reason = "Costo inválido";
  } else if (price !== undefined && (!Number.isFinite(price) || price <= 0)) {
    row.valid = false; row.reason = "Precio inválido";
  }

  // store as integer quantity when valid
  if (Number.isFinite(quantity)) row.quantity = Math.round(quantity);
  return row;
}

export function ImportModal({ open, onClose, onImported }: Props) {
  const [text,    setText]    = useState("");
  const [saving,  setSaving]  = useState(false);

  const rows = useMemo(() => {
    return text.split("\n").map(parseLine).filter((r): r is ParsedRow => r !== null);
  }, [text]);

  const validRows   = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  async function doImport() {
    if (validRows.length === 0) {
      toast.error("No hay líneas válidas para importar");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/productos/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validRows.map((r) => ({
            name: r.name, quantity: r.quantity, cost: r.cost, ...(r.price != null ? { price: r.price } : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success(`${data.created} creados · ${data.updated} actualizados`);
      setText("");
      onImported();
      onClose();
    } catch (e) {
      toast.error(`Error al importar: ${e instanceof Error ? e.message : ""}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar compras al inventario" size="xl">
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1">Pega una línea por producto con este orden:</p>
          <p className="font-mono bg-white border border-slate-200 rounded px-2 py-1 inline-block">
            Nombre, Cantidad, Costo, Precio de venta
          </p>
          <p className="mt-2">
            El <b>Precio de venta</b> es opcional (si no lo pones en un producto nuevo, se usa el costo).
            Puedes separar con coma, punto y coma, tabulación o <code>|</code>. Si el producto ya existe,
            se <b>suma</b> la cantidad a su stock.
          </p>
          <p className="mt-2 text-slate-500">Ejemplo:</p>
          <pre className="font-mono bg-white border border-slate-200 rounded px-2 py-1 mt-1 whitespace-pre-wrap">{`Coca Cola 2L, 12, 12, 18
Pan integral, 20, 3.5, 5
Audífonos, 10, 500, 650`}</pre>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Pega aquí tu lista de compras..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />

        {/* Preview */}
        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle2 className="h-4 w-4" /> {validRows.length} válidos
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-4 w-4" /> {invalidRows.length} con error
                </span>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Producto</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500">Cant.</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Costo</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={r.valid ? "" : "bg-red-50"}>
                      <td className="px-3 py-2 text-slate-800">
                        {r.name || <span className="text-slate-400">—</span>}
                        {!r.valid && <span className="block text-xs text-red-600">{r.reason}</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">{Number.isFinite(r.quantity) ? r.quantity : "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{Number.isFinite(r.cost) ? formatCurrency(r.cost) : "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{r.price != null && Number.isFinite(r.price) ? formatCurrency(r.price) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="button" loading={saving} disabled={validRows.length === 0} onClick={doImport}>
            Importar {validRows.length > 0 ? `(${validRows.length})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
