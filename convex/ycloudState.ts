import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const recordProcessedEvent = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ycloudProcessedEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) return { duplicate: true };
    await ctx.db.insert("ycloudProcessedEvents", { eventId: args.eventId });
    return { duplicate: false };
  },
});

export const markConnected = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existing = await ctx.db.query("ycloudStatus").first();
    if (existing?.connected) return existing._id;
    if (existing) {
      await ctx.db.patch(existing._id, { connected: true, connectedAt: now, updatedAt: now });
      return existing._id;
    }
    return await ctx.db.insert("ycloudStatus", {
      connected: true,
      connectedAt: now,
      updatedAt: now,
    });
  },
});

export const addInboundMessage = internalMutation({
  args: {
    contactId: v.string(),
    customerName: v.optional(v.string()),
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"))
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ycloudMessages", {
      contactId: args.contactId,
      direction: "INBOUND",
      customerName: args.customerName,
      content: args.content,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      createdAt: Date.now(),
    });
  },
});

export const addOutboundMessage = internalMutation({
  args: {
    contactId: v.string(),
    content: v.string(),
    providerMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("ycloudMessages", {
      contactId: args.contactId,
      direction: "OUTBOUND",
      content: args.content,
      providerMessageId: args.providerMessageId,
      createdAt: Date.now(),
    });
  },
});

export const listRecentMessages = internalQuery({
  args: { contactId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
    const rows = await ctx.db
      .query("ycloudMessages")
      .withIndex("by_contact_created", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .take(limit);
    return rows.reverse();
  },
});

