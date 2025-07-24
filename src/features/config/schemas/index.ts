import * as z from "zod";

export const serviceSchema = z.object({
  categoryId: z.string().min(1, "Debe seleccionar una categoría"),
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  status: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const subserviceSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().max(250).optional(),
  codigo: z.string().min(1).max(100),
  valor: z.string().min(1).max(20),
  valorPrioridad: z.string().min(1).max(20),
  estado: z.enum(["activo", "inactivo"]),
});

export type SubserviceFormValues = z.infer<typeof subserviceSchema>;

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  description: z.string().max(300, "Máximo 300 caracteres").optional(),
  status: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const specialDateSchema = z.object({
  title: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(200, "Máximo 200 caracteres"),
  field_description: z.string().max(250, "Máximo 250 caracteres").optional(),
  field_date: z.string().min(1, "La fecha es obligatoria"),
  field_is_annual: z.enum(["si", "no"], {
    required_error: "Debe seleccionar una opción",
  }),
  status: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

export type SpecialDateFormValues = z.infer<typeof specialDateSchema>;
