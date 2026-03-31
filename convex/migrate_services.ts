import { internalMutation } from "./_generated/server";

const SERVICE_UPDATES = [
  {
    code: "property_certification",
    price: 40000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "property_unbundling_request",
    price: 40000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "marriage_certificate_request",
    price: 40000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "death_certificate_request",
    price: 40000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "water_sample_fridge",
    price: 26000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "correspondence_delivery",
    price: 30000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "medication_request",
    price: 40000,
    hasPriority: true,
    priorityPrice: 100000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "civil_registry_request",
    price: 40000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "rent_service",
    price: 100000,
  },
  {
    code: "deed_copy_request",
    price: 40000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
  {
    code: "property_plan_request",
    price: 40000,
    hasPriority: true,
    priorityPrice: 80000,
    estimatedHours: 24,
    priorityHours: 8,
  },
] as const;

export const migrateServices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();

    let updatedCount = 0;

    for (const service of services) {
      const update = SERVICE_UPDATES.find((item) => item.code === service.code);

      if (!update) continue;

      await ctx.db.patch(service._id, update);
      updatedCount++;
    }

    return {
      updatedCount,
      message: `Migrated ${updatedCount} services`,
    };
  },
});
