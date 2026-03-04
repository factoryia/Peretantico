import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    // 1. Get all finished requests for the distributor
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_distributor", (q) => q.eq("distributorId", args.distributorId))
      .filter((q) => q.eq(q.field("requestStatus"), "Finalizada"))
      .collect();

    if (requests.length === 0) return [];

    // 2. Check which ones are already paid
    // We can't easily join in Convex, so we'll check for existence in paymentRequests
    // Since we expect the number of pending requests to be manageable, this is okay.
    // However, checking every request against paymentRequests might be slow if there are many.
    // Better approach:
    // Get all paymentRequests. This is also not efficient if there are many.
    
    // Optimized approach:
    // We only care if a request has *any* payment associated.
    // We can iterate and check.
    
    const pendingRequests = await Promise.all(
      requests.map(async (request) => {
        const paymentParams = await ctx.db
          .query("paymentRequests")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .first();
          
        if (paymentParams) return null; // Already paid

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
