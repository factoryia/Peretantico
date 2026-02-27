import * as z from "zod";

const fieldTypeEnum = z.enum(["Text", "Number", "Date", "Boolean", "Select", "File"]);

export const serviceFieldSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "El nombre del campo es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  code: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .optional()
    .or(z.literal("")),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  type: fieldTypeEnum,
  required: z.boolean().default(false),
  multiple: z.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
  status: z.boolean().default(true),
});

export const serviceSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  price: z.coerce.number().int().min(0, "El precio debe ser mayor o igual a 0"),
  status: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
  fields: z.array(serviceFieldSchema).default([]),
});

export type ServiceFieldFormValues = z.infer<typeof serviceFieldSchema>;
export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const subserviceSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().max(250).optional(),
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
  description: z.string().max(250, "Máximo 250 caracteres").optional(),
  date: z.string().min(1, "La fecha es obligatoria"),
  repeat: z.enum(["si", "no"], {
    required_error: "Debe seleccionar una opción",
  }),
  status: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

export type SpecialDateFormValues = z.infer<typeof specialDateSchema>;
