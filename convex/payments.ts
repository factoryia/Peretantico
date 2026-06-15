import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  DISTRIBUTOR_COMPLETED_STATUS,
  isRequestPaidToDistributor,
} from "./distributorPayments.helpers";

export const create = mutation({
  args: {
    distributorId: v.id("distributors"),
    title: v.string(),
    baseValue: v.optional(v.number()),
    additionalAmount: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    totalAmount: v.number(),
    requestIds: v.array(v.id("requests")),
    status: v.optional(v.string()),
    observations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", {
      distributorId: args.distributorId,
      title: args.title,
      baseValue: args.baseValue,
      additionalAmount: args.additionalAmount,
      discountAmount: args.discountAmount,
      totalAmount: args.totalAmount,
      status: args.status || "Completed",
      observations: args.observations,
    });

    await Promise.all(
      args.requestIds.map((requestId) =>
        ctx.db.insert("paymentRequests", {
          paymentId,
          requestId,
        })
      )
    );

    // Update all paid requests to Finalizada status
    await Promise.all(
      args.requestIds.map((requestId) =>
        ctx.db.patch(requestId, { requestStatus: "Finalizada" })
      )
    );

    return paymentId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("payments").collect();
  },
});

export const listPayments = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page || 1;
    const limit = args.limit || 10;
    const skip = (page - 1) * limit;

    const allPayments = await ctx.db.query("payments").order("desc").collect();
    const total = allPayments.length;
    
    const paginatedPayments = allPayments.slice(skip, skip + limit);

    const enrichedPayments = await Promise.all(
      paginatedPayments.map(async (payment) => {
        const distributor = payment.distributorId
          ? await ctx.db.get(payment.distributorId)
          : null;
        return {
          ...payment,
          distributor,
        };
      })
    );

    return {
      data: enrichedPayments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
});

export const getPendingRequestsByDistributor = query({
  args: {
    distributorId: v.id("distributors"),
  },
  handler: async (ctx, args) => {
    // Solo solicitudes completadas por el repartidor, pendientes de liquidación.
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_distributor", (q) => q.eq("distributorId", args.distributorId))
      .filter((q) => q.eq(q.field("requestStatus"), DISTRIBUTOR_COMPLETED_STATUS))
      .collect();

    if (requests.length === 0) return [];

    // 2. Check which ones are already paid (don't have payment associated)
    const pendingRequests = await Promise.all(
      requests.map(async (request) => {
        if (await isRequestPaidToDistributor(ctx, request._id)) return null;

        // Enrich with service and applicant info
        const service = await ctx.db.get(request.serviceId);
        const applicant = await ctx.db.get(request.applicantId);

        return {
          ...request,
          service,
          applicant,
        };
      })
    );

    return pendingRequests.filter((r) => r !== null);
  },
});

export const getPaymentsByDistributor = query({
  args: {
    distributorId: v.id("distributors"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_distributor", (q) => q.eq("distributorId", args.distributorId))
      .order("desc")
      .collect();
  },
});
