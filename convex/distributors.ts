import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const distributorRecordArgs = {
  userId: v.optional(v.id("users")),
  email: v.optional(v.string()),
  documentNumber: v.string(),
  coverageAreaId: v.optional(v.id("coverageAreas")),
  transportationTypeId: v.optional(v.id("transportationTypes")),
  title: v.string(),
  documentType: v.string(),
  phoneNumber: v.string(),
  vehicleId: v.optional(v.string()),
  observations: v.optional(v.string()),
  status: v.boolean(),
  currentAvailability: v.boolean(),
  entryDate: v.string(),
};

async function ensureDistributorUser(
  ctx: MutationCtx,
  args: {
    email: string;
    title: string;
    documentType: string;
    documentNumber: string;
    phoneNumber: string;
    userId?: Id<"users">;
  }
): Promise<Id<"users">> {
  let userId = args.userId;
  const email = args.email.trim().toLowerCase();

  const existingUser = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), email))
    .first();

  if (existingUser) {
    userId = existingUser._id;
  } else {
    userId = await ctx.db.insert("users", {
      email,
      name: args.title,
    });
  }

  const existingProfile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!existingProfile) {
    await ctx.db.insert("profiles", {
      userId,
      fullName: args.title,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      phoneNumber: args.phoneNumber,
      email,
    });
  } else {
    await ctx.db.patch(existingProfile._id, {
      fullName: args.title,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      phoneNumber: args.phoneNumber,
      email,
    });
  }

  const role = await ctx.db
    .query("roles")
    .withIndex("by_name", (q) => q.eq("name", "Repartidor"))
    .first();

  if (role) {
    const hasRole = await ctx.db
      .query("userRoles")
      .withIndex("by_user_role", (q) => q.eq("userId", userId!).eq("roleId", role._id))
      .first();

    if (!hasRole) {
      await ctx.db.insert("userRoles", {
        userId,
        roleId: role._id,
      });
    }
  }

  return userId!;
}

export const getByUserId = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    
    // Try to query by userId first
    const distributor = await ctx.db
      .query("distributors")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId as Id<"users">))
      .first();
      
    if (distributor) return distributor._id;

    // Fallback: try by email (if userId lookup fails but email matches)
    // We need to fetch the user to get the email, but args.userId is just an ID string.
    // If the caller passes an email as userId (which shouldn't happen with correct usage), this won't help.
    // So let's stick to userId lookup.
    
    return null;
  },
});

export const getNotificationEmail = internalQuery({
  args: { distributorId: v.id("distributors") },
  handler: async (ctx, args) => {
    const distributor = await ctx.db.get(args.distributorId);
    if (!distributor) {
      return null;
    }

    if (distributor.email?.trim()) {
      return distributor.email.trim();
    }

    if (!distributor.userId) {
      return null;
    }

    const user = await ctx.db.get(distributor.userId);
    return user?.email?.trim() || null;
  },
});

export const list = query({
  args: {
    status: v.optional(v.boolean()),
    coverageAreaId: v.optional(v.id("coverageAreas")),
    transportationTypeId: v.optional(v.id("transportationTypes")),
    paymentStatus: v.optional(v.string()),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("distributors");

    if (args.status !== undefined) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }
    if (args.coverageAreaId) {
      q = q.filter((q) => q.eq(q.field("coverageAreaId"), args.coverageAreaId));
    }
    if (args.transportationTypeId) {
      q = q.filter((q) => q.eq(q.field("transportationTypeId"), args.transportationTypeId));
    }
    if (args.search) {
      q = q.filter((q) => q.eq(q.field("documentNumber"), args.search));
    }

    const results = await q.paginate(args.paginationOpts);

    const page = await Promise.all(
      results.page.map(async (distributor) => {
        const user = distributor.userId ? await ctx.db.get(distributor.userId) : null;
        const coverageArea = distributor.coverageAreaId ? await ctx.db.get(distributor.coverageAreaId) : null;
        const transportationType = distributor.transportationTypeId ? await ctx.db.get(distributor.transportationTypeId) : null;
        
        // Calculate payment status based on unpaid finalized requests
        const finishedRequests = await ctx.db
          .query("requests")
          .withIndex("by_distributor", (q) => q.eq("distributorId", distributor._id))
          .filter((q) => q.eq(q.field("requestStatus"), "Finalizada"))
          .collect();

        let paymentStatus = "Pagado";
        
        if (finishedRequests.length > 0) {
          // Check if any finished request is NOT in paymentRequests
          for (const req of finishedRequests) {
            const payment = await ctx.db
              .query("paymentRequests")
              .withIndex("by_request", (q) => q.eq("requestId", req._id))
              .first();
            
            if (!payment) {
              paymentStatus = "Pendiente";
              break;
            }
          }
        }

        return {
          ...distributor,
          user,
          coverageArea,
          transportationType,
          paymentStatus,
        };
      })
    );

    return { ...results, page };
  },
});

export const listAll = query({
  args: {
    status: v.optional(v.boolean()),
    coverageAreaId: v.optional(v.id("coverageAreas")),
    transportationTypeId: v.optional(v.id("transportationTypes")),
    paymentStatus: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("distributors");

    if (args.status !== undefined) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }
    if (args.coverageAreaId) {
      q = q.filter((q) => q.eq(q.field("coverageAreaId"), args.coverageAreaId));
    }
    if (args.transportationTypeId) {
      q = q.filter((q) => q.eq(q.field("transportationTypeId"), args.transportationTypeId));
    }
    if (args.search) {
      q = q.filter((q) => q.eq(q.field("documentNumber"), args.search));
    }

    const distributors = await q.collect();

    const results = await Promise.all(
      distributors.map(async (distributor) => {
        const user = distributor.userId ? await ctx.db.get(distributor.userId) : null;
        const coverageArea = distributor.coverageAreaId ? await ctx.db.get(distributor.coverageAreaId) : null;
        const transportationType = distributor.transportationTypeId ? await ctx.db.get(distributor.transportationTypeId) : null;
        
        // Calculate payment status based on unpaid finalized requests
        const finishedRequests = await ctx.db
          .query("requests")
          .withIndex("by_distributor", (q) => q.eq("distributorId", distributor._id))
          .filter((q) => q.eq(q.field("requestStatus"), "Finalizada"))
          .collect();

        let paymentStatus = "Pagado";
        
        if (finishedRequests.length > 0) {
          // Check if any finished request is NOT in paymentRequests
          for (const req of finishedRequests) {
            const payment = await ctx.db
              .query("paymentRequests")
              .withIndex("by_request", (q) => q.eq("requestId", req._id))
              .first();
            
            if (!payment) {
              paymentStatus = "Pendiente";
              break;
            }
          }
        }

        return {
          ...distributor,
          user,
          coverageArea,
          transportationType,
          paymentStatus,
        };
      })
    );

    return results;
  },
});

export const create = mutation({
  args: distributorRecordArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("distributors")
      .withIndex("by_documentNumber", (q) => q.eq("documentNumber", args.documentNumber))
      .first();
    if (existing) throw new Error("Ya existe un repartidor con esta cédula");

    const email = args.email?.trim().toLowerCase();
    if (!email) throw new Error("El correo es obligatorio para el acceso del repartidor");

    const userId = await ensureDistributorUser(ctx, {
      userId: args.userId,
      email,
      title: args.title,
      documentType: args.documentType,
      documentNumber: args.documentNumber,
      phoneNumber: args.phoneNumber,
    });

    const distributorId = await ctx.db.insert("distributors", {
      userId,
      title: args.title,
      documentNumber: args.documentNumber,
      documentType: args.documentType,
      phoneNumber: args.phoneNumber,
      email,
      entryDate: new Date(args.entryDate).getTime(),
      vehicleId: args.vehicleId,
      observations: args.observations,
      coverageAreaId: args.coverageAreaId,
      transportationTypeId: args.transportationTypeId,
      status: args.status,
      currentAvailability: args.currentAvailability,
    });

    await ctx.scheduler.runAfter(0, internal.distributorCredentials.provision, {
      email,
      documentNumber: args.documentNumber,
    });

    return distributorId;
  },
});

export const update = mutation({
  args: {
    id: v.id("distributors"),
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    coverageAreaId: v.optional(v.id("coverageAreas")),
    transportationTypeId: v.optional(v.id("transportationTypes")),
    title: v.optional(v.string()),
    documentType: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    vehicleId: v.optional(v.string()),
    observations: v.optional(v.string()),
    status: v.optional(v.boolean()),
    currentAvailability: v.optional(v.boolean()),
    entryDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, entryDate, ...rest } = args;
    const current = await ctx.db.get(id);
    if (!current) throw new Error("Repartidor no encontrado");

    const updates: Partial<Doc<"distributors">> = { ...rest };
    if (rest.email !== undefined) {
      updates.email = rest.email.trim().toLowerCase() || undefined;
    }
    if (entryDate) {
      updates.entryDate = new Date(entryDate).getTime();
    }

    const nextEmail = (updates.email ?? current.email)?.trim().toLowerCase();
    const nextDocument = updates.documentNumber ?? current.documentNumber;
    const nextTitle = updates.title ?? current.title;
    const nextDocumentType = updates.documentType ?? current.documentType;
    const nextPhone = updates.phoneNumber ?? current.phoneNumber;

    if (nextEmail) {
      const userId = await ensureDistributorUser(ctx, {
        userId: current.userId ?? undefined,
        email: nextEmail,
        title: nextTitle,
        documentType: nextDocumentType,
        documentNumber: nextDocument,
        phoneNumber: nextPhone,
      });
      updates.userId = userId;
    }

    await ctx.db.patch(id, updates);

    if (nextEmail && nextDocument) {
      await ctx.scheduler.runAfter(0, internal.distributorCredentials.provision, {
        email: nextEmail,
        documentNumber: nextDocument,
      });
    }

    return id;
  },
});

export const backfillCredentials = action({
  args: {},
  handler: async (ctx): Promise<{ total: number; synced: number; errors: string[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("No autorizado");
    return await ctx.runAction(internal.distributorCredentials.backfillAll, {});
  },
});

export const remove = mutation({
  args: { id: v.id("distributors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
