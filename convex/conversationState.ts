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

// Escala la conversación a un asesor humano: marca needsHuman en la conversación
// y silencia el bot (handoff) para que un humano continúe la atención.
export const escalateToHumanByContact = internalMutation({
  args: {
    contactId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const contactId = args.contactId.trim();
    if (!contactId) return { ok: false };
    const reason = args.reason?.trim() || "El bot no pudo continuar el flujo.";

    // 1) Marcar la(s) conversación(es) abierta(s) como "requiere atención humana"
    const rows = sortByUpdatedAt(
      await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", contactId))
        .collect()
    );
    const openRows = rows.filter((row) => row.status !== "closed");
    if (openRows.length > 0) {
      for (const row of openRows) {
        await ctx.db.patch(row._id, {
          needsHuman: true,
          escalationReason: reason,
          escalatedAt: now,
          status: "pending",
          updatedAt: now,
        });
      }
    } else {
      await ctx.db.insert("conversations", {
        contactId,
        channel: "whatsapp",
        status: "pending",
        needsHuman: true,
        escalationReason: reason,
        escalatedAt: now,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2) Silenciar el bot (handoff) por 2 horas para que un asesor tome la conversación
    const mutedUntil = now + 1000 * 60 * 60 * 2;
    const existingHandoff = await ctx.db
      .query("ycloudHandoffs")
      .withIndex("by_contact", (q) => q.eq("contactId", contactId))
      .first();
    if (existingHandoff) {
      await ctx.db.patch(existingHandoff._id, { muted: true, mutedUntil, updatedAt: now });
    } else {
      await ctx.db.insert("ycloudHandoffs", { contactId, muted: true, mutedUntil, updatedAt: now });
    }

    return { ok: true };
  },
});

// Limpia la bandera de "requiere atención humana" (cuando un asesor ya atendió).
export const clearHumanFlagByContact = internalMutation({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const contactId = args.contactId.trim();
    if (!contactId) return { ok: false };
    const rows = await ctx.db
      .query("conversations")
      .withIndex("by_contact", (q) => q.eq("contactId", contactId))
      .collect();
    for (const row of rows) {
      if (row.needsHuman) {
        await ctx.db.patch(row._id, { needsHuman: false, escalationReason: undefined, updatedAt: Date.now() });
      }
    }
    return { ok: true };
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

    const preview = buildPreview({
      content: args.content,
      mediaType: args.mediaType as MediaType | undefined,
    });

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

    const handoffRows = await ctx.db.query("ycloudHandoffs").collect();
    const handoffByContact = new Map(handoffRows.map((h) => [h.contactId, h]));
    const now = Date.now();

    let list = Array.from(deduped.values()).map((c) => {
      const handoff = handoffByContact.get(c.contactId);
      const botMuted = handoff
        ? handoff.mutedUntil
          ? now < handoff.mutedUntil
          : handoff.muted
        : false;
      return {
        contactId: c.contactId,
        customerName: c.customerName,
        lastMessageAt: c.lastMessageAt,
        lastMessage: c.lastMessagePreview ?? "",
        lastDirection: (c.lastMessageDirection ?? "INBOUND") as "INBOUND" | "OUTBOUND",
        status: c.status,
        threadId: c.threadId,
        botMuted,
        needsHuman: c.needsHuman === true,
        escalationReason: c.escalationReason,
      };
    });

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
