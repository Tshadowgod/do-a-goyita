"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Layers, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Product, InventoryLot } from "@/lib/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onChanged: () => void;
}

export function LotsModal({ open, onClose, product, onChanged }: Props) {
  const [lots,     setLots]     = useState<InventoryLot[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [qty,      setQty]      = useState("");
  const [cost,     setCost]     = useState("");
  const [date,     setDate]     = useState(() => new Date().toISOString().split("T")[0]);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/productos/${product.id}/lotes`);
      setLots(await res.json());
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    if (open && product) {
      load();
      setQty(""); setCost(product.cost ?? ""); setDate(new Date().toISOString().split("T")[0]);
    }
  }, [open, product, load]);

  if (!product) return null;

  async function addLot() {
    const quantity = parseInt(qty);
    const unitCost = parseFloat(cost);
    if (!Number.isFinite(quantity) || quantity <= 0) { toast.error("Cantidad inválida"); return; }
    if (!Number.isFinite(unitCost) || unitCost < 0)  { toast.error("Costo inválido");     return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/productos/${product!.id}/lotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, unitCost, purchaseDate: date }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lote agregado");
      setQty("");
      await load();
      onChanged();
    } catch {
      toast.error("Error al agregar lote");
    } finally {
      setSaving(false);
    }
  }

  const totalStock = lots.reduce((s, l) => s + l.remaining, 0);

  return (
    <Modal open={open} onClose={onClose} title={`Lotes · ${product.name}`} size="lg">
      <div className="space-y-4">
        {/* Add lot form */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Agregar stock (nuevo lote de compra)
          </p>
          <div className="flex items-end gap-2">
            <div className="w-24">
              <Input label="Cantidad" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="w-28">
              <Input label="Costo unit." type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="flex-1">
              <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button type="button" loading={saving} onClick={addLot} className="mb-0">Agregar</Button>
          </div>
        </div>

        {/* Lots list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-4 border-brand-600 border-t-transparent rounded-full" />
          </div>
        ) : lots.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400">
            <Layers className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Sin lotes registrados</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Fecha</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Costo</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500">Comprado</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500">Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lots.map((l) => (
                  <tr key={l.id} className={l.remaining === 0 ? "text-slate-400" : ""}>
                    <td className="px-3 py-2">{formatDate(l.purchaseDate)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(l.unitCost)}</td>
                    <td className="px-3 py-2 text-center">{l.quantity}</td>
                    <td className="px-3 py-2 text-center font-medium">{l.remaining}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="px-3 py-2 font-semibold text-slate-700">Stock total disponible</td>
                  <td className="px-3 py-2 text-center font-bold text-brand-700">{totalStock}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Las ventas consumen primero los lotes más antiguos (PEPS / FIFO), usando el costo real de cada lote.
        </p>
      </div>
    </Modal>
  );
}
