"use client";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/utils";
import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  onSaleComplete: () => void;
}

export function Cart({ onSaleComplete }: Props) {
  const { items, removeItem, updateQty, clearCart, total } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [loading, setLoading] = useState(false);

  async function processSale() {
    if (items.length === 0) return;
    setLoading(true);

    const res = await fetch("/api/ventas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          quantity:  i.quantity,
          unitPrice: i.price,
        })),
        paymentMethod,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Error al registrar la venta");
      return;
    }

    const totalAmount = total();
    clearCart();
    toast.success(`Venta registrada: ${formatCurrency(totalAmount)}`);
    onSaleComplete();
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <ShoppingCart className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Carrito vacío</p>
        <p className="text-xs mt-1">Escanea o selecciona un producto</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-brand-700">{formatCurrency(item.price)} c/u</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQty(item.productId, item.quantity - 1)}
                className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() => {
                  if (item.stock != null && item.quantity >= item.stock) {
                    toast.error(`Solo hay ${item.stock} en stock`);
                    return;
                  }
                  updateQty(item.productId, item.quantity + 1);
                }}
                disabled={item.stock != null && item.quantity >= item.stock}
                className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <p className="text-sm font-bold text-slate-900 w-20 text-right">
              {formatCurrency(item.price * item.quantity)}
            </p>
            <button onClick={() => removeItem(item.productId)} className="text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex justify-between text-lg font-bold text-slate-900">
          <span>Total</span>
          <span className="text-brand-700">{formatCurrency(total())}</span>
        </div>
        <Select
          options={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          label="Método de pago"
        />
        <Button
          className="w-full"
          size="lg"
          onClick={processSale}
          loading={loading}
          disabled={items.length === 0}
        >
          Cobrar {formatCurrency(total())}
        </Button>
        <button
          onClick={() => { if (confirm("¿Limpiar el carrito?")) clearCart(); }}
          className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Limpiar carrito
        </button>
      </div>
    </div>
  );
}
