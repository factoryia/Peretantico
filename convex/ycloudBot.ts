import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { anyApi } from "convex/server";
import { components, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { ToolSet } from "ai";
import { tanticoAgent } from "./system/ai/agents/tanticoAgent";
import { searchProfileByNumber } from "./system/ai/tools/searchProfileByNumber";
import { getSpecialDateToday } from "./system/ai/tools/getSpecialDateToday";
import { listServices } from "./system/ai/tools/listServices";
import { getServiceFields } from "./system/ai/tools/getServiceFields";
import { validateServiceField } from "./system/ai/tools/validateServiceField";
import { createRequest } from "./system/ai/tools/createRequest";

type MediaType = "image" | "video" | "audio" | "document";

function normalizeWhatsAppContactId(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  const num = trimmed.replace(/\s/g, "");
  if (!num) return "whatsapp:+unknown";
  return `whatsapp:${num.startsWith("+") ? num : `+${num}`}`;
}

function normalizePhoneDigits(input: string): string {
  return (input ?? "").replace(/[^\d+]/g, "").trim();
}

function phoneVariants(raw: string): string[] {
  const t = normalizePhoneDigits(raw);
  if (!t) return [];

  const noPlus = t.replace(/^\+/, "");
  const digitsOnly = noPlus.replace(/\D/g, "");

  const variants = new Set<string>();
  variants.add(t);
  variants.add(noPlus);
  if (digitsOnly) variants.add(digitsOnly);

  if (digitsOnly.length === 10 && digitsOnly.startsWith("3")) {
    variants.add(`+57${digitsOnly}`);
    variants.add(`57${digitsOnly}`);
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("57")) {
    variants.add(`+${digitsOnly}`);
    variants.add(digitsOnly.slice(2));
  }

  return Array.from(variants).filter(Boolean);
}

function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const part of content) {
    if (typeof part === "object" && part !== null && "type" in part) {
      const t = (part as { type?: unknown }).type;
      if (t === "text" && "text" in (part as object)) {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string") out += text;
      }
    }
  }
  return out;
}

async function sendWhatsAppText(args: { contactId: string; content: string }): Promise<string | null> {
  const apiKey = process.env.YCLOUD_API_KEY;
  const fromNumber = process.env.YCLOUD_PHONE_NUMBER;
  if (!apiKey || !fromNumber) return null;

  const toRaw = args.contactId.replace(/^whatsapp:/, "").trim().replace(/\s/g, "");
  const to = toRaw.startsWith("+") ? toRaw : `+${toRaw}`;
  const fromRaw = fromNumber.trim().replace(/\s/g, "");
  const from = fromRaw.startsWith("+") ? fromRaw : `+${fromRaw}`;

  const payload = JSON.stringify({
    from,
    to,
    type: "text",
    text: { body: args.content.trim() },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: payload,
    });

    const data = (await res.json()) as { id?: string; status?: string; message?: string };
    if (res.ok) return data.id ?? null;

    const shouldRetry = res.status === 429 || res.status >= 500;
    if (attempt === 0 && shouldRetry) {
      await sleep(500);
      continue;
    }
    throw new Error(data.message ?? data.status ?? res.statusText);
  }

  return null;
}

export const processInboundMessage = internalAction({
  args: {
    eventId: v.string(),
    contactId: v.string(),
    customerName: v.optional(v.string()),
    text: v.string(),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(
      v.union(v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"))
    ),
    mediaFilename: v.optional(v.string()),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const internalAny = anyApi;
    const contactId = normalizeWhatsAppContactId(args.contactId);

    let hasLock = false;
    try {
      const attempt = Math.max(0, Math.min(args.attempt ?? 0, 25));
      const lock = await ctx.runMutation(internalAny.ycloudState.acquireProcessingLock, {
        contactId,
        ownerEventId: args.eventId,
        ttlMs: 60_000,
      });
      if (!lock?.ok) {
        if (attempt >= 25) return;
        await ctx.scheduler.runAfter(250, internalAny.ycloudBot.processInboundMessage, {
          ...args,
          contactId,
          attempt: attempt + 1,
        });
        return;
      }
      hasLock = true;

      const dedupe = await ctx.runMutation(internalAny.ycloudState.recordProcessedEvent, {
        eventId: args.eventId,
      });
      if (dedupe?.duplicate) return;

      await ctx.runMutation(internalAny.ycloudState.markConnected, {});

      await ctx.runMutation(internalAny.whatsappBotState.ensureApplicant, {
        contactId,
        phoneNumber: contactId.replace(/^whatsapp:/, ""),
        customerName: args.customerName,
      });

      const applicant = await ctx.runQuery(internalAny.whatsappBotState.getApplicantByContact, { contactId });
      const applicantProfileId = (applicant as { profileId?: string | null })?.profileId ?? null;

      const sessionId = await ctx.runMutation(internalAny.whatsappBotState.ensureSession, {
        contactId,
        profileId: applicantProfileId ? (applicantProfileId as unknown as Id<"profiles">) : undefined,
      });
      const session = await ctx.runQuery(internalAny.whatsappBotState.getSessionByContact, {
        contactId,
      });

      if (!session) return;

      if (session.state === "INIT" && session.serviceId) {
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          serviceId: undefined,
          fieldIds: undefined,
          currentFieldIndex: undefined,
          data: {},
          attachments: [],
          state: "INIT",
        });
      }

      const conv = await ctx.runMutation(internalAny.conversationState.ensureConversationForContact, {
        contactId,
        customerName: args.customerName,
        threadId: session.threadId as string | undefined,
      });

      let threadId = (conv as { threadId?: string | undefined }).threadId as string | undefined;
      if (!threadId) {
        const created = await tanticoAgent.createThread(ctx, { title: `WhatsApp ${contactId}`, userId: contactId });
        await ctx.runMutation(internalAny.conversationState.setThreadIdForContact, {
          contactId,
          threadId: created.threadId,
          customerName: args.customerName,
        });
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          threadId: created.threadId,
          serviceId: undefined,
          fieldIds: undefined,
          currentFieldIndex: undefined,
          data: {},
          attachments: [],
          state: "INIT",
        });
        threadId = created.threadId;
      }
      if (threadId && session.threadId !== threadId) {
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          threadId,
          serviceId: undefined,
          fieldIds: undefined,
          currentFieldIndex: undefined,
          data: {},
          attachments: [],
          state: "INIT",
        });
      }

      const inbound = await ctx.runMutation(internalAny.ycloudState.addInboundMessage, {
        contactId,
        customerName: args.customerName,
        content: args.text,
        mediaUrl: args.mediaUrl,
        mediaType: args.mediaType as MediaType | undefined,
      });

      await ctx.runMutation(internalAny.conversationState.updateLastMessage, {
        contactId,
        customerName: args.customerName,
        direction: "INBOUND",
        content: args.text,
        mediaType: args.mediaType as MediaType | undefined,
        createdAt: (inbound as { createdAt?: number }).createdAt ?? Date.now(),
      });

      const botMuted = await ctx.runQuery(internalAny.ycloudState.getEffectiveMute, { contactId });
      if (botMuted) return;

      let resolvedProfile: { _id?: unknown; fullName?: unknown } | null = null;
      if (session.profileId) {
        resolvedProfile = await ctx.runQuery(internalAny.profiles.get, { id: session.profileId });
      }
      if (!resolvedProfile && applicantProfileId) {
        resolvedProfile = await ctx.runQuery(internalAny.profiles.get, { id: applicantProfileId });
      }
      if (!resolvedProfile) {
        const rawPhone = contactId.replace(/^whatsapp:/, "");
        for (const v of phoneVariants(rawPhone)) {
          resolvedProfile = await ctx.runQuery(internalAny.profiles.findByPhoneNumber, { phoneNumber: v });
          if (resolvedProfile) break;
        }
      }

      const resolvedProfileId = resolvedProfile?._id ? String(resolvedProfile._id) : null;
      if (resolvedProfileId && (!session.profileId || String(session.profileId) !== resolvedProfileId)) {
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          profileId: resolvedProfileId as unknown as Id<"profiles">,
        });
      }

      const rawText = (args.text ?? "").trim();
      const normalizedCommand = normalizeForMatch(rawText);
      const isResetCommand =
        normalizedCommand === "reset" ||
        normalizedCommand === "/reset" ||
        normalizedCommand === "reiniciar" ||
        normalizedCommand === "/reiniciar" ||
        normalizedCommand === "resetear" ||
        normalizedCommand === "borrar" ||
        normalizedCommand === "borrar memoria";

      if (isResetCommand) {
        if (threadId) {
          await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, { threadId }).catch(() => null);
        }

        for (;;) {
          const res = await ctx.runMutation(internalAny.ycloudState.deleteMessagesByContactBatch, {
            contactId,
            limit: 500,
          });
          if (res?.isDone) break;
        }

        await ctx.runMutation(internalAny.whatsappBotState.clearProfileAssociationForContact, { contactId });

        const created = await tanticoAgent.createThread(ctx, { title: `WhatsApp ${contactId} (reset)`, userId: contactId });
        await ctx.runMutation(internalAny.conversationState.resetConversationForContact, {
          contactId,
          newThreadId: created.threadId,
          customerName: args.customerName,
        });
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          threadId: created.threadId,
          profileId: undefined,
          serviceId: undefined,
          fieldIds: undefined,
          currentFieldIndex: undefined,
          data: {},
          attachments: [],
          state: "INIT",
        });

        const replyText = ["Listo. Reinicié la conversación.", "¿Qué servicio necesitas hoy?"].join("\n");
        const providerMessageId = await sendWhatsAppText({ contactId, content: replyText });
        if (providerMessageId) {
          const outbound = await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
            contactId,
            content: replyText,
            providerMessageId,
          });
          await ctx.runMutation(internalAny.conversationState.updateLastMessage, {
            contactId,
            direction: "OUTBOUND",
            content: replyText,
            createdAt: (outbound as { createdAt?: number }).createdAt ?? Date.now(),
          });
        }
        return;
      }

      const wantsServices =
        normalizedCommand === "que servicios tiene" ||
        normalizedCommand === "que servicios tienen" ||
        normalizedCommand === "que servicios hay" ||
        normalizedCommand === "servicios" ||
        normalizedCommand === "servicios disponibles" ||
        normalizedCommand.includes("que servicios") ||
        normalizedCommand.includes("servicios tiene");
      if (wantsServices) {
        const all = (await ctx.runQuery(internalAny.services.listAll, {})) as Array<{ name?: string; price?: number; status?: boolean }>;
        const lines = [
          "Aquí tienes la lista de servicios disponibles:",
          "",
          ...(all || [])
            .filter((s) => s.status !== false)
            .map((s) => `- ${String(s.name ?? "").trim()}${typeof s.price === "number" ? ` - $${s.price.toLocaleString("es-CO")}` : ""}`)
            .filter((l) => l !== "- "),
          "",
          "¿Cuál de estos servicios necesitas?",
        ];
        const replyText = lines.join("\n");
        const providerMessageId = await sendWhatsAppText({ contactId, content: replyText });
        if (providerMessageId) {
          const outbound = await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
            contactId,
            content: replyText,
            providerMessageId,
          });
          await ctx.runMutation(internalAny.conversationState.updateLastMessage, {
            contactId,
            direction: "OUTBOUND",
            content: replyText,
            createdAt: (outbound as { createdAt?: number }).createdAt ?? Date.now(),
          });
        }
        return;
      }

      const tools = {
        searchProfileByNumber,
        getSpecialDateToday,
        listServices,
        getServiceFields,
        validateServiceField,
        createRequest,
      } satisfies ToolSet;

      const contextPrompt = `
[Contexto técnico]
contactId: ${contactId}
phoneNumber: ${contactId.replace(/^whatsapp:/, "")}
resolvedProfileId: ${resolvedProfileId ?? "N/A"}
resolvedProfileName: ${resolvedProfile?.fullName ?? "N/A"}
mediaType: ${args.mediaType || "N/A"}
mediaUrl: ${args.mediaUrl || "N/A"}
mediaFilename: ${args.mediaFilename || "N/A"}
sessionState: ${session.state || "N/A"}
selectedServiceId: ${session.serviceId || "N/A"}
currentFieldIndex: ${typeof session.currentFieldIndex === "number" ? session.currentFieldIndex : "N/A"}
capturedDataKeys: ${session.data ? Object.keys(session.data).join(", ") : "N/A"}
[Fin contexto técnico]

${args.text}
    `.trim();

      const response = await tanticoAgent.generateText(ctx, { threadId }, {
        prompt: contextPrompt,
        tools,
        
      });

      let replyText = response.text ?? "";
      replyText = replyText.trim();
        
      if (!replyText) {
        const messages = await tanticoAgent.listMessages(ctx, { threadId, paginationOpts: { numItems: 10, cursor: null } });
        const lastAssistant = [...messages.page].reverse().find((m) => m.message?.role === "assistant");
        if (lastAssistant) {
          const content = lastAssistant.message?.content;
          replyText = extractTextFromMessageContent(content).trim();
        }
      }

      if (replyText) {
        const providerMessageId = await sendWhatsAppText({ contactId, content: replyText });
        if (providerMessageId) {
          const outbound = await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
            contactId,
            content: replyText,
            providerMessageId,
          });
          await ctx.runMutation(internalAny.conversationState.updateLastMessage, {
            contactId,
            direction: "OUTBOUND",
            content: replyText,
            createdAt: (outbound as { createdAt?: number }).createdAt ?? Date.now(),
          });
        }
      }
    } catch (error) {
      console.error("Bot error:", error);
      const replyText = "Tuve un problema procesando tu mensaje. Por favor intenta de nuevo en unos segundos.";
      try {
        const providerMessageId = await sendWhatsAppText({ contactId, content: replyText });
        if (providerMessageId) {
          const outbound = await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
            contactId,
            content: replyText,
            providerMessageId,
          });
          await ctx.runMutation(internalAny.conversationState.updateLastMessage, {
            contactId,
            direction: "OUTBOUND",
            content: replyText,
            createdAt: (outbound as { createdAt?: number }).createdAt ?? Date.now(),
          });
        }
      } catch (sendError) {
        console.error("Bot send error:", sendError);
      }
    } finally {
      if (hasLock) {
        try {
          await ctx.runMutation(internalAny.ycloudState.releaseProcessingLock, {
            contactId,
            ownerEventId: args.eventId,
          });
        } catch (releaseError) {
          console.error("Lock release error:", releaseError);
        }
      }
    }
  },
});

export const sendManualMessage = action({
  args: { contactId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("No autorizado");

    const contactId = normalizeWhatsAppContactId(args.contactId);
    const content = args.content.trim();
    if (!content) throw new Error("Mensaje vacío");

    const providerMessageId = await sendWhatsAppText({ contactId, content });
    if (!providerMessageId) throw new Error("YCLOUD no está configurado");

    const outbound = await ctx.runMutation(internal.ycloudState.addOutboundMessage, {
      contactId,
      content,
      providerMessageId,
    });

    await ctx.runMutation(internal.conversationState.updateLastMessage, {
      contactId,
      direction: "OUTBOUND",
      content,
      createdAt: (outbound as { createdAt?: number }).createdAt ?? Date.now(),
    });

    await ctx.runMutation(internal.ycloudState.setHandoffMutation, {
      contactId,
      muted: true,
      durationMs: 1000 * 60 * 60 * 2,
      updatedBy: userId,
    });

    return { providerMessageId };
  },
});
