import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const listHandler = async (ctx: any, args: any) => {
    // List all services
    const services = await ctx.db.query("services").paginate(args.paginationOpts);

    // Fetch fields for each service
    const page = await Promise.all(
      services.page.map(async (service: any) => {
        const fields = await ctx.db
          .query("serviceFields")
          .withIndex("by_service", (q: any) => q.eq("serviceId", service._id))
          .collect();
        
        fields.sort((a: any, b: any) => a.order - b.order);
        return { ...service, fields };
      })
    );

    return { ...services, page };
};

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: listHandler,
});

export const listAllHandler = async (ctx: any) => {
    const services = await ctx.db.query("services").collect();

    const result = await Promise.all(
      services.map(async (service: any) => {
        const fields = await ctx.db
          .query("serviceFields")
          .withIndex("by_service", (q: any) => q.eq("serviceId", service._id))
          .collect();
        
        fields.sort((a: any, b: any) => a.order - b.order);
        return { ...service, fields };
      })
    );

    return result;
};

export const listAll = query({
  args: {},
  handler: listAllHandler,
});

export const listLiteHandler = async (ctx: any) => {
    const services = await ctx.db.query("services").collect();
    return services.map((s: any) => ({ _id: s._id, name: s.name }));
};

export const listLite = query({
  args: {},
  handler: listLiteHandler,
});

export const getHandler = async (ctx: any, args: any) => {
    const service = await ctx.db.get(args.id);
    if (!service) return null;
    
    const fields = await ctx.db
      .query("serviceFields")
      .withIndex("by_service", (q: any) => q.eq("serviceId", args.id))
      .collect();
    
    fields.sort((a: any, b: any) => a.order - b.order);
    return { ...service, fields };
};

export const get = query({
  args: { id: v.id("services") },
  handler: getHandler,
});

export const createHandler = async (ctx: any, args: any) => {
    // Check uniqueness
    const existing = await ctx.db
      .query("services")
      .withIndex("by_name", (q: any) => q.eq("name", args.name))
      .first();
    if (existing) throw new Error("Service name already exists");

    if (args.code) {
      const existingCode = await ctx.db
        .query("services")
        .withIndex("by_code", (q: any) => q.eq("code", args.code!))
        .first();
      if (existingCode) throw new Error("Service code already exists");
    }

    const serviceId = await ctx.db.insert("services", {
      name: args.name,
      code: args.code,
      category: args.category,
      price: args.price,
      status: args.status,
      description: args.description,
      workflowMode: args.workflowMode,
      workflowConfig: args.workflowConfig,
      hasPriority: args.hasPriority ?? false,
      priorityPrice: args.priorityPrice,
      estimatedHours: args.estimatedHours,
      priorityHours: args.priorityHours,
    });

    await Promise.all(
      args.fields.map((field: any) =>
        ctx.db.insert("serviceFields", {
          serviceId,
          ...field,
        })
      )
    );

    return serviceId;
};

export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    category: v.optional(v.union(v.literal("salud"), v.literal("notarial"))),
    description: v.optional(v.string()),
    price: v.number(),
    status: v.boolean(),
    hasPriority: v.optional(v.boolean()),
    priorityPrice: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    priorityHours: v.optional(v.number()),
    workflowMode: v.optional(v.union(v.literal("legacy"), v.literal("deterministic"))),
    workflowConfig: v.optional(v.any()),
    fields: v.array(
      v.object({
        name: v.string(),
        type: v.string(),
        required: v.boolean(),
        options: v.optional(v.any()),
        order: v.number(),
        code: v.optional(v.string()),
        description: v.optional(v.string()),
        multiple: v.optional(v.boolean()),
        status: v.optional(v.boolean()),
        settings: v.optional(v.any()),
      })
    ),
  },
  handler: createHandler,
});

export const updateHandler = async (ctx: any, args: any) => {
    const { id, fields, ...updates } = args;
    await ctx.db.patch(id, updates);
    
    if (fields) {
        const existingFields = await ctx.db
          .query("serviceFields")
          .withIndex("by_service", (q: any) => q.eq("serviceId", id))
          .collect();
          
        const incomingFieldIds = new Set(fields.map((f: any) => f.id).filter(Boolean));
        
        // Delete fields not in incoming
        for (const field of existingFields) {
            if (!incomingFieldIds.has(field._id)) {
                await ctx.db.delete(field._id);
            }
        }
        
        // Upsert fields
        for (const field of fields) {
            if (field.id) {
                const { id: fieldId, ...fieldData } = field;
                await ctx.db.patch(fieldId, fieldData);
            } else {
                const { id: _, ...fieldData } = field;
                await ctx.db.insert("serviceFields", {
                    serviceId: id,
                    ...fieldData,
                    multiple: fieldData.multiple ?? false,
                    status: fieldData.status ?? true,
                });
            }
        }
    }
};

export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    category: v.optional(v.union(v.literal("salud"), v.literal("notarial"))),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    status: v.optional(v.boolean()),
    hasPriority: v.optional(v.boolean()),
    priorityPrice: v.optional(v.number()),
    estimatedHours: v.optional(v.number()),
    priorityHours: v.optional(v.number()),
    workflowMode: v.optional(v.union(v.literal("legacy"), v.literal("deterministic"))),
    workflowConfig: v.optional(v.any()),
    fields: v.optional(v.array(
      v.object({
        id: v.optional(v.id("serviceFields")),
        name: v.string(),
        type: v.string(),
        required: v.boolean(),
        options: v.optional(v.any()),
        order: v.number(),
        code: v.optional(v.string()),
        description: v.optional(v.string()),
        multiple: v.optional(v.boolean()),
        status: v.optional(v.boolean()),
        settings: v.optional(v.any()),
      })
    )),
  },
  handler: updateHandler,
});

export const remove = mutation({
  args: {
    id: v.id("services"),
  },
  handler: async (ctx, args) => {
    const existingRequest = await ctx.db
      .query("requests")
      .withIndex("by_service", (q: any) => q.eq("serviceId", args.id))
      .first();

    if (existingRequest) {
      throw new Error(
        "No se puede eliminar el servicio porque tiene solicitudes asociadas. Primero elimina todas las solicitudes de este servicio y vuelve a intentarlo."
      );
    }

    const serviceFields = await ctx.db
      .query("serviceFields")
      .withIndex("by_service", (q: any) => q.eq("serviceId", args.id))
      .collect();

    for (const field of serviceFields) {
      const requestDataRows = await ctx.db
        .query("requestData")
        .withIndex("by_field", (q: any) => q.eq("fieldId", field._id))
        .collect();

      for (const row of requestDataRows) {
        await ctx.db.delete(row._id);
      }

      await ctx.db.delete(field._id);
    }

    await ctx.db.delete(args.id);
  },
});
