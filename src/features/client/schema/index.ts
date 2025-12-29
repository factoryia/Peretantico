import { z } from "zod";

export const customerSchema = z.object({
  fullName: z
    .string()
    .min(1, "El nombre completo es requerido")
    .max(100, "Máximo 100 caracteres"),
  documentType: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z
    .string()
    .min(1, "El número de documento es requerido")
    .max(15, "Máximo 15 caracteres"),
  phoneNumber: z
    .string()
    .min(1, "El teléfono es requerido")
    .max(15, "Máximo 15 caracteres"),
  email: z
    .string()
    .email("Correo electrónico inválido")
    .max(100, "Máximo 100 caracteres")
    .or(z.literal(""))
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  department: z.string().min(1, "El departamento es requerido"),
  municipality: z.string().min(1, "El municipio es requerido"),
  address: z
    .string()
    .min(1, "La dirección es requerida")
    .max(200, "Máximo 200 caracteres"),
  photo_document: z
    .any()
    .refine(
      (files) =>
        files instanceof FileList ||
        files instanceof File ||
        Array.isArray(files) ||
        files === undefined ||
        files === null,
      { message: "Debe seleccionar un archivo válido" }
    )
    .optional(),
});
