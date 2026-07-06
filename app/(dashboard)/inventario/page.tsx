"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Upload, Edit2, Trash2, AlertTriangle, Package } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProductModal } from "@/components/inventario/ProductModal";
import { ImportModal } from "@/components/inventario/ImportModal";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/db/schema";

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [modal,    setModal]    = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing,  setEditing]  = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = query ? `/api/productos?q=${encodeURIComponent(query)}` : "/api/productos";
    const res = await fetch(url);
    const data = await res.json();
    setProducts(data.filter((p: Product) => p.active));
    setLoading(false);
  }, [query]);

  useEffect(() => { load(); }, [load]);

  async function deleteProduct(p: Product) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
    toast.success("Producto eliminado");
    load();
  }

  const filtered = products.filter((p) =>
    !query || p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <Header
        title="Inventario"
        subtitle={`${products.length} productos`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}>
              <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Importar compras</span>
            </Button>
            <Button onClick={() => { setEditing(null); setModal(true); }}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo producto</span>
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre o categoría..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Package className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay productos</p>
          <p className="text-sm mt-1">Agrega tu primer producto para empezar</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Producto", "Categoría", "Precio", "Costo", "Stock", "Estado", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((p) => {
                    const lowStock = (p.quantity ?? 0) <= (p.minStock ?? 5);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{p.name}</p>
                            {p.barcode && <p className="text-xs text-slate-400">{p.barcode}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.category ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold text-brand-700">{formatCurrency(p.price)}</td>
                        <td className="px-4 py-3 text-slate-600">{p.cost ? formatCurrency(p.cost) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${lowStock ? "text-red-600" : "text-slate-800"}`}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {lowStock ? (
                            <Badge variant="yellow"><AlertTriangle className="h-3 w-3 mr-1" />Stock bajo</Badge>
                          ) : (
                            <Badge variant="green">Ok</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setEditing(p); setModal(true); }} className="text-slate-400 hover:text-brand-600 transition-colors" title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteProduct(p)} className="text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p) => {
              const lowStock = (p.quantity ?? 0) <= (p.minStock ?? 5);
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.category ?? "Sin categoría"}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setEditing(p); setModal(true); }} className="text-slate-400 hover:text-brand-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteProduct(p)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Precio</p>
                      <p className="font-semibold text-brand-700">{formatCurrency(p.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Stock</p>
                      <p className={`font-medium ${lowStock ? "text-red-600" : "text-slate-800"}`}>
                        {p.quantity} {p.unit}
                      </p>
                    </div>
                    {lowStock && <Badge variant="yellow" className="self-end"><AlertTriangle className="h-3 w-3 mr-1" />Bajo</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ProductModal
        open={modal}
        onClose={() => setModal(false)}
        product={editing}
        onSaved={load}
      />

      <ImportModal
        open={importing}
        onClose={() => setImporting(false)}
        onImported={load}
      />
    </div>
  );
}
