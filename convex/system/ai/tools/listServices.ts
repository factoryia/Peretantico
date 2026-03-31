import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";
import type { Id } from "../../../_generated/dataModel";

export const listServices = createTool({
  description: "Lista todos los servicios disponibles con sus datos básicos",
  args: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  }),
  handler: async (ctx) => {
    const all = (await ctx.runQuery(anyApi.services.listAll, {})) as Array<{
      _id: Id<"services">;
      name?: string;
      status?: boolean;
      code?: string;
      description?: string;
      price?: number;
      hasPriority?: boolean;
      priorityPrice?: number;
    }>;
    const services = (all || [])
      .filter((s) => s.status !== false)
      .map((s) => ({
        id: String(s._id),
        name: String(s.name ?? ""),
        code: s.code ?? undefined,
        description: s.description ?? undefined,
        price: s.price ?? undefined,
        hasPriority: s.hasPriority ?? false,
        priorityPrice: s.priorityPrice ?? undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return { services: services.map((s, idx) => ({ ...s, index: idx + 1 })) };
  },
});
