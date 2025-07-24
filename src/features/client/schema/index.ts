// schema.ts
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
  birthDate: z.string().min(1, "La fecha de nacimiento es requerida"), // YYYY-MM-DD format
  gender: z.string().min(1, "El sexo es requerido"),
  phoneNumber: z
    .string()
    .min(1, "El teléfono es requerido")
    .max(15, "Máximo 15 caracteres"),
  email: z
    .string()
    .email("Correo electrónico inválido")
    .min(1, "El correo electrónico es requerido")
    .max(100, "Máximo 100 caracteres"),
  department: z.string().min(1, "El departamento es requerido"),
  municipality: z.string().min(1, "El municipio es requerido"),
  address: z
    .string()
    .min(1, "La dirección es requerida")
    .max(200, "Máximo 200 caracteres"),
  parentStatus: z.string().min(1, "¿Es padre o madre? es requerido"),
});
