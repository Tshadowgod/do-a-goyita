"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Loader2, Barcode } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/db/schema";

const schema = z.object({
  name:        z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  price:       z.coerce.number().positive("Precio debe ser mayor a 0"),
  cost:        z.coerce.number().nonnegative().optional(),
  quantity:    z.coerce.number().int().nonnegative(),
  barcode:     z.string().optional(),
  imageUrl:    z.string().optional(),
  category:    z.string().optional(),
  unit:        z.string().optional(),
  minStock:    z.coerce.number().int().nonnegative().optional(),
});

type FormData = z.infer<typeof schema>;

const UNITS = [
  { value: "unidad",  label: "Unidad" },
  { value: "litro",   label: "Litro" },
  { value: "kg",      label: "Kilogramo" },
  { value: "gramo",   label: "Gramo" },
  { value: "caja",    label: "Caja" },
  { value: "paquete", label: "Paquete" },
  { value: "bolsa",   label: "Bolsa" },
  { value: "docena",  label: "Docena" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: () => void;
}

export function ProductModal({ open, onClose, product, onSaved }: Props) {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (product) {
      reset({
        name:        product.name,
        description: product.description ?? "",
        price:       parseFloat(product.price),
        cost:        product.cost ? parseFloat(product.cost) : undefined,
        quantity:    product.quantity,
        barcode:     product.barcode ?? "",
        imageUrl:    product.imageUrl ?? "",
        category:    product.category ?? "",
        unit:        product.unit ?? "unidad",
        minStock:    product.minStock ?? 5,
      });
    } else {
      reset({ unit: "unidad", quantity: 0, minStock: 5 });
    }
  }, [product, reset, open]);

  async function onSubmit(data: FormData) {
    const url    = product ? `/api/productos/${product.id}` : "/api/productos";
    const method = product ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = Array.isArray(body.error)
        ? body.error.map((e: { message: string }) => e.message).join(", ")
        : body.error ?? "Error desconocido";
      toast.error(`Error: ${msg}`);
      return;
    }
    toast.success(product ? "Producto actualizado" : "Producto creado");
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? "Editar Producto" : "Nuevo Producto"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Nombre del producto *" {...register("name")} error={errors.name?.message} />
          </div>
          <Input label="Precio de venta *" type="number" step="0.01" {...register("price")} error={errors.price?.message} />
          <Input label="Costo (referencia)" type="number" step="0.01" {...register("cost")}  error={errors.cost?.message} />
          <Input label={product ? "Stock actual" : "Cantidad inicial"} type="number" {...register("quantity")} error={errors.quantity?.message} />

          <Input label="Stock mínimo"       type="number" {...register("minStock")}  error={errors.minStock?.message} />
          <Input label="Categoría"          {...register("category")} placeholder="Bebidas, Snacks..." />
          <Select label="Unidad" options={UNITS} {...register("unit")} />
          <div className="col-span-2">
            <Input label="Código de barras" {...register("barcode")} placeholder="Déjalo vacío para escanear después" />
          </div>
          <div className="col-span-2">
            <Input label="URL de imagen (opcional)" {...register("imageUrl")} placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <Input label="Descripción (opcional)" {...register("description")} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>
            {product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
