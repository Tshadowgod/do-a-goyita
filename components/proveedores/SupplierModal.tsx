"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Supplier } from "@/lib/db/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onSaved: () => void;
}

const EMPTY = { name: "", contact: "", phone: "", email: "", address: "", notes: "" };

export function SupplierModal({ open, onClose, supplier, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name:    supplier.name    ?? "",
        contact: supplier.contact ?? "",
        phone:   supplier.phone   ?? "",
        email:   supplier.email   ?? "",
        address: supplier.address ?? "",
        notes:   supplier.notes   ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [supplier, open]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const url  = supplier ? `/api/proveedores/${supplier.id}` : "/api/proveedores";
      const method = supplier ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Error al guardar"); return; }
      toast.success(supplier ? "Proveedor actualizado" : "Proveedor creado");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={supplier ? "Editar proveedor" : "Nuevo proveedor"} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nombre del proveedor" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contacto</label>
            <Input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="Nombre del contacto" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Ej: 70012345" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="proveedor@ejemplo.com" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Calle, ciudad..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Observaciones, condiciones de pago..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : supplier ? "Guardar cambios" : "Crear proveedor"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
