"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, TrendingDown } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ExpenseModal } from "@/components/egresos/ExpenseModal";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES } from "@/lib/utils";
import type { Expense } from "@/lib/db/schema";

const categoryLabel = (v: string) =>
  EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

const categoryVariant = (v: string): "red" | "yellow" | "blue" | "gray" => {
  const map: Record<string, "red" | "yellow" | "blue" | "gray"> = {
    alquiler:   "red",
    servicios:  "yellow",
    sueldos:    "red",
    banco:      "blue",
    mercaderia: "yellow",
    transporte: "gray",
    otros:      "gray",
  };
  return map[v] ?? "gray";
};

export default function EgresosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState<Expense | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/egresos");
    const data = await res.json();
    setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteExpense(e: Expense) {
    if (!confirm(`¿Eliminar "${e.description}"?`)) return;
    await fetch(`/api/egresos/${e.id}`, { method: "DELETE" });
    toast.success("Egreso eliminado");
    load();
  }

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div>
      <Header
        title="Egresos"
        subtitle={`Total registrado: ${formatCurrency(total)}`}
        action={
          <Button onClick={() => { setEditing(null); setModal(true); }}>
            <Plus className="h-4 w-4" /> Nuevo egreso
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <TrendingDown className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">Sin egresos registrados</p>
          <p className="text-sm mt-1">Registra tus gastos para ver el punto de equilibrio</p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Fecha", "Descripción", "Categoría", "Monto", "Notas", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{e.description}</td>
                      <td className="px-4 py-3">
                        <Badge variant={categoryVariant(e.category)}>{categoryLabel(e.category)}</Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{e.notes ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditing(e); setModal(true); }} className="text-slate-400 hover:text-brand-600 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => deleteExpense(e)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-700">Total egresos</td>
                    <td className="px-4 py-3 font-bold text-red-700 text-base">{formatCurrency(total)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {expenses.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{e.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(e.date)}</p>
                  </div>
                  <p className="font-bold text-red-600 ml-4">{formatCurrency(e.amount)}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant={categoryVariant(e.category)}>{categoryLabel(e.category)}</Badge>
                  <div className="flex gap-3">
                    <button onClick={() => { setEditing(e); setModal(true); }} className="text-slate-400 hover:text-brand-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteExpense(e)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex justify-between font-bold text-red-700">
                <span>Total egresos</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </Card>
          </div>
        </>
      )}

      <ExpenseModal
        open={modal}
        onClose={() => setModal(false)}
        expense={editing}
        onSaved={load}
      />
    </div>
  );
}
