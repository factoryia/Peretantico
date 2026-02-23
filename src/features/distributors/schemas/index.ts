import z from "zod";

export const distributorSchema = z.object({
  title: z.string().min(1, "El nombre es obligatorio").max(100),
  documentNumber: z
    .string()
    .min(1)
    .max(15)
    .regex(/^\d+$/, "Solo se permiten números"),
  documentTypeId: z
    .string()
    .min(1, "El tipo de documento es requerido")
    .refine(
      (v) => ["CC", "CE", "TI", "PASSPORT", "NIT"].includes(v),
      "Seleccione un tipo de documento válido"
    ),
  phoneNumber: z
    .string()
    .min(1)
    .max(15)
    .regex(/^\d+$/, "Solo se permiten números"),
  email: z.string().max(100).email().optional().or(z.literal("")),
  coverageAreaId: z.string().min(1),
  transportationTypeId: z.string().min(1),
  vehicleId: z.string().max(10).optional().or(z.literal("")),
  status: z.boolean(),
  currentAvailability: z.boolean(),
  entryDate: z.string().min(1),
  observations: z.string().max(500).optional().or(z.literal("")),
});

export type DistributorFormValues = z.infer<typeof distributorSchema>;
