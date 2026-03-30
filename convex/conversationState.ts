import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type MediaType = "image" | "video" | "audio" | "document";

function sortByUpdatedAt<T extends { updatedAt?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function resolveThreadIdForConversation(args: {
  currentThreadId?: string;
  requestedThreadId?: string;
}): string | undefined {
  const requested = args.requestedThreadId?.trim();
  if (requested) return requested;
  const current = args.currentThreadId?.trim();
  return current || undefined;
}

function getOpenConversation<T extends { status?: string }>(rows: T[]): T | null {
  return rows.find((row) => row.status !== "closed") ?? null;
}

function buildPreview(args: { content: string; mediaType?: MediaType }): string {
  if (args.mediaType === "image") return "Imagen";
  if (args.mediaType === "video") return "Video";
  if (args.mediaType === "audio") return "Audio";
  if (args.mediaType === "document") return "Documento";
  const text = (args.content ?? "").trim();
  if (!text) return "";
  return text.length > 50 ? `${text.slice(0, 50)}…` : text;
}

export const getConversationByContact = internalQuery({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const rows = sortByUpdatedAt(
      await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect()
    );
    if (rows.length === 0) return null;
    return getOpenConversation(rows) ?? rows[0] ?? null;
  },
});

export const ensureConversationForContact = internalMutation({
  args: {
    contactId: v.string(),
    customerName: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = sortByUpdatedAt(
      await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect()
    );

    const openRows = rows.filter((row) => row.status !== "closed");
    const primary = openRows[0] ?? null;
    for (const d of openRows.slice(1)) {
      await ctx.db.delete(d._id);
    }

    if (primary) {
      const nextThreadId = resolveThreadIdForConversation({
        currentThreadId: primary.threadId,
        requestedThreadId: args.threadId,
      });
      await ctx.db.patch(primary._id, {
        threadId: nextThreadId,
        customerName: args.customerName?.trim() || primary.customerName,
        status: primary.status === "pending" ? "pending" : "open",
        updatedAt: now,
      });
      return { conversationId: primary._id, threadId: nextThreadId };
    }

    const conversationId = await ctx.db.insert("conversations", {
      contactId: args.contactId,
      channel: "whatsapp",
      customerName: args.customerName?.trim() || undefined,
      status: "open",
      threadId: args.threadId,
      lastMessageAt: now,
      lastMessagePreview: undefined,
      lastMessageDirection: undefined,
      createdAt: now,
      updatedAt: now,
    });
    return { conversationId, threadId: args.threadId };
  },
});

export const setThreadIdForContact = internalMutation({
  args: {
    contactId: v.string(),
    threadId: v.string(),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = sortByUpdatedAt(
      await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect()
    );

    const openRows = rows.filter((row) => row.status !== "closed");
    const primary = openRows[0] ?? null;
    for (const d of openRows.slice(1)) {
      await ctx.db.delete(d._id);
    }

    if (primary) {
      await ctx.db.patch(primary._id, {
        threadId: args.threadId,
        customerName: args.customerName?.trim() || primary.customerName,
        status: primary.status === "pending" ? "pending" : "open",
        updatedAt: now,
      });
      return { conversationId: primary._id };
    }

    const conversationId = await ctx.db.insert("conversations", {
      contactId: args.contactId,
      channel: "whatsapp",
      customerName: args.customerName?.trim() || undefined,
      status: "open",
      threadId: args.threadId,
      lastMessageAt: now,
      lastMessagePreview: undefined,
      lastMessageDirection: undefined,
      createdAt: now,
      updatedAt: now,
    });
    return { conversationId };
  },
});

export const resetConversationForContact = internalMutation({
  args: {
    contactId: v.string(),
    newThreadId: v.string(),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rows = sortByUpdatedAt(
      await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect()
    );

    const openRows = rows.filter((row) => row.status !== "closed");
    const primary = openRows[0] ?? null;
    for (const d of openRows.slice(1)) {
      await ctx.db.delete(d._id);
    }

    if (primary) {
      await ctx.db.patch(primary._id, {
        status: "closed",
        customerName: args.customerName?.trim() || primary.customerName,
        updatedAt: now,
      });
    }

    const conversationId = await ctx.db.insert("conversations", {
      contactId: args.contactId,
      channel: "whatsapp",
      customerName: args.customerName?.trim() || undefined,
      status: "open",
      threadId: args.newThreadId,
      lastMessageAt: now,
      lastMessagePreview: undefined,
      lastMessageDirection: undefined,
      createdAt: now,
      updatedAt: now,
    });
    return { conversationId };
  },
});

export const updateLastMessage = internalMutation({
  args: {
    contactId: v.string(),
    customerName: v.optional(v.string()),
    direction: v.union(v.literal("INBOUND"), v.literal("OUTBOUND")),
    content: v.string(),
    mediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"))
    ),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = sortByUpdatedAt(
      await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect()
    );

    const openRows = rows.filter((row) => row.status !== "closed");
    const primary = openRows[0] ?? null;
    for (const d of openRows.slice(1)) {
      await ctx.db.delete(d._id);
    }

    const preview =
      args.direction === "INBOUND"
        ? buildPreview({ content: args.content, mediaType: args.mediaType as MediaType | undefined })
        : buildPreview({ content: args.content });

    if (primary) {
      await ctx.db.patch(primary._id, {
        customerName: args.customerName?.trim() || primary.customerName,
        lastMessageAt: args.createdAt,
        lastMessagePreview: preview,
        lastMessageDirection: args.direction,
        updatedAt: args.createdAt,
      });
      return { conversationId: primary._id };
    }

    const conversationId = await ctx.db.insert("conversations", {
      contactId: args.contactId,
      channel: "whatsapp",
      customerName: args.customerName?.trim() || undefined,
      status: "open",
      threadId: undefined,
      lastMessageAt: args.createdAt,
      lastMessagePreview: preview,
      lastMessageDirection: args.direction,
      createdAt: args.createdAt,
      updatedAt: args.createdAt,
    });
    return { conversationId };
  },
});

export const listContacts = query({
  args: { limit: v.optional(v.number()), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 25, 100));
    const search = args.search?.trim().toLowerCase() ?? "";
    const recent = await ctx.db
      .query("conversations")
      .withIndex("by_last_message_at", (q) => q)
      .order("desc")
      .take(500);

    const deduped = new Map<string, (typeof recent)[number]>();
    for (const conversation of recent) {
      const existing = deduped.get(conversation.contactId);
      if (!existing || (existing.status === "closed" && conversation.status !== "closed")) {
        deduped.set(conversation.contactId, conversation);
      }
    }

    let list = Array.from(deduped.values()).map((c) => ({
      contactId: c.contactId,
      customerName: c.customerName,
      lastMessageAt: c.lastMessageAt,
      lastMessage: c.lastMessagePreview ?? "",
      lastDirection: (c.lastMessageDirection ?? "INBOUND") as "INBOUND" | "OUTBOUND",
      status: c.status,
      threadId: c.threadId,
    }));

    if (search) {
      list = list.filter((c) => {
        const name = (c.customerName ?? "").toLowerCase();
        const id = c.contactId.toLowerCase();
        return name.includes(search) || id.includes(search);
      });
    }

    return list.slice(0, limit);
  },
});
