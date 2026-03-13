import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
// import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: {
    status: v.optional(v.boolean()),
    serviceId: v.optional(v.id("services")),
    distributorId: v.optional(v.id("distributors")),
    userId: v.optional(v.id("users")),
    applicationNumber: v.optional(v.string()),
    periodo: v.optional(v.string()),
    zonaId: v.optional(v.id("coverageAreas")),
    isPrioritized: v.optional(v.boolean()),
    paymentStatus: v.optional(v.string()),
    search: v.optional(v.string()),
    applicantName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("requests");

    if (args.status !== undefined) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }
    if (args.serviceId) {
      q = q.filter((q) => q.eq(q.field("serviceId"), args.serviceId));
    }
    if (args.distributorId) {
      q = q.filter((q) => q.eq(q.field("distributorId"), args.distributorId));
    }
    // if (args.applicationNumber) {
    //   q = q.filter((q) => q.eq(q.field("applicationNumber"), args.applicationNumber));
    // }
    if (args.isPrioritized !== undefined) {
      q = q.filter((q) => q.eq(q.field("isPrioritized"), args.isPrioritized));
    }

    if (args.userId) {
      const distributor = await ctx.db
        .query("distributors")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .first();
      if (distributor) {
        q = q.filter((q) => q.eq(q.field("distributorId"), distributor._id));
      } else {
        return { page: [], isDone: true, continueCursor: "" };
      }
    }

    const results = await q.collect();

    let page = await Promise.all(
      results.map(async (request) => {
        const applicant = await ctx.db.get(request.applicantId);
        const service = await ctx.db.get(request.serviceId);
        const distributor = request.distributorId
          ? await ctx.db.get(request.distributorId)
          : null;
        
        let evidenceUrl = request.evidenceUrl;
        if (request.evidenceStorageId && !evidenceUrl) {
           evidenceUrl = await ctx.storage.getUrl(request.evidenceStorageId) || undefined;
        }

        const payment = await ctx.db
          .query("paymentRequests")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .first();
        
        const paymentStatus = payment ? "Pagado" : "Pendiente";
        
        return {
          ...request,
          applicant,
          service,
          distributor,
          evidenceUrl,
          paymentStatus,
        };
      })
    );

    if (args.paymentStatus && args.paymentStatus !== "all") {
      page = page.filter((req) => req.paymentStatus === args.paymentStatus);
    }

    if (args.applicationNumber) {
      const searchNum = args.applicationNumber.toLowerCase();
      page = page.filter((req) =>
        req.applicationNumber.toLowerCase().includes(searchNum)
      );
    }

    if (args.applicantName) {
      const searchName = args.applicantName.toLowerCase();
      page = page.filter((req) =>
        req.applicant?.fullName?.toLowerCase().includes(searchName) ||
        req.applicant?.documentNumber?.includes(searchName)
      );
    }

    return page;
  },
});

export const get = query({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) return null;

    const [applicant, service, distributor, requestData, attachments] = await Promise.all([
      ctx.db.get(request.applicantId),
      ctx.db.get(request.serviceId),
      request.distributorId ? ctx.db.get(request.distributorId) : null,
      ctx.db
        .query("requestData")
        .withIndex("by_request", (q) => q.eq("requestId", request._id))
        .collect(),
      ctx.db
        .query("attachments")
        .withIndex("by_request", (q) => q.eq("requestId", request._id))
        .collect(),
    ]);

    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (a) => {
        if (a.storageId) {
          const storageUrl = await ctx.storage.getUrl(a.storageId as unknown as Id<"_storage">);
          if (storageUrl) return { ...a, url: storageUrl };
        }
        return a;
      })
    );

    const dataWithFields = await Promise.all(
      requestData.map(async (data) => {
        const field = await ctx.db.get(data.fieldId);
        let value = data.value;
        
        // Generate URL for file fields if value is a storage ID
        if (field?.type === "File" && typeof value === "string") {
            // Check if it looks like a storage ID (simple heuristic or try/catch)
            // Convex storage IDs are alphanumeric strings. 
            // We'll attempt to get a URL, if it returns null, we keep the original value
            try {
                const url = await ctx.storage.getUrl(value as unknown as Id<"_storage">);
                if (url) {
                    value = url;
                }
            } catch {
                // Not a valid storage ID, ignore
            }
        }
        
        return { ...data, field, value };
      })
    );

    let evidenceUrl = request.evidenceUrl;
    if (request.evidenceStorageId && !evidenceUrl) {
       evidenceUrl = await ctx.storage.getUrl(request.evidenceStorageId) || undefined;
    }

    return {
      ...request,
      applicant,
      service,
      distributor,
      data: dataWithFields,
      attachments: attachmentsWithUrls,
      evidenceUrl,
    };
  },
});

export const getByApplicationNumber = query({
  args: { applicationNumber: v.string() },
  handler: async (ctx, args) => {
    const applicationNumber = args.applicationNumber.trim();
    if (!applicationNumber) return null;

    const request = await ctx.db
      .query("requests")
      .withIndex("by_applicationNumber", (q) =>
        q.eq("applicationNumber", applicationNumber)
      )
      .first();
    if (!request) return null;

    const [applicant, service, distributor, payment] = await Promise.all([
      ctx.db.get(request.applicantId),
      ctx.db.get(request.serviceId),
      request.distributorId ? ctx.db.get(request.distributorId) : null,
      ctx.db
        .query("paymentRequests")
        .withIndex("by_request", (q) => q.eq("requestId", request._id))
        .first(),
    ]);

    const paymentStatus = payment ? "Pagado" : "Pendiente";

    return {
      ...request,
      applicant,
      service,
      distributor,
      paymentStatus,
    };
  },
});

export const create = mutation({
  args: {
    applicantId: v.id("profiles"),
    serviceId: v.id("services"),
    title: v.optional(v.string()),
    entryDate: v.number(),
    data: v.array(
      v.object({
        fieldId: v.id("serviceFields"),
        value: v.any(),
      })
    ),
    attachments: v.array(
      v.object({
        fileName: v.string(),
        url: v.string(),
        storageId: v.optional(v.string()),
      })
    ),
    paymentMethod: v.optional(v.string()),
    isPrioritized: v.optional(v.boolean()),
    requestStatus: v.optional(v.string()),
    
    // Financials
    logisticsCosts: v.optional(v.number()),
    serviceValue: v.optional(v.number()),
    prioritizedValue: v.optional(v.number()),
    
    // Timings
    estimatedApplicationHour: v.optional(v.number()),
    estimatedPrioritizedHour: v.optional(v.number()),
    
    // Flags
    isRecurring: v.optional(v.boolean()),
    promote: v.optional(v.boolean()),
    sticky: v.optional(v.boolean()),
    status: v.optional(v.boolean()),
    
    applicationScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const applicationNumber = `REQ-${randomDigits}`;

    const requestId = await ctx.db.insert("requests", {
      applicationNumber,
      applicantId: args.applicantId,
      serviceId: args.serviceId,
      entryDate: args.entryDate,
      status: args.status ?? true,
      requestStatus: args.requestStatus || "EnProceso",
      isPrioritized: args.isPrioritized || false,
      promote: args.promote || false,
      sticky: args.sticky || false,
      isRecurring: args.isRecurring || false,
      title: args.title,
      
      paymentMethod: args.paymentMethod,
      logisticsCosts: args.logisticsCosts,
      serviceValue: args.serviceValue,
      prioritizedValue: args.prioritizedValue,
      estimatedApplicationHour: args.estimatedApplicationHour,
      estimatedPrioritizedHour: args.estimatedPrioritizedHour,
      applicationScore: args.applicationScore,
    });

    await Promise.all([
      ...args.data.map((item) =>
        ctx.db.insert("requestData", {
          requestId,
          fieldId: item.fieldId,
          value: item.value,
        })
      ),
      ...args.attachments.map((item) =>
        ctx.db.insert("attachments", {
          requestId,
          fileName: item.fileName,
          url: item.url,
          storageId: item.storageId as any,
        })
      ),
    ]);

    return requestId;
  },
});

export const update = mutation({
  args: {
    id: v.id("requests"),
    data: v.optional(
      v.array(
        v.object({
          fieldId: v.id("serviceFields"),
          value: v.any(),
        })
      )
    ),
    // Fields to update
    applicationNumber: v.optional(v.string()),
    title: v.optional(v.string()),
    status: v.optional(v.boolean()),
    requestStatus: v.optional(v.string()),
    observations: v.optional(v.string()),
    isPrioritized: v.optional(v.boolean()),
    promote: v.optional(v.boolean()),
    sticky: v.optional(v.boolean()),
    isRecurring: v.optional(v.boolean()),
    
    paymentMethod: v.optional(v.string()),
    logisticsCosts: v.optional(v.number()),
    serviceValue: v.optional(v.number()),
    prioritizedValue: v.optional(v.number()),
    
    entryDate: v.optional(v.number()),
    estimatedApplicationHour: v.optional(v.number()),
    estimatedPrioritizedHour: v.optional(v.number()),
    applicationScore: v.optional(v.number()),
    
    applicantId: v.optional(v.id("profiles")),
    distributorId: v.optional(v.id("distributors")),
    serviceId: v.optional(v.id("services")),
    
    // Evidence
    evidenceStorageId: v.optional(v.id("_storage")),
    evidenceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, data, ...fields } = args;

    const patchData: any = { ...fields };
    // observations is in schema, so we can update it
    
    await ctx.db.patch(id, patchData);

    if (data) {
      for (const item of data) {
        const existing = await ctx.db
          .query("requestData")
          .withIndex("by_request_field", (q) => 
            q.eq("requestId", id).eq("fieldId", item.fieldId)
          )
          .first();
        
        if (existing) {
          await ctx.db.patch(existing._id, { value: item.value });
        } else {
          await ctx.db.insert("requestData", {
            requestId: id,
            fieldId: item.fieldId,
            value: item.value,
          });
        }
      }
    }
  },
});

export const assignDistributor = mutation({
  args: {
    id: v.id("requests"),
    distributorId: v.id("distributors"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      distributorId: args.distributorId,
      requestStatus: "EnProceso",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    // Delete related data first
    const requestData = await ctx.db
      .query("requestData")
      .withIndex("by_request", (q) => q.eq("requestId", args.id))
      .collect();
    for (const item of requestData) {
      await ctx.db.delete(item._id);
    }

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_request", (q) => q.eq("requestId", args.id))
      .collect();
    for (const item of attachments) {
      await ctx.db.delete(item._id);
      // Optional: delete from storage if storageId exists
      // if (item.storageId) await ctx.storage.delete(item.storageId);
    }

    await ctx.db.delete(args.id);
  },
});
