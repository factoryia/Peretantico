import { anyApi } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isDeterministicWorkflowEnabled, isGlobalDeterministicRequestsEnabled } from "./system/requestFlow";
// import { paginationOptsValidator } from "convex/server";

function getNormalizedRequestReadState(request: Doc<"requests">) {
  const receiptAttachmentIds = Array.isArray(request.receiptAttachmentIds) ? request.receiptAttachmentIds : [];

  return {
    addressSnapshot: request.addressSnapshot ?? null,
    flowStatus: request.flowStatus ?? null,
    paymentStatus:
      request.paymentStatus ?? (request.paymentMethod === "transfer" && receiptAttachmentIds.length > 0 ? "pending_admin_validation" : null),
    receiptAttachmentIds,
    adminValidationStatus: request.adminValidationStatus ?? "not_required",
  };
}

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
    entryDateFrom: v.optional(v.number()),
    entryDateTo: v.optional(v.number()),
    requestStatus: v.optional(v.string()),
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
        
        const paymentStatus = request.paymentStatus || (payment ? "Pagado" : "Pendiente");
        
        return {
          ...request,
          ...getNormalizedRequestReadState(request),
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

    if (args.entryDateFrom !== undefined) {
      page = page.filter((req) => req.entryDate >= args.entryDateFrom!);
    }

    if (args.entryDateTo !== undefined) {
      page = page.filter((req) => req.entryDate <= args.entryDateTo!);
    }

    if (args.requestStatus && args.requestStatus !== "all") {
      page = page.filter((req) => req.requestStatus === args.requestStatus);
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

    const receiptAttachments = attachmentsWithUrls.filter((attachment) => attachment.kind === "payment_receipt");
    const requestAttachments = attachmentsWithUrls.filter((attachment) => attachment.kind !== "payment_receipt");

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
      ...getNormalizedRequestReadState(request),
      applicant,
      service,
      distributor,
      data: dataWithFields,
      attachments: requestAttachments,
      receiptAttachments,
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

    const paymentStatus = request.paymentStatus || (payment ? "Pagado" : "Pendiente");

    return {
      ...request,
      ...getNormalizedRequestReadState(request),
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
        fieldId: v.optional(v.id("serviceFields")),
        kind: v.optional(v.string()),
      })
    ),
    paymentMethod: v.optional(v.string()),
    addressSnapshot: v.optional(v.object({
      raw: v.string(),
      source: v.union(v.literal("profile"), v.literal("user_edit")),
      confirmedAt: v.number(),
    })),
    flowStatus: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    receiptAttachmentIds: v.optional(v.array(v.id("attachments"))),
    adminValidationStatus: v.optional(v.string()),
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
    
    // Optional applicationNumber for testing or explicit assignment
    applicationNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const applicationNumber = args.applicationNumber || `REQ-${randomDigits}`;

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
      addressSnapshot: args.addressSnapshot,
      flowStatus: args.flowStatus,
      paymentStatus: args.paymentStatus,
      receiptAttachmentIds: args.receiptAttachmentIds,
      adminValidationStatus: args.adminValidationStatus,
      logisticsCosts: args.logisticsCosts,
      serviceValue: args.serviceValue,
      prioritizedValue: args.prioritizedValue,
      estimatedApplicationHour: args.estimatedApplicationHour,
      estimatedPrioritizedHour: args.estimatedPrioritizedHour,
      applicationScore: args.applicationScore,
    });

    const attachmentIds = await Promise.all([
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
          fieldId: item.fieldId,
          kind: item.kind,
          fileName: item.fileName,
          url: item.url,
          storageId: item.storageId as Id<"_storage"> | undefined,
        })
      ),
    ]);

    if ((!args.receiptAttachmentIds || args.receiptAttachmentIds.length === 0) && args.paymentMethod === "transfer") {
      const inferredReceiptIds = attachmentIds.filter(Boolean) as Id<"attachments">[];
      const receiptIds = inferredReceiptIds.slice(Math.max(0, inferredReceiptIds.length - 1));
      if (receiptIds.length > 0) {
        await ctx.db.patch(requestId, { receiptAttachmentIds: receiptIds });
      }
    }

    // Notify admins about new request (non-blocking)
    ctx.scheduler.runAfter(0, anyApi.emails.notifyNewRequest, {
      requestId,
    });

    return { requestId, applicationNumber };
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
    addressSnapshot: v.optional(v.object({
      raw: v.string(),
      source: v.union(v.literal("profile"), v.literal("user_edit")),
      confirmedAt: v.number(),
    })),
    flowStatus: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    receiptAttachmentIds: v.optional(v.array(v.id("attachments"))),
    adminValidationStatus: v.optional(v.string()),
    adminValidationAt: v.optional(v.number()),
    adminValidationBy: v.optional(v.id("users")),
    adminValidationReason: v.optional(v.string()),
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

    // Get current request to detect changes
    const currentRequest = await ctx.db.get(id);
    if (!currentRequest) {
      throw new Error("Request not found");
    }

    // Track changes for notifications
    const oldStatus = currentRequest.requestStatus;
    const newStatus = fields.requestStatus;
    const hasStatusChanged = newStatus !== undefined && newStatus !== oldStatus;

    const oldScore = currentRequest.applicationScore;
    const newScore = fields.applicationScore;
    const hasScoreChanged = newScore !== undefined && newScore !== oldScore;

    const oldObservations = currentRequest.observations;
    const newObservations = fields.observations;
    const hasObservationsChanged = newObservations !== undefined && newObservations !== oldObservations;

    const patchData: Partial<Doc<"requests">> = { ...fields };
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

    // Notify about status change (non-blocking)
    if (hasStatusChanged) {
      ctx.scheduler.runAfter(0, anyApi.emails.notifyRequestStatusChange, {
        requestId: id,
        oldStatus,
        newStatus,
      });
    }

    // Notify about score or observations change (non-blocking)
    if (hasScoreChanged || hasObservationsChanged) {
      ctx.scheduler.runAfter(0, anyApi.emails.notifyRequestScoreOrObservations, {
        requestId: id,
        hasScoreChange: hasScoreChanged,
        hasObservationsChange: hasObservationsChanged,
      });
    }
  },
});

export const distributorUpdateRequest = mutation({
  args: {
    id: v.id("requests"),
    requestStatus: v.union(
      v.literal("Atendida"),
      v.literal("Incompleta"),
      v.literal("EnProceso")
    ),
    observations: v.optional(v.string()),
    evidenceStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("No autorizado");

    const distributor = await ctx.db
      .query("distributors")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!distributor) throw new Error("Solo los repartidores pueden actualizar entregas");

    const request = await ctx.db.get(args.id);
    if (!request || request.distributorId !== distributor._id) {
      throw new Error("Esta solicitud no está asignada a usted");
    }

    const observations = args.observations?.trim() ?? "";

    if (args.requestStatus === "Atendida" && !args.evidenceStorageId) {
      throw new Error("Debe adjuntar evidencia para marcar como completada");
    }

    if (
      (args.requestStatus === "Incompleta" || args.requestStatus === "EnProceso") &&
      !observations
    ) {
      throw new Error("Debe escribir observaciones cuando la solicitud queda pendiente o incompleta");
    }

    await ctx.db.patch(args.id, {
      requestStatus: args.requestStatus,
      observations: observations || request.observations,
      evidenceStorageId: args.evidenceStorageId ?? request.evidenceStorageId,
      status: args.requestStatus === "Atendida",
    });

    return { ok: true };
  },
});

export const assignDistributor = mutation({
  args: {
    id: v.id("requests"),
    distributorId: v.id("distributors"),
  },
  handler: async (ctx, args) => {
    // Get current request to check previous distributor
    const currentRequest = await ctx.db.get(args.id);
    const previousDistributorId = currentRequest?.distributorId || undefined;

    await ctx.db.patch(args.id, {
      distributorId: args.distributorId,
      requestStatus: "EnProceso",
    });

    // Notify admin + distributor about assignment (non-blocking)
    if (previousDistributorId !== args.distributorId) {
      ctx.scheduler.runAfter(0, anyApi.emails.notifyDistributorAssignment, {
        requestId: args.id,
        distributorId: args.distributorId,
      });
    }
  },
});

export const setAdminValidation = mutation({
  args: {
    id: v.id("requests"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Request not found");
    const service = await ctx.db.get(request.serviceId);
    if (!service || !isDeterministicWorkflowEnabled(service)) {
      throw new Error("La validación administrativa está deshabilitada para este servicio.");
    }

    await ctx.db.patch(args.id, {
      adminValidationStatus: args.status,
      adminValidationAt: Date.now(),
      adminValidationBy: userId ?? undefined,
      adminValidationReason: args.reason,
      paymentStatus:
        args.status === "approved"
          ? "approved"
          : args.status === "rejected"
            ? "rejected"
            : "pending_admin_validation",
      flowStatus: args.status === "approved" ? "complete" : "admin_review",
    });

    return { ok: true };
  },
});

export const getPendingAdminValidations = query({
  args: {},
  handler: async (ctx) => {
    if (!isGlobalDeterministicRequestsEnabled()) return [];

    const requests = await ctx.db
      .query("requests")
      .filter((q) => q.eq(q.field("adminValidationStatus"), "pending"))
      .collect();

    const hydrated = await Promise.all(
      requests.map(async (request) => ({
        ...request,
        ...getNormalizedRequestReadState(request),
        applicant: await ctx.db.get(request.applicantId),
        service: await ctx.db.get(request.serviceId),
      }))
    );

    return hydrated.filter((request) => request.service && isDeterministicWorkflowEnabled(request.service));
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
