import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

type MediaType = "image" | "video" | "audio" | "document";
export type ContactPipelineStage = "visitante" | "en_proceso" | "solicitud";

const RESERVED_INBOX_LABEL_NAMES = new Set([
  "todas",
  "sin solicitud",
  "en proceso",
  "con solicitud",
  "requiere atención",
  "bot activo",
  "atención humana",
  "visitante",
  "en_proceso",
  "solicitud",
  "needshuman",
  "bot",
  "agent",
  "all",
]);

function sortByUpdatedAt<T extends { updatedAt?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

async function resolveContactPipelineStage(
  ctx: QueryCtx,
  contactId: string
): Promise<ContactPipelineStage> {
  const applicant = await ctx.db
    .query("botApplicants")
    .withIndex("by_contact", (q) => q.eq("contactId", contactId))
    .first();

  const profileId = applicant?.profileId;
  if (profileId) {
    const request = await ctx.db
      .query("requests")
      .withIndex("by_applicant", (q) => q.eq("applicantId", profileId))
      .first();
    if (request) return "solicitud";
  }

  const session = await ctx.db
    .query("botSessions")
    .withIndex("by_contact", (q) => q.eq("contactId", contactId))
    .first();

  if (
    profileId ||
    applicant?.fullName?.trim() ||
    session?.serviceId ||
    (session?.state && session.state !== "INIT")
  ) {
    return "en_proceso";
  }

  return "visitante";
}

async function resolveContactDisplayName(
  ctx: QueryCtx,
  contactId: string,
  conversation: { displayName?: string; customerName?: string }
): Promise<string | undefined> {
  const saved = conversation.displayName?.trim();
  if (saved) return saved;
  const whatsapp = conversation.customerName?.trim();
  if (whatsapp) return whatsapp;

  const applicant = await ctx.db
    .query("botApplicants")
    .withIndex("by_contact", (q) => q.eq("contactId", contactId))
    .first();
  if (applicant?.fullName?.trim()) return applicant.fullName.trim();

  if (applicant?.profileId) {
    const profile = await ctx.db.get(applicant.profileId);
    if (profile?.fullName?.trim()) return profile.fullName.trim();
  }

  return undefined;
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

    // 2) Silenciar el bot hasta que un asesor lo reactive manualmente
    const existingHandoff = await ctx.db
      .query("ycloudHandoffs")
      .withIndex("by_contact", (q) => q.eq("contactId", contactId))
      .first();
    if (existingHandoff) {
      await ctx.db.patch(existingHandoff._id, { muted: true, mutedUntil: undefined, updatedAt: now });
    } else {
      await ctx.db.insert("ycloudHandoffs", { contactId, muted: true, updatedAt: now });
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
  args: {
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    pipelineStage: v.optional(
      v.union(v.literal("visitante"), v.literal("en_proceso"), v.literal("solicitud"))
    ),
    label: v.optional(v.string()),
  },
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
    const mergedLabelsByContact = new Map<string, string[]>();

    for (const conversation of recent) {
      const prevLabels = mergedLabelsByContact.get(conversation.contactId) ?? [];
      const merged = [...new Set([...prevLabels, ...(conversation.labels ?? [])])];
      mergedLabelsByContact.set(conversation.contactId, merged);

      const existing = deduped.get(conversation.contactId);
      if (!existing) {
        deduped.set(conversation.contactId, conversation);
        continue;
      }
      if (existing.status === "closed" && conversation.status !== "closed") {
        deduped.set(conversation.contactId, conversation);
        continue;
      }
      if (conversation.lastMessageAt > existing.lastMessageAt) {
        deduped.set(conversation.contactId, conversation);
      }
    }

    const handoffRows = await ctx.db.query("ycloudHandoffs").collect();
    const handoffByContact = new Map(handoffRows.map((h) => [h.contactId, h]));
    const now = Date.now();

    let list = await Promise.all(
      Array.from(deduped.values()).map(async (c) => {
        const handoff = handoffByContact.get(c.contactId);
        const botMuted = handoff
          ? handoff.mutedUntil
            ? now < handoff.mutedUntil
            : handoff.muted
          : false;
        const [resolvedName, pipelineStage] = await Promise.all([
          resolveContactDisplayName(ctx, c.contactId, c),
          resolveContactPipelineStage(ctx, c.contactId),
        ]);
        return {
          contactId: c.contactId,
          customerName: c.customerName,
          displayName: c.displayName,
          resolvedName,
          labels: mergedLabelsByContact.get(c.contactId) ?? c.labels ?? [],
          pipelineStage,
          lastMessageAt: c.lastMessageAt,
          lastMessage: c.lastMessagePreview ?? "",
          lastDirection: (c.lastMessageDirection ?? "INBOUND") as "INBOUND" | "OUTBOUND",
          status: c.status,
          threadId: c.threadId,
          botMuted,
          needsHuman: c.needsHuman === true,
          escalationReason: c.escalationReason,
        };
      })
    );

    if (search) {
      list = list.filter((c) => {
        const name = (c.resolvedName ?? c.customerName ?? "").toLowerCase();
        const id = c.contactId.toLowerCase();
        const labels = (c.labels ?? []).join(" ").toLowerCase();
        return name.includes(search) || id.includes(search) || labels.includes(search);
      });
    }

    if (args.pipelineStage) {
      list = list.filter((c) => c.pipelineStage === args.pipelineStage);
    }

    if (args.label) {
      const label = args.label.trim().toLowerCase();
      list = list.filter((c) =>
        (c.labels ?? []).some((l) => l.toLowerCase() === label)
      );
    }

    return list.slice(0, limit);
  },
});

export const listInboxLabels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db.query("inboxLabels").collect();
    return rows
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((row) => ({
        _id: row._id,
        name: row.name,
        color: row.color,
      }));
  },
});

export const addInboxLabel = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("No autorizado");

    const name = args.name.trim();
    if (!name) throw new Error("Nombre de etiqueta vacío");
    if (RESERVED_INBOX_LABEL_NAMES.has(name.toLowerCase())) {
      throw new Error("Ese nombre está reservado para un estado del sistema");
    }

    const allLabels = await ctx.db.query("inboxLabels").collect();
    const existing = allLabels.find((row) => row.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing._id;

    return await ctx.db.insert("inboxLabels", {
      name,
      color: args.color,
      createdAt: Date.now(),
      createdBy: userId,
    });
  },
});

export const updateContactInbox = mutation({
  args: {
    contactId: v.string(),
    displayName: v.optional(v.string()),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("No autorizado");

    const contactId = args.contactId.trim();
    if (!contactId) throw new Error("Contacto inválido");

    const now = Date.now();
    const rows = sortByUpdatedAt(
      await ctx.db
        .query("conversations")
        .withIndex("by_contact", (q) => q.eq("contactId", contactId))
        .collect()
    );

    const nextDisplayName =
      args.displayName !== undefined ? args.displayName.trim() || undefined : undefined;
    const nextLabels = args.labels;

    const patch: Partial<{
      displayName: string | undefined;
      labels: string[];
      updatedAt: number;
    }> = { updatedAt: now };
    if (args.displayName !== undefined) patch.displayName = nextDisplayName;
    if (nextLabels !== undefined) patch.labels = nextLabels;

    if (rows.length > 0) {
      for (const row of rows) {
        await ctx.db.patch(row._id, patch);
      }
    } else {
      const conversationId = await ctx.db.insert("conversations", {
        contactId,
        channel: "whatsapp",
        displayName: nextDisplayName,
        labels: nextLabels ?? [],
        status: "open",
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      });
      if (nextLabels) {
        for (const label of nextLabels) {
          const trimmed = label.trim();
          if (!trimmed) continue;
          const existingLabel = await ctx.db
            .query("inboxLabels")
            .withIndex("by_name", (q) => q.eq("name", trimmed))
            .first();
          if (!existingLabel) {
            await ctx.db.insert("inboxLabels", {
              name: trimmed,
              createdAt: now,
              createdBy: userId,
            });
          }
        }
      }
      return { conversationId };
    }

    if (nextLabels) {
      for (const label of nextLabels) {
        const trimmed = label.trim();
        if (!trimmed) continue;
        const existingLabel = await ctx.db
          .query("inboxLabels")
          .withIndex("by_name", (q) => q.eq("name", trimmed))
          .first();
        if (!existingLabel) {
          await ctx.db.insert("inboxLabels", {
            name: trimmed,
            createdAt: now,
            createdBy: userId,
          });
        }
      }
    }

    return { conversationId: rows[0]!._id };
  },
});
