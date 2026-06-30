"use client";
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, CheckCircle2, Trash2, Phone, ChevronDown, ChevronUp, Calendar, HandCoins } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Debtor, Fio } from "@/lib/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  debtor: Debtor | null;
  onChanged: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function FiosModal({ open, onClose, debtor, onChanged }: Props) {
  const [fios,        setFios]        = useState<Fio[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [adding,      setAdding]      = useState(false);
  const [showPaid,    setShowPaid]    = useState(false);
  const [form,        setForm]        = useState({ amount: "", description: "", date: today() });

  const loadFios = useCallback(async () => {
    if (!debtor) return;
    setLoading(true);
    const res = await fetch(`/api/fios/${debtor.id}`);
    const data: Fio[] = await res.json();
    // newest first
    setFios(data.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
    setLoading(false);
  }, [debtor]);

  useEffect(() => {
    if (open && debtor) {
      loadFios();
      setAdding(false);
      setShowPaid(false);
      setForm({ amount: "", description: "", date: today() });
    }
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
    toast.success("Fío eliminado");
    loadFios();
    onChanged();
  }

  const pending      = fios.filter((f) => !f.paid);
  const paid         = fios.filter((f) => f.paid);
  const totalPending = pending.reduce((s, f) => s + Number(f.amount), 0);
  const totalPaid    = paid.reduce((s, f) => s + Number(f.amount), 0);

  return (
    <Modal open={open} onClose={onClose} title="" size="xl">
      {debtor && (
        <div className="-mx-6 -mt-4">
          {/* Header con info del deudor */}
          <div className="px-6 pt-2 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{debtor.name}</h2>
                {debtor.phone && (
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3.5 w-3.5" /> {debtor.phone}
                  </p>
                )}
                {debtor.notes && (
                  <p className="text-xs text-slate-400 italic mt-1">{debtor.notes}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-0.5">Total pendiente</p>
                <p className={`text-2xl font-bold ${totalPending > 0 ? "text-red-600" : "text-green-600"}`}>
                  {totalPending > 0 ? formatCurrency(totalPending) : "Al día ✓"}
                </p>
              </div>
            </div>

            {/* Resumen rápido */}
            <div className="flex gap-3 mt-3">
              <div className="flex-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-center">
                <p className="text-xs text-red-500 font-medium">Pendientes</p>
                <p className="text-lg font-bold text-red-700">{pending.length}</p>
              </div>
              <div className="flex-1 rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-center">
                <p className="text-xs text-green-600 font-medium">Cobrados</p>
                <p className="text-lg font-bold text-green-700">{paid.length}</p>
              </div>
              {totalPaid > 0 && (
                <div className="flex-1 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-center">
                  <p className="text-xs text-slate-500 font-medium">Total cobrado</p>
                  <p className="text-lg font-bold text-slate-600">{formatCurrency(totalPaid)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4">
            {/* Botón agregar */}
            {!adding ? (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors text-sm font-medium mb-4"
              >
                <Plus className="h-4 w-4" /> Agregar fío manual
              </button>
            ) : (
              <div className="mb-4 p-4 rounded-xl border-2 border-brand-200 bg-brand-50 space-y-3">
                <p className="text-sm font-semibold text-brand-800">Nuevo fío</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Monto (Bs)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      autoFocus
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
                  <label className="block text-xs text-slate-500 mb-1">¿Qué se fió?</label>
                  <Input
                    placeholder="Ej: 2 kg arroz, 1 aceite..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
                  <Button className="flex-1" onClick={handleAddFio}>Guardar</Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-6 w-6 border-4 border-brand-600 border-t-transparent rounded-full" />
              </div>
            ) : pending.length === 0 && paid.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-400">
                <HandCoins className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">Sin fíos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pendientes */}
                {pending.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                      Pendientes de cobro
                    </p>
                    <div className="space-y-2">
                      {pending.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-xl border border-red-100 bg-white overflow-hidden"
                        >
                          <div className="flex items-stretch">
                            {/* Franja lateral roja */}
                            <div className="w-1 bg-red-400 shrink-0 rounded-l-xl" />
                            <div className="flex-1 px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-slate-800 leading-snug">{f.description}</p>
                                <span className="font-bold text-red-600 text-base shrink-0 ml-2">
                                  {formatCurrency(f.amount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(f.date)}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handlePay(f)}
                                    className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Cobrado
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFio(f)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cobrados (colapsable) */}
                {paid.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowPaid((v) => !v)}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 hover:text-slate-600 transition-colors"
                    >
                      {showPaid ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      Cobrados ({paid.length}) · {formatCurrency(totalPaid)}
                    </button>

                    {showPaid && (
                      <div className="space-y-2">
                        {paid.map((f) => (
                          <div
                            key={f.id}
                            className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden opacity-70"
                          >
                            <div className="flex items-stretch">
                              <div className="w-1 bg-green-400 shrink-0 rounded-l-xl" />
                              <div className="flex-1 px-4 py-3">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm text-slate-500 line-through leading-snug">{f.description}</p>
                                  <span className="text-slate-400 line-through text-sm shrink-0 ml-2">
                                    {formatCurrency(f.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                  <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {formatDate(f.date)}
                                    {f.paidAt && (
                                      <span className="ml-2 text-green-600">
                                        · Cobrado {formatDate(f.paidAt)}
                                      </span>
                                    )}
                                  </p>
                                  <button
                                    onClick={() => handleDeleteFio(f)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
