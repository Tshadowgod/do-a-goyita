"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, HandCoins, Phone, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { FiosModal } from "@/components/fios/FiosModal";
import { DebtorModal } from "@/components/fios/DebtorModal";
import { formatCurrency } from "@/lib/utils";
import type { Debtor } from "@/lib/db/schema";

type DebtorWithTotal = Debtor & { totalPending: number };

export default function FiosPage() {
  const [debtors,    setDebtors]    = useState<DebtorWithTotal[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState("");
  const [fiosFor,   setFiosFor]    = useState<Debtor | null>(null);
  const [debtorModal, setDebtorModal] = useState(false);
  const [editing,    setEditing]    = useState<Debtor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = query ? `/api/fios?q=${encodeURIComponent(query)}` : "/api/fios";
    const res = await fetch(url);
    setDebtors(await res.json());
    setLoading(false);
  }, [query]);

  useEffect(() => { load(); }, [load]);

  async function deleteDebtor(d: Debtor) {
    if (!confirm(`¿Eliminar a "${d.name}" y todos sus fíos?`)) return;
    await fetch(`/api/fios/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete_debtor" }),
    });
    toast.success("Persona eliminada");
    load();
  }

  const totalGlobal = debtors.reduce((s, d) => s + d.totalPending, 0);

  return (
    <div>
      <Header
        title="Fíos"
        subtitle={`${debtors.length} personas · ${formatCurrency(totalGlobal)} pendiente`}
        action={
          <Button onClick={() => { setEditing(null); setDebtorModal(true); }}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva persona</span>
          </Button>
        }
      />

      {/* Total card */}
      {totalGlobal > 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Total en fíos pendientes</p>
            <p className="text-2xl font-bold text-red-700 mt-0.5">{formatCurrency(totalGlobal)}</p>
          </div>
          <HandCoins className="h-10 w-10 text-red-300" />
        </div>
      )}

      <div className="mb-4">
        <Input
          placeholder="Buscar persona..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : debtors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <HandCoins className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No hay personas registradas</p>
          <p className="text-sm mt-1">Agrega una persona para empezar a registrar fíos</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Persona", "Teléfono", "Deuda pendiente", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debtors.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{d.name}</p>
                        {d.notes && <p className="text-xs text-slate-400 mt-0.5">{d.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {d.phone
                          ? <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{d.phone}</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-base ${d.totalPending > 0 ? "text-red-600" : "text-green-600"}`}>
                          {d.totalPending > 0 ? formatCurrency(d.totalPending) : "Al día ✓"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => setFiosFor(d)}
                            className="flex items-center gap-1 text-brand-600 hover:text-brand-800 text-xs font-medium transition-colors"
                          >
                            Ver fíos <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => { setEditing(d); setDebtorModal(true); }} className="text-slate-400 hover:text-brand-600 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteDebtor(d)} className="text-slate-400 hover:text-red-600 transition-colors">
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
            {debtors.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{d.name}</p>
                    {d.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />{d.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 items-center">
                    <button onClick={() => { setEditing(d); setDebtorModal(true); }} className="text-slate-400 hover:text-brand-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteDebtor(d)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-xs text-slate-500">Pendiente</p>
                    <p className={`font-bold text-lg ${d.totalPending > 0 ? "text-red-600" : "text-green-600"}`}>
                      {d.totalPending > 0 ? formatCurrency(d.totalPending) : "Al día ✓"}
                    </p>
                  </div>
                  <button
                    onClick={() => setFiosFor(d)}
                    className="flex items-center gap-1 bg-brand-600 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-brand-700 transition-colors"
                  >
                    Ver fíos <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <FiosModal
        open={fiosFor !== null}
        onClose={() => setFiosFor(null)}
        debtor={fiosFor}
        onChanged={load}
      />

      <DebtorModal
        open={debtorModal}
        onClose={() => setDebtorModal(false)}
        debtor={editing}
        onSaved={load}
      />
    </div>
  );
}
