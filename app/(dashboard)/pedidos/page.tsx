"use client";
import { useEffect, useState, useCallback } from "react";
import { ClipboardList, Check, X, Trash2, Copy, ClipboardCheck } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/db/schema";

type OrderWithItems = Order & { items: OrderItem[] };

const statusBadge = (s: string) => {
  if (s === "pendiente")  return <Badge variant="yellow">Pendiente</Badge>;
  if (s === "confirmado") return <Badge variant="green">Confirmado</Badge>;
  return <Badge variant="red">Rechazado</Badge>;
};

export default function PedidosPage() {
  const [orders,  setOrders]  = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState<number | null>(null);
  const [copied,  setCopied]  = useState(false);
  const [storeUrl, setStoreUrl] = useState("/tienda");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/pedidos");
    setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setStoreUrl(`${window.location.origin}/tienda`); }, []);

  async function act(order: OrderWithItems, action: "confirmar" | "rechazar") {
    if (action === "rechazar" && !confirm(`¿Rechazar el pedido de ${order.customerName}?`)) return;
    setBusy(order.id);
    try {
      const res = await fetch(`/api/pedidos/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      toast.success(action === "confirmar" ? "Pedido confirmado y venta registrada" : "Pedido rechazado");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(order: OrderWithItems) {
    if (!confirm("¿Eliminar este pedido del historial?")) return;
    await fetch(`/api/pedidos/${order.id}`, { method: "DELETE" });
    toast.success("Pedido eliminado");
    load();
  }

  function copyLink() {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  const pending = orders.filter((o) => o.status === "pendiente");

  return (
    <div>
      <Header title="Pedidos" subtitle={`${pending.length} pendiente${pending.length !== 1 ? "s" : ""}`} />

      {/* Share store link */}
      <Card className="mb-6 p-4 bg-brand-50 border-brand-200">
        <p className="text-sm font-semibold text-slate-800 mb-1">Link de tu tienda para clientes</p>
        <p className="text-xs text-slate-500 mb-3">Compártelo por WhatsApp. Cualquiera con el link puede hacer pedidos.</p>
        <div className="flex gap-2">
          <input readOnly value={storeUrl} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700" />
          <Button variant="outline" onClick={copyLink}>
            {copied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
          </Button>
          <a href={storeUrl} target="_blank" rel="noreferrer">
            <Button>Abrir</Button>
          </a>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ClipboardList className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">Sin pedidos todavía</p>
          <p className="text-sm mt-1">Los pedidos de tus clientes aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className={`p-4 ${o.status === "pendiente" ? "border-amber-300" : ""}`}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{o.customerName}</p>
                    {statusBadge(o.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Pedido #{o.id} · {formatDateTime(o.createdAt!)}</p>
                </div>
                <p className="font-bold text-brand-700 text-lg">{formatCurrency(o.total)}</p>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                {o.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm text-slate-600">
                    <span>{it.quantity}× {it.productName}</span>
                    <span>{formatCurrency(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {o.notes && <p className="mt-2 text-xs text-slate-500 italic">Nota: {o.notes}</p>}

              <div className="mt-3 flex gap-2 justify-end">
                {o.status === "pendiente" ? (
                  <>
                    <Button variant="outline" onClick={() => act(o, "rechazar")} disabled={busy === o.id}>
                      <X className="h-4 w-4" /> Rechazar
                    </Button>
                    <Button onClick={() => act(o, "confirmar")} loading={busy === o.id}>
                      <Check className="h-4 w-4" /> Confirmar
                    </Button>
                  </>
                ) : (
                  <button onClick={() => remove(o)} className="text-slate-400 hover:text-red-600 text-sm flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
