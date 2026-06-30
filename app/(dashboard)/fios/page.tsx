"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Plus, Edit2, Trash2, HandCoins, Phone,
  ChevronDown, ChevronUp, CheckCircle2, Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DebtorModal } from "@/components/fios/DebtorModal";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Debtor, Fio } from "@/lib/db/schema";

type DebtorWithTotal = Debtor & { totalPending: number };

const today = () => new Date().toISOString().slice(0, 10);

/* ─── Fila expandible por persona ─── */
function DebtorRow({
  debtor,
  onEdit,
  onDelete,
  onChanged,
}: {
  debtor: DebtorWithTotal;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [fios,    setFios]    = useState<Fio[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding,  setAdding]  = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [form,    setForm]    = useState({ amount: "", description: "", date: today() });

  const loadFios = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/fios/${debtor.id}`);
    const data: Fio[] = await res.json();
    setFios(data.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
    setLoading(false);
  }, [debtor.id]);

  useEffect(() => { if (open) loadFios(); }, [open, loadFios]);

  async function handleAddFio() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error("Monto inválido"); return; }
    if (!form.description.trim()) { toast.error("Escribe una descripción"); return; }
    const res = await fetch("/api/fios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debtorId: debtor.id, amount, description: form.description, date: form.date }),
    });
    if (!res.ok) { toast.error("Error al agregar"); return; }
    toast.success("Fío agregado");
    setAdding(false);
    setForm({ amount: "", description: "", date: today() });
    loadFios();
    onChanged();
  }

  async function handlePay(fio: Fio) {
    await fetch(`/api/fios/${fio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pay_fio" }),
    });
    toast.success("¡Cobrado!");
    loadFios();
    onChanged();
  }

  async function handleDeleteFio(fio: Fio) {
    if (!confirm("¿Eliminar este fío?")) return;
    await fetch(`/api/fios/${fio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete_fio" }),
    });
    loadFios();
    onChanged();
  }

  const pending = fios.filter((f) => !f.paid);
  const paid    = fios.filter((f) => f.paid);
  const totalPaid = paid.reduce((s, f) => s + Number(f.amount), 0);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      {/* Cabecera de la persona — click para expandir */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
      >
        {/* Avatar inicial */}
        <div className="h-9 w-9 rounded-xl bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
          {debtor.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">{debtor.name}</p>
          {debtor.phone && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" /> {debtor.phone}
            </p>
          )}
        </div>

        <span className={`font-bold text-sm shrink-0 ${debtor.totalPending > 0 ? "text-red-600" : "text-green-600"}`}>
          {debtor.totalPending > 0 ? formatCurrency(debtor.totalPending) : "Al día ✓"}
        </span>

        <div className="flex items-center gap-2 ml-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-slate-300 hover:text-brand-600 transition-colors p-1"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-slate-300 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {open
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {/* Panel expandido */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
          {/* Botón / formulario agregar */}
          {adding ? (
            <div className="bg-white border border-brand-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-brand-700">Nuevo fío</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Monto (Bs)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={form.amount}
                    autoFocus
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha</label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>
              <Input
                placeholder="¿Qué se fió?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 py-1.5 text-xs" onClick={() => setAdding(false)}>Cancelar</Button>
                <Button className="flex-1 py-1.5 text-xs" onClick={handleAddFio}>Guardar</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Agregar fío
            </button>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin h-5 w-5 border-4 border-brand-600 border-t-transparent rounded-full" />
            </div>
          ) : fios.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Sin fíos registrados</p>
          ) : (
            <div className="space-y-2">
              {/* Pendientes */}
              {pending.map((f) => (
                <div key={f.id} className="flex items-center gap-3 bg-white border border-red-100 rounded-xl px-3 py-2.5">
                  <div className="w-0.5 h-8 bg-red-400 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-tight">{f.description}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" /> {formatDate(f.date)}
                    </p>
                  </div>
                  <span className="font-bold text-red-600 text-sm shrink-0">{formatCurrency(f.amount)}</span>
                  <button
                    onClick={() => handlePay(f)}
                    className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg transition-colors shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Cobrado
                  </button>
                  <button onClick={() => handleDeleteFio(f)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Pagados colapsables */}
              {paid.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowPaid((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium mt-1"
                  >
                    {showPaid ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    Cobrados ({paid.length}) · {formatCurrency(totalPaid)}
                  </button>
                  {showPaid && (
                    <div className="space-y-1.5 mt-2">
                      {paid.map((f) => (
                        <div key={f.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2 opacity-60">
                          <div className="w-0.5 h-6 bg-green-400 rounded-full shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 line-through">{f.description}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDate(f.date)}
                              {f.paidAt && <span className="text-green-600 ml-1">· cobrado {formatDate(f.paidAt)}</span>}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400 line-through shrink-0">{formatCurrency(f.amount)}</span>
                          <button onClick={() => handleDeleteFio(f)} className="text-slate-200 hover:text-red-400 transition-colors shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Página principal ─── */
export default function FiosPage() {
  const [debtors,     setDebtors]     = useState<DebtorWithTotal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState("");
  const [debtorModal, setDebtorModal] = useState(false);
  const [editing,     setEditing]     = useState<Debtor | null>(null);

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
  const withDebt    = debtors.filter((d) => d.totalPending > 0);
  const cleared     = debtors.filter((d) => d.totalPending === 0);

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

      {/* Resumen global */}
      {totalGlobal > 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Total pendiente</p>
            <p className="text-2xl font-bold text-red-700 mt-0.5">{formatCurrency(totalGlobal)}</p>
          </div>
          <div className="text-right text-xs text-red-400">
            <p>{withDebt.length} con deuda</p>
            {cleared.length > 0 && <p>{cleared.length} al día</p>}
          </div>
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
        <div className="space-y-2">
          {/* Primero los que tienen deuda */}
          {withDebt.map((d) => (
            <DebtorRow
              key={d.id}
              debtor={d}
              onEdit={() => { setEditing(d); setDebtorModal(true); }}
              onDelete={() => deleteDebtor(d)}
              onChanged={load}
            />
          ))}

          {/* Luego los que están al día (más opacos) */}
          {cleared.length > 0 && (
            <>
              {withDebt.length > 0 && (
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold pt-2 pb-1 px-1">Al día</p>
              )}
              {cleared.map((d) => (
                <div key={d.id} className="opacity-60">
                  <DebtorRow
                    debtor={d}
                    onEdit={() => { setEditing(d); setDebtorModal(true); }}
                    onDelete={() => deleteDebtor(d)}
                    onChanged={load}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <DebtorModal
        open={debtorModal}
        onClose={() => setDebtorModal(false)}
        debtor={editing}
        onSaved={load}
      />
    </div>
  );
}
