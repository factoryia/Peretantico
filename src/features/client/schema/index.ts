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
  birthDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val) return true;
        const inputDate = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return inputDate <= today;
      },
      { message: "La fecha de nacimiento no puede ser mayor al día actual" }
    ),
  gender: z.string().optional().or(z.literal("")),
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
  parentStatus: z.string().optional().or(z.literal("")),
});
