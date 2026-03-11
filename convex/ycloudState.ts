import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

export const acquireProcessingLock = internalMutation({
  args: { contactId: v.string(), ownerEventId: v.string(), ttlMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ttlMs = Math.max(250, Math.min(args.ttlMs ?? 15_000, 60_000));
    const existing = await ctx.db
      .query("ycloudProcessingLocks")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    if (existing && existing.lockedUntil > now && existing.ownerEventId !== args.ownerEventId) {
      return { ok: false, lockedUntil: existing.lockedUntil };
    }

    const lockedUntil = now + ttlMs;
    if (existing) {
      await ctx.db.patch(existing._id, {
        lockedUntil,
        ownerEventId: args.ownerEventId,
        updatedAt: now,
      });
      return { ok: true, lockId: existing._id, lockedUntil };
    }

    const id = await ctx.db.insert("ycloudProcessingLocks", {
      contactId: args.contactId,
      lockedUntil,
      ownerEventId: args.ownerEventId,
      updatedAt: now,
    });
    return { ok: true, lockId: id, lockedUntil };
  },
});

export const releaseProcessingLock = internalMutation({
  args: { contactId: v.string(), ownerEventId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ycloudProcessingLocks")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
    if (!existing) return { ok: true };
    if (existing.ownerEventId !== args.ownerEventId) return { ok: false };
    await ctx.db.patch(existing._id, {
      lockedUntil: 0,
      updatedAt: Date.now(),
    });
    return { ok: true };
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
    const createdAt = Date.now();
    const messageId = await ctx.db.insert("ycloudMessages", {
      contactId: args.contactId,
      direction: "INBOUND",
      customerName: args.customerName,
      content: args.content,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      createdAt,
    });
    return { messageId, createdAt };
  },
});

export const getLastMessageByContact = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ycloudMessages")
      .withIndex("by_contact_created", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .first();
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

export const listContacts = query({
  args: { limit: v.optional(v.number()), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
    const search = args.search?.trim().toLowerCase() ?? "";

    const recent = await ctx.db.query("ycloudMessages").order("desc").take(500);
    const byContact = new Map<
      string,
      {
        contactId: string;
        customerName?: string;
        lastMessageAt: number;
        lastMessage: string;
        lastDirection: "INBOUND" | "OUTBOUND";
      }
    >();

    for (const m of recent) {
      if (byContact.has(m.contactId)) continue;
      byContact.set(m.contactId, {
        contactId: m.contactId,
        customerName: m.customerName,
        lastMessageAt: m.createdAt,
        lastMessage: m.content,
        lastDirection: m.direction,
      });
      if (byContact.size >= limit) break;
    }

    let list = Array.from(byContact.values());
    if (search) {
      list = list.filter((c) => {
        const name = (c.customerName ?? "").toLowerCase();
        const id = c.contactId.toLowerCase();
        return name.includes(search) || id.includes(search);
      });
    }

    list.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return list.slice(0, limit);
  },
});

export const listMessagesByContact = query({
  args: { contactId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const rows = await ctx.db
      .query("ycloudMessages")
      .withIndex("by_contact_created", (q) => q.eq("contactId", args.contactId))
      .order("desc")
      .take(limit);
    return rows.reverse();
  },
});

export const getHandoff = query({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const row = await ctx.db
      .query("ycloudHandoffs")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    if (!row) return { muted: false, mutedUntil: undefined, effectiveMuted: false };

    const now = Date.now();
    const effectiveMuted = row.mutedUntil ? now < row.mutedUntil : row.muted;
    return { muted: row.muted, mutedUntil: row.mutedUntil, effectiveMuted };
  },
});

export const getEffectiveMute = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("ycloudHandoffs")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();
    if (!row) return false;

    const now = Date.now();
    return row.mutedUntil ? now < row.mutedUntil : row.muted;
  },
});

export const setHandoffMutation = internalMutation({
  args: {
    contactId: v.string(),
    muted: v.boolean(),
    durationMs: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const durationMs = Math.max(0, Math.min(args.durationMs ?? 0, 1000 * 60 * 60 * 24 * 30));
    const mutedUntil = args.muted && durationMs > 0 ? now + durationMs : undefined;

    const existing = await ctx.db
      .query("ycloudHandoffs")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        muted: args.muted,
        mutedUntil,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
      return existing._id;
    }

    return await ctx.db.insert("ycloudHandoffs", {
      contactId: args.contactId,
      muted: args.muted,
      mutedUntil,
      updatedAt: now,
      updatedBy: args.updatedBy,
    });
  },
});

export const setHandoff = mutation({
  args: { contactId: v.string(), muted: v.boolean(), durationMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("No autorizado");

    const now = Date.now();
    const durationMs = Math.max(0, Math.min(args.durationMs ?? 0, 1000 * 60 * 60 * 24 * 30));
    const mutedUntil = args.muted && durationMs > 0 ? now + durationMs : undefined;

    const existing = await ctx.db
      .query("ycloudHandoffs")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        muted: args.muted,
        mutedUntil,
        updatedAt: now,
        updatedBy: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("ycloudHandoffs", {
      contactId: args.contactId,
      muted: args.muted,
      mutedUntil,
      updatedAt: now,
      updatedBy: userId,
    });
  },
});
