"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Truck, Phone, Mail, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SupplierModal } from "@/components/proveedores/SupplierModal";
import type { Supplier } from "@/lib/db/schema";

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState("");
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState<Supplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = query ? `/api/proveedores?q=${encodeURIComponent(query)}` : "/api/proveedores";
    const res = await fetch(url);
    setSuppliers(await res.json());
    setLoading(false);
  }, [query]);

  useEffect(() => { load(); }, [load]);

  async function deleteSupplier(s: Supplier) {
    if (!confirm(`¿Eliminar "${s.name}"?`)) return;
    await fetch(`/api/proveedores/${s.id}`, { method: "DELETE" });
    toast.success("Proveedor eliminado");
    load();
  }

  function openNew() { setEditing(null); setModal(true); }
  function openEdit(s: Supplier) { setEditing(s); setModal(true); }

  return (
    <div>
      <Header
        title="Proveedores"
        subtitle={`${suppliers.length} proveedores registrados`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo proveedor</span>
          </Button>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por nombre o contacto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Truck className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay proveedores</p>
          <p className="text-sm mt-1">Agrega tu primer proveedor para empezar</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Proveedor", "Contacto", "Teléfono", "Email", "Dirección", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{s.name}</p>
                        {s.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{s.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.contact ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.email ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[180px]">{s.address ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-brand-600 transition-colors" title="Editar">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteSupplier(s)} className="text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {suppliers.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    {s.contact && <p className="text-xs text-slate-500 mt-0.5">{s.contact}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-brand-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteSupplier(s)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-slate-500">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  )}
                  {s.notes && <p className="text-xs text-slate-400 italic pt-1">{s.notes}</p>}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SupplierModal
        open={modal}
        onClose={() => setModal(false)}
        supplier={editing}
        onSaved={load}
      />
    </div>
  );
}
