"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EXPENSE_CATEGORIES } from "@/lib/utils";
import type { Expense } from "@/lib/db/schema";

const schema = z.object({
  amount:      z.coerce.number().positive("El monto debe ser mayor a 0"),
  description: z.string().min(1, "Descripción requerida"),
  category:    z.string().min(1),
  date:        z.string().min(1, "Fecha requerida"),
  notes:       z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open:    boolean;
  onClose: () => void;
  expense?: Expense | null;
  onSaved: () => void;
}

export function ExpenseModal({ open, onClose, expense, onSaved }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (expense) {
      reset({
        amount:      parseFloat(expense.amount),
        description: expense.description,
        category:    expense.category,
        date:        expense.date,
        notes:       expense.notes ?? "",
      });
    } else {
      reset({
        category: "otros",
        date:     new Date().toISOString().split("T")[0],
      });
    }
  }, [expense, reset, open]);

  async function onSubmit(data: FormData) {
    const url    = expense ? `/api/egresos/${expense.id}` : "/api/egresos";
    const method = expense ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) { toast.error("Error al guardar egreso"); return; }
    toast.success(expense ? "Egreso actualizado" : "Egreso registrado");
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={expense ? "Editar Egreso" : "Nuevo Egreso"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Monto (L) *"
          type="number"
          step="0.01"
          {...register("amount")}
          error={errors.amount?.message}
          placeholder="0.00"
        />
        <Input
          label="Descripción *"
          {...register("description")}
          error={errors.description?.message}
          placeholder="ej. Pago de alquiler, depósito al banco..."
        />
        <Select
          label="Categoría"
          options={EXPENSE_CATEGORIES}
          {...register("category")}
        />
        <Input
          label="Fecha *"
          type="date"
          {...register("date")}
          error={errors.date?.message}
        />
        <Input
          label="Notas (opcional)"
          {...register("notes")}
          placeholder="Información adicional..."
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>
            {expense ? "Guardar cambios" : "Registrar egreso"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
