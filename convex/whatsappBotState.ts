import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getApplicantByContact = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("botApplicants")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
  },
});

export const ensureApplicant = internalMutation({
  args: {
    contactId: v.string(),
    phoneNumber: v.string(),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("botApplicants")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    const now = Date.now();
    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (!existing.fullName && args.customerName?.trim()) {
        updates.fullName = args.customerName.trim();
      }
      if (Object.keys(updates).length > 1) {
        await ctx.db.patch(existing._id, updates);
      } else {
        await ctx.db.patch(existing._id, { updatedAt: now });
      }
      return existing._id;
    }

    const id = await ctx.db.insert("botApplicants", {
      contactId: args.contactId,
      phoneNumber: args.phoneNumber,
      fullName: args.customerName?.trim() || undefined,
      state: "NEEDS_PROFILE",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const patchApplicant = internalMutation({
  args: {
    id: v.id("botApplicants"),
    fullName: v.optional(v.string()),
    documentType: v.optional(v.string()),
    documentNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    profileId: v.optional(v.id("profiles")),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
  },
});

export const getSessionByContact = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("botSessions")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
  },
});

export const ensureSession = internalMutation({
  args: {
    contactId: v.string(),
    profileId: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("botSessions")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    const now = Date.now();
    if (existing) {
      const updates: Record<string, unknown> = { updatedAt: now };
      if (args.profileId && existing.profileId !== args.profileId) {
        updates.profileId = args.profileId;
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    const id = await ctx.db.insert("botSessions", {
      contactId: args.contactId,
      profileId: args.profileId,
      data: {},
      attachments: [],
      state: "INIT",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const patchSession = internalMutation({
  args: {
    id: v.id("botSessions"),
    profileId: v.optional(v.id("profiles")),
    threadId: v.optional(v.string()),
    serviceId: v.optional(v.id("services")),
    fieldIds: v.optional(v.array(v.id("serviceFields"))),
    currentFieldIndex: v.optional(v.number()),
    data: v.optional(v.any()),
    attachments: v.optional(v.any()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
  },
});

export const createRequestShareLink = internalMutation({
  args: {
    token: v.string(),
    requestId: v.id("requests"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("requestShareLinks", {
      token: args.token,
      requestId: args.requestId,
      createdAt: now,
      expiresAt: args.expiresAt,
    });
    return id;
  },
});

export const getRequestIdByShareToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("requestShareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!link) return null;
    if (link.expiresAt && Date.now() > link.expiresAt) return null;
    return link.requestId;
  },
});
