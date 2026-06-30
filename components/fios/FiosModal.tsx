"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, CheckCircle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { Debtor, Fio } from "@/lib/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  debtor: Debtor | null;
  onChanged: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function FiosModal({ open, onClose, debtor, onChanged }: Props) {
  const [fios, setFios]       = useState<Fio[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState({ amount: "", description: "", date: today() });

  const loadFios = useCallback(async () => {
    if (!debtor) return;
    setLoading(true);
    const res = await fetch(`/api/fios/${debtor.id}`);
    setFios(await res.json());
    setLoading(false);
  }, [debtor]);

  useEffect(() => {
    if (open && debtor) { loadFios(); setAdding(false); setForm({ amount: "", description: "", date: today() }); }
  }, [open, debtor, loadFios]);

  async function handleAddFio() {
    if (!debtor) return;
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error("Ingresa un monto válido"); return; }
    if (!form.description.trim()) { toast.error("Ingresa una descripción"); return; }
    const res = await fetch("/api/fios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debtorId: debtor.id, amount, description: form.description, date: form.date }),
    });
    if (!res.ok) { toast.error("Error al agregar fío"); return; }
    toast.success("Fío agregado");
    setAdding(false);
    setForm({ amount: "", description: "", date: today() });
    loadFios();
    onChanged();
  }

  async function handlePay(fio: Fio) {
    if (!confirm(`¿Marcar "${fio.description}" como pagado?`)) return;
    await fetch(`/api/fios/${fio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pay_fio" }),
    });
    toast.success("Marcado como pagado");
    loadFios();
    onChanged();
  }

  async function handleDeleteFio(fio: Fio) {
    if (!confirm(`¿Eliminar este fío?`)) return;
    await fetch(`/api/fios/${fio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "delete_fio" }),
    });
    toast.success("Fío eliminado");
    loadFios();
    onChanged();
  }

  const pending = fios.filter((f) => !f.paid);
  const paid    = fios.filter((f) => f.paid);
  const totalPending = pending.reduce((s, f) => s + Number(f.amount), 0);

  return (
    <Modal open={open} onClose={onClose} title={debtor ? `Fíos de ${debtor.name}` : "Fíos"} size="lg">
      {/* Total pending */}
      <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
        <span className="text-sm font-medium text-red-700">Total pendiente</span>
        <span className="text-lg font-bold text-red-700">{formatCurrency(totalPending)}</span>
      </div>

      {/* Add fio form */}
      {adding ? (
        <div className="mb-4 p-3 rounded-xl border border-brand-200 bg-brand-50 space-y-3">
          <p className="text-sm font-medium text-slate-700">Nuevo fío</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monto (Bs)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.amount}
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
          <div>
            <label className="block text-xs text-slate-500 mb-1">Descripción</label>
            <Input
              placeholder="¿Qué se fió?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAddFio}>Guardar fío</Button>
          </div>
        </div>
      ) : (
        <Button className="w-full mb-4" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Agregar fío
        </Button>
      )}

      {/* Pending fios */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : pending.length === 0 && paid.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-6">Sin fíos registrados</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pendientes</p>
              <div className="space-y-2">
                {pending.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{f.description}</p>
                      <p className="text-xs text-slate-400">{f.date}</p>
                    </div>
                    <span className="font-bold text-red-600 shrink-0">{formatCurrency(f.amount)}</span>
                    <button onClick={() => handlePay(f)} className="text-green-500 hover:text-green-700" title="Marcar pagado">
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDeleteFio(f)} className="text-slate-300 hover:text-red-500" title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paid.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pagados</p>
              <div className="space-y-2 opacity-60">
                {paid.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-500 line-through truncate">{f.description}</p>
                      <p className="text-xs text-slate-400">{f.date}</p>
                    </div>
                    <span className="text-slate-400 line-through shrink-0">{formatCurrency(f.amount)}</span>
                    <button onClick={() => handleDeleteFio(f)} className="text-slate-300 hover:text-red-500" title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
