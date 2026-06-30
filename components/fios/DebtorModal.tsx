"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Debtor } from "@/lib/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  debtor: Debtor | null;
  onSaved: () => void;
}

const EMPTY = { name: "", phone: "", notes: "" };

export function DebtorModal({ open, onClose, debtor, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(debtor
      ? { name: debtor.name, phone: debtor.phone ?? "", notes: debtor.notes ?? "" }
      : EMPTY
    );
  }, [debtor, open]);

  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const res = debtor
        ? await fetch(`/api/fios/${debtor.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "update_debtor", ...form }),
          })
        : await fetch("/api/fios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "debtor", ...form }),
          });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Error al guardar"); return; }
      toast.success(debtor ? "Persona actualizada" : "Persona creada");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={debtor ? "Editar persona" : "Nueva persona"} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre completo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Ej: 70012345"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Observaciones..."
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : debtor ? "Guardar cambios" : "Crear persona"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
