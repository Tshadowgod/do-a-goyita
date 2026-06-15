"use client";
import { useEffect, useState, useCallback } from "react";
import { Eye, Trash2, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SaleModal, type SaleWithItems } from "@/components/ventas/SaleModal";
import { formatCurrency, formatDateTime, PAYMENT_METHODS } from "@/lib/utils";

const paymentLabel = (v: string | null) =>
  PAYMENT_METHODS.find((p) => p.value === v)?.label ?? v ?? "—";

const paymentVariant = (v: string | null): "green" | "blue" | "gray" => {
  const map: Record<string, "green" | "blue" | "gray"> = {
    efectivo:      "green",
    tarjeta:       "blue",
    transferencia: "gray",
  };
  return map[v ?? ""] ?? "gray";
};

export default function VentasPage() {
  const [sales,    setSales]    = useState<SaleWithItems[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [selected, setSelected] = useState<SaleWithItems | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/ventas");
    const data = await res.json();
    setSales(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteSale(s: SaleWithItems) {
    if (!confirm(`¿Eliminar la venta #${s.id}? El stock de los productos será devuelto al inventario.`)) return;
    await fetch(`/api/ventas/${s.id}`, { method: "DELETE" });
    toast.success("Venta eliminada y stock devuelto");
    load();
  }

  const total = sales.reduce((acc, s) => acc + parseFloat(s.total), 0);

  return (
    <div>
      <Header
        title="Historial de Ventas"
        subtitle={`${sales.length} ventas · Total: ${formatCurrency(total)}`}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Receipt className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">Sin ventas registradas</p>
          <p className="text-sm mt-1">Las ventas que hagas en el Punto de Venta aparecerán aquí</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["#", "Fecha", "Productos", "Pago", "Total", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">#{s.id}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(s.createdAt!)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.items.length} {s.items.length === 1 ? "producto" : "productos"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={paymentVariant(s.paymentMethod)}>{paymentLabel(s.paymentMethod)}</Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-700">{formatCurrency(s.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setSelected(s); setModal(true); }} className="text-slate-400 hover:text-brand-600 transition-colors" title="Ver / Editar">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteSale(s)} className="text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-700">Total vendido</td>
                    <td className="px-4 py-3 font-bold text-brand-700 text-base">{formatCurrency(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {sales.map((s) => {
              const open = expanded === s.id;
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Venta #{s.id}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(s.createdAt!)}</p>
                    </div>
                    <p className="font-bold text-brand-700 ml-4">{formatCurrency(s.total)}</p>
                  </div>

                  <button
                    onClick={() => setExpanded(open ? null : s.id)}
                    className="flex items-center gap-1 text-xs text-slate-500 mt-2"
                  >
                    {s.items.length} {s.items.length === 1 ? "producto" : "productos"}
                    {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {open && (
                    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                      {s.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-xs text-slate-600">
                          <span>{it.quantity}× {it.productName}</span>
                          <span>{formatCurrency(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <Badge variant={paymentVariant(s.paymentMethod)}>{paymentLabel(s.paymentMethod)}</Badge>
                    <div className="flex gap-3">
                      <button onClick={() => { setSelected(s); setModal(true); }} className="text-slate-400 hover:text-brand-600">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteSale(s)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            <Card className="p-4 bg-brand-50 border-brand-200">
              <div className="flex justify-between font-bold text-brand-700">
                <span>Total vendido</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </Card>
          </div>
        </>
      )}

      <SaleModal
        open={modal}
        onClose={() => setModal(false)}
        sale={selected}
        onSaved={load}
      />
    </div>
  );
}
