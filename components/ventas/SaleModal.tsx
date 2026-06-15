"use client";
import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, PAYMENT_METHODS } from "@/lib/utils";
import type { Sale, SaleItem, Product } from "@/lib/db/schema";

export type SaleWithItems = Sale & { items: SaleItem[] };

interface EditItem {
  productId:   number | null;
  productName: string;
  quantity:    number;
  unitPrice:   number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sale: SaleWithItems | null;
  onSaved: () => void;
}

export function SaleModal({ open, onClose, sale, onSaved }: Props) {
  const [items,         setItems]         = useState<EditItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [notes,         setNotes]         = useState("");
  const [products,      setProducts]      = useState<Product[]>([]);
  const [addId,         setAddId]         = useState("");
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    if (sale) {
      setItems(sale.items.map((it) => ({
        productId:   it.productId,
        productName: it.productName,
        quantity:    it.quantity,
        unitPrice:   parseFloat(it.unitPrice),
      })));
      setPaymentMethod(sale.paymentMethod ?? "efectivo");
      setNotes(sale.notes ?? "");
      setAddId("");
    }
  }, [sale]);

  useEffect(() => {
    if (open) {
      fetch("/api/productos")
        .then((r) => r.json())
        .then((data: Product[]) => setProducts(data.filter((p) => p.active)))
        .catch(() => {});
    }
  }, [open]);

  if (!sale) return null;

  function updateItem(index: number, patch: Partial<EditItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addProduct() {
    const p = products.find((x) => x.id === parseInt(addId));
    if (!p) return;
    setItems((prev) => [
      ...prev,
      { productId: p.id, productName: p.name, quantity: 1, unitPrice: parseFloat(p.price) },
    ]);
    setAddId("");
  }

  const total = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

  async function save() {
    if (items.length === 0) {
      toast.error("La venta debe tener al menos un producto. Si quieres anularla, elimínala.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ventas/${sale!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, notes, items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Error al actualizar la venta");
      }
      toast.success("Venta actualizada y stock ajustado");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar la venta");
    } finally {
      setSaving(false);
    }
  }

  const productOptions = [
    { value: "", label: "Agregar producto..." },
    ...products.map((p) => ({ value: String(p.id), label: `${p.name} (${formatCurrency(p.price)})` })),
  ];

  return (
    <Modal open={open} onClose={onClose} title={`Venta #${sale.id}`} size="xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">{formatDateTime(sale.createdAt!)}</p>

        {/* Editable items */}
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-end gap-2 rounded-xl border border-slate-200 p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{it.productName}</p>
                <p className="text-xs text-slate-500">Subtotal: {formatCurrency(it.unitPrice * it.quantity)}</p>
              </div>
              <div className="w-16">
                <Input
                  label="Cant."
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div className="w-24">
                <Input
                  label="Precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(i, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                />
              </div>
              <button
                onClick={() => removeItem(i)}
                className="mb-2 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                title="Quitar producto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add product */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Agregar producto"
              options={productOptions}
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={addProduct} disabled={!addId} className="mb-0">
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center rounded-xl bg-brand-50 border border-brand-200 px-4 py-3">
          <span className="font-semibold text-slate-700">Total</span>
          <span className="font-bold text-brand-700 text-lg">{formatCurrency(total)}</span>
        </div>

        {/* Payment + notes */}
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
