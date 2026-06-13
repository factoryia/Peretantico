import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Inbound Queue ────────────────────────────────────────────────

// Debounce windows: batch rapid messages before calling the bot (UI persists immediately).
const TEXT_DEBOUNCE_MS = 2000;
const MEDIA_DEBOUNCE_MS = 8000;

async function persistInboundForUi(
  ctx: MutationCtx,
  args: {
    contactId: string;
    customerName?: string;
    text: string;
    mediaUrl?: string;
    mediaId?: string;
    mediaType?: "image" | "video" | "audio" | "document";
  }
) {
  const inbound = (await ctx.runMutation(internal.ycloudState.addInboundMessage, {
    contactId: args.contactId,
    customerName: args.customerName,
    content: args.text,
    mediaUrl: args.mediaUrl,
    mediaId: args.mediaId,
    mediaType: args.mediaType,
  })) as { createdAt?: number };

  await ctx.runMutation(internal.conversationState.updateLastMessage, {
    contactId: args.contactId,
    customerName: args.customerName,
    direction: "INBOUND",
    content: args.text,
    mediaType: args.mediaType,
    createdAt: inbound.createdAt ?? Date.now(),
  });
}

export const enqueueInbound = internalMutation({
  args: {
    eventId: v.string(),
    contactId: v.string(),
    customerName: v.optional(v.string()),
    text: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaId: v.optional(v.string()),
    mediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"))
    ),
    mediaFilename: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("high"), v.literal("normal"), v.literal("low"))),
  },
  handler: async (ctx, args) => {
    // Idempotency: don't enqueue if eventId already exists in queue
    const existing = await ctx.db
      .query("inboundQueue")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) return { id: existing._id, duplicate: true };

    const hasMedia = Boolean(args.mediaType);
    const debounceMs = hasMedia ? MEDIA_DEBOUNCE_MS : TEXT_DEBOUNCE_MS;
    const now = Date.now();

    // Show message in inbox immediately (bot processing still debounced below).
    await persistInboundForUi(ctx, {
      contactId: args.contactId,
      customerName: args.customerName,
      text: args.text,
      mediaUrl: args.mediaUrl,
      mediaId: args.mediaId,
      mediaType: args.mediaType,
    });

    // Check if there's already a pending item for this contact (within debounce window)
    const existingPending = await ctx.db
      .query("inboundQueue")
      .withIndex("by_contactId_status", (q) => q.eq("contactId", args.contactId).eq("status", "pending"))
      .first();

    if (existingPending) {
      // Batch into existing pending item
      const newText = existingPending.batchedText
        ? `${existingPending.batchedText}\n${args.text}`
        : (existingPending.text + (args.text ? `\n${args.text}` : ""));

      // Accumulate media info
      const newMediaIds = [...(existingPending.batchedMediaIds ?? [])];
      if (args.mediaId) newMediaIds.push(args.mediaId);

      const newMediaUrls = [...(existingPending.batchedMediaUrls ?? [])];
      if (args.mediaUrl) newMediaUrls.push(args.mediaUrl);

      const newMediaTypes = [...(existingPending.batchedMediaTypes ?? [])];
      if (args.mediaType) newMediaTypes.push(args.mediaType);

      // Extend debounce window
      const newDebounceUntil = now + debounceMs;

      await ctx.db.patch(existingPending._id, {
        batchedText: newText,
        batchedMediaIds: newMediaIds,
        batchedMediaUrls: newMediaUrls,
        batchedMediaTypes: newMediaTypes,
        hasMedia: true,
        debounceUntil: newDebounceUntil,
        // Keep the latest media info as primary (for single-file case)
        mediaUrl: args.mediaUrl || existingPending.mediaUrl,
        mediaId: args.mediaId || existingPending.mediaId,
        mediaType: args.mediaType || existingPending.mediaType,
        mediaFilename: args.mediaFilename || existingPending.mediaFilename,
        customerName: args.customerName || existingPending.customerName,
      });

      return { id: existingPending._id, duplicate: false, batched: true };
    }

    // Create new pending item with debounce window
    const id = await ctx.db.insert("inboundQueue", {
      eventId: args.eventId,
      contactId: args.contactId,
      customerName: args.customerName,
      text: args.text,
      mediaUrl: args.mediaUrl,
      mediaId: args.mediaId,
      mediaType: args.mediaType,
      mediaFilename: args.mediaFilename,
      debounceUntil: now + debounceMs,
      batchedText: undefined,
      batchedMediaIds: args.mediaId ? [args.mediaId] : [],
      batchedMediaUrls: args.mediaUrl ? [args.mediaUrl] : [],
      batchedMediaTypes: args.mediaType ? [args.mediaType] : [],
      hasMedia,
      status: "pending",
      attempts: 0,
      maxAttempts: 5,
      priority: args.priority ?? "normal",
      enqueuedAt: now,
    });

    return { id, duplicate: false, batched: false };
  },
});

export const getNextPendingInbound = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get pending items that have passed their debounce window
    const pending = await ctx.db
      .query("inboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("nextRetryAt"), undefined),
            q.lte(q.field("nextRetryAt"), now)
          ),
          // Only process if debounce window has expired
          q.or(
            q.eq(q.field("debounceUntil"), undefined),
            q.lte(q.field("debounceUntil"), now)
          )
        )
      )
      .order("asc")
      .take(1);

    if (pending.length === 0) return null;
    return pending[0];
  },
});

export const getPendingInboundDebounceDelay = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find the earliest debounceUntil among pending items
    const pending = await ctx.db
      .query("inboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    let minDelay: number | null = null;
    for (const item of pending) {
      if (item.debounceUntil && item.debounceUntil > now) {
        const delay = item.debounceUntil - now;
        if (minDelay === null || delay < minDelay) {
          minDelay = delay;
        }
      }
    }

    return minDelay;
  },
});

export const markInboundProcessing = internalMutation({
  args: { id: v.id("inboundQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "processing",
      startedAt: Date.now(),
      attempts: (await ctx.db.get(args.id))!.attempts + 1,
    });
  },
});

export const markInboundDone = internalMutation({
  args: { id: v.id("inboundQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "done",
      finishedAt: Date.now(),
    });
  },
});

export const markInboundError = internalMutation({
  args: { id: v.id("inboundQueue"), error: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return { requeued: false, dead: true };

    const nextAttempt = item.attempts + 1;
    const maxAttempts = item.maxAttempts;

    if (nextAttempt >= maxAttempts) {
      // Move to dead letter
      await ctx.db.patch(args.id, {
        status: "dead",
        error: args.error,
        finishedAt: Date.now(),
      });
      return { requeued: false, dead: true };
    }

    // Requeue with exponential backoff
    const backoffMs = Math.min(1000 * Math.pow(2, item.attempts), 60_000); // max 60s
    const nextRetryAt = Date.now() + backoffMs;

    await ctx.db.patch(args.id, {
      status: "pending",
      error: args.error,
      nextRetryAt,
      finishedAt: undefined,
    });
    return { requeued: true, nextRetryAt, attempts: nextAttempt };
  },
});

// ─── Outbound Queue ───────────────────────────────────────────────

export const enqueueOutbound = internalMutation({
  args: {
    contactId: v.string(),
    customerName: v.optional(v.string()),
    content: v.string(),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"))
    ),
    inboundQueueId: v.optional(v.id("inboundQueue")),
    priority: v.optional(v.union(v.literal("high"), v.literal("normal"), v.literal("low"))),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("outboundQueue", {
      contactId: args.contactId,
      customerName: args.customerName,
      content: args.content,
      mediaStorageId: args.mediaStorageId,
      mediaType: args.mediaType,
      status: "pending",
      attempts: 0,
      maxAttempts: 5,
      enqueuedAt: Date.now(),
      inboundQueueId: args.inboundQueueId,
    });

    return { id };
  },
});

export const getNextPendingOutbound = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const pending = await ctx.db
      .query("outboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) =>
        q.or(
          q.eq(q.field("nextRetryAt"), undefined),
          q.lte(q.field("nextRetryAt"), now)
        )
      )
      .order("asc")
      .take(1);

    if (pending.length === 0) return null;
    return pending[0];
  },
});

export const markOutboundProcessing = internalMutation({
  args: { id: v.id("outboundQueue") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "processing",
      startedAt: Date.now(),
      attempts: (await ctx.db.get(args.id))!.attempts + 1,
    });
  },
});

export const markOutboundDone = internalMutation({
  args: { id: v.id("outboundQueue"), providerMessageId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "done",
      finishedAt: Date.now(),
      providerMessageId: args.providerMessageId,
    });
  },
});

export const markOutboundError = internalMutation({
  args: { id: v.id("outboundQueue"), error: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return { requeued: false, dead: true };

    const nextAttempt = item.attempts + 1;
    const maxAttempts = item.maxAttempts;

    if (nextAttempt >= maxAttempts) {
      await ctx.db.patch(args.id, {
        status: "dead",
        error: args.error,
        finishedAt: Date.now(),
      });
      return { requeued: false, dead: true };
    }

    const backoffMs = Math.min(1000 * Math.pow(2, item.attempts), 60_000);
    const nextRetryAt = Date.now() + backoffMs;

    await ctx.db.patch(args.id, {
      status: "pending",
      error: args.error,
      nextRetryAt,
      finishedAt: undefined,
    });
    return { requeued: true, nextRetryAt, attempts: nextAttempt };
  },
});

// ─── Dead Letter Queue ────────────────────────────────────────────

export const moveToDeadLetter = internalMutation({
  args: {
    sourceTable: v.union(v.literal("inboundQueue"), v.literal("outboundQueue")),
    sourceId: v.optional(v.string()),
    eventId: v.optional(v.string()),
    contactId: v.optional(v.string()),
    payload: v.any(),
    error: v.string(),
    attempts: v.number(),
    firstEnqueuedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("deadLetterQueue", {
      sourceTable: args.sourceTable,
      sourceId: args.sourceId,
      eventId: args.eventId,
      contactId: args.contactId,
      payload: args.payload,
      error: args.error,
      attempts: args.attempts,
      firstEnqueuedAt: args.firstEnqueuedAt,
      deadAt: Date.now(),
    });
    return { id };
  },
});

export const listDeadLetters = internalQuery({
  args: {
    limit: v.optional(v.number()),
    sourceTable: v.optional(v.union(v.literal("inboundQueue"), v.literal("outboundQueue"))),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 200);

    if (args.sourceTable) {
      return await ctx.db
        .query("deadLetterQueue")
        .withIndex("by_sourceTable", (q) => q.eq("sourceTable", args.sourceTable!))
        .order("desc")
        .take(limit);
    } else {
      return await ctx.db.query("deadLetterQueue").order("desc").take(limit);
    }
  },
});

// ─── Queue Metrics ────────────────────────────────────────────────

export const getCurrentPeriod = internalQuery({
  args: {},
  handler: async () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}`;
  },
});

export const initMetricPeriod = internalMutation({
  args: { period: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("queueMetrics")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("queueMetrics", {
      period: args.period,
      inboundEnqueued: 0,
      inboundProcessed: 0,
      inboundErrored: 0,
      inboundDead: 0,
      outboundEnqueued: 0,
      outboundProcessed: 0,
      outboundErrored: 0,
      outboundDead: 0,
    });
  },
});

export const incrementMetric = internalMutation({
  args: {
    period: v.string(),
    field: v.union(
      v.literal("inboundEnqueued"),
      v.literal("inboundProcessed"),
      v.literal("inboundErrored"),
      v.literal("inboundDead"),
      v.literal("outboundEnqueued"),
      v.literal("outboundProcessed"),
      v.literal("outboundErrored"),
      v.literal("outboundDead")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("queueMetrics")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .first();
    if (!existing) return;

    await ctx.db.patch(existing._id, {
      [args.field]: (existing[args.field] as number) + 1,
    });
  },
});

// ─── Cleanup ──────────────────────────────────────────────────────

export const cleanupDoneInbound = internalMutation({
  args: { olderThanMs: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const threshold = Date.now() - (args.olderThanMs ?? 24 * 60 * 60 * 1000); // 24h default
    const limit = Math.min(args.limit ?? 100, 500);

    const items = await ctx.db
      .query("inboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .filter((q) => q.lt(q.field("finishedAt"), threshold))
      .take(limit);

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return { deleted: items.length };
  },
});

export const cleanupDoneOutbound = internalMutation({
  args: { olderThanMs: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const threshold = Date.now() - (args.olderThanMs ?? 24 * 60 * 60 * 1000);
    const limit = Math.min(args.limit ?? 100, 500);

    const items = await ctx.db
      .query("outboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .filter((q) => q.lt(q.field("finishedAt"), threshold))
      .take(limit);

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return { deleted: items.length };
  },
});

export const cleanupProcessedEvents = internalMutation({
  args: { olderThanMs: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Since ycloudProcessedEvents has no createdAt, we clean by a heuristic:
    // delete the oldest N items (by _id order, which is roughly chronological in Convex)
    const limit = Math.min(args.limit ?? 500, 2000);
    const items = await ctx.db.query("ycloudProcessedEvents").take(limit);
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return { deleted: items.length };
  },
});

export const cleanupExpiredLocks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const locks = await ctx.db.query("ycloudProcessingLocks").collect();
    let deleted = 0;
    for (const lock of locks) {
      if (lock.lockedUntil <= now) {
        await ctx.db.delete(lock._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const cleanupDeadLetters = internalMutation({
  args: { olderThanMs: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const threshold = Date.now() - (args.olderThanMs ?? 7 * 24 * 60 * 60 * 1000); // 7 days
    const limit = Math.min(args.limit ?? 50, 200);

    const items = await ctx.db
      .query("deadLetterQueue")
      .filter((q) => q.lt(q.field("deadAt"), threshold))
      .take(limit);

    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    return { deleted: items.length };
  },
});

// ─── Queue Depth Queries (for monitoring) ─────────────────────────

export const getQueueDepths = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const inboundPending = await ctx.db
      .query("inboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const inboundProcessing = await ctx.db
      .query("inboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();

    const inboundDead = await ctx.db
      .query("inboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "dead"))
      .collect();

    const outboundPending = await ctx.db
      .query("outboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const outboundDead = await ctx.db
      .query("outboundQueue")
      .withIndex("by_status", (q) => q.eq("status", "dead"))
      .collect();

    const deadLetterCount = await ctx.db.query("deadLetterQueue").collect();

    // Count items ready for retry
    const inboundRetryReady = inboundPending.filter(
      (i) => !i.nextRetryAt || i.nextRetryAt <= now
    ).length;

    return {
      inbound: {
        pending: inboundPending.length,
        pendingRetryReady: inboundRetryReady,
        processing: inboundProcessing.length,
        dead: inboundDead.length,
      },
      outbound: {
        pending: outboundPending.length,
        dead: outboundDead.length,
      },
      deadLetterQueue: deadLetterCount.length,
    };
  },
});
