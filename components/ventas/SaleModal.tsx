"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, PAYMENT_METHODS } from "@/lib/utils";
import type { Sale, SaleItem } from "@/lib/db/schema";

export type SaleWithItems = Sale & { items: SaleItem[] };

interface Props {
  open: boolean;
  onClose: () => void;
  sale: SaleWithItems | null;
  onSaved: () => void;
}

export function SaleModal({ open, onClose, sale, onSaved }: Props) {
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    if (sale) {
      setPaymentMethod(sale.paymentMethod ?? "efectivo");
      setNotes(sale.notes ?? "");
    }
  }, [sale]);

  if (!sale) return null;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/ventas/${sale!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, notes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Venta actualizada");
      onSaved();
      onClose();
    } catch {
      toast.error("Error al actualizar la venta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Venta #${sale.id}`} size="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">{formatDateTime(sale.createdAt!)}</p>

        {/* Items */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Producto</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500">Cant.</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Precio</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-slate-800">{it.productName}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{it.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={3} className="px-3 py-2 font-semibold text-slate-700">Total</td>
                <td className="px-3 py-2 text-right font-bold text-brand-700 text-base">{formatCurrency(sale.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Editable fields */}
        <Select
          label="Método de pago"
          options={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        />
        <Input
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones (opcional)"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="button" loading={saving} onClick={save}>Guardar cambios</Button>
        </div>
      </div>
    </Modal>
  );
}
