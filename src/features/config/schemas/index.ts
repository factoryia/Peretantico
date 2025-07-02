import * as z from "zod";

export const serviceSchema = z.object({
  categoryId: z.string().min(1, "Debe seleccionar una categoría"),
  name: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  status: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
