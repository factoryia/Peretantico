import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { anyApi } from "convex/server";
import { internal } from "./_generated/api";
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

function getBogotaDateStrings(now: Date): { iso: string; monthDay: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const iso = `${year}-${month}-${day}`;
  const monthDay = `${month}-${day}`;
  return { iso, monthDay };
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
  },
  handler: async (ctx, args) => {
    const internalAny = anyApi;
    const contactId = normalizeWhatsAppContactId(args.contactId);

    // 1. Dedupe event
    const dedupe = await ctx.runMutation(internalAny.ycloudState.recordProcessedEvent, {
      eventId: args.eventId,
    });
    if (dedupe?.duplicate) return;

    await ctx.runMutation(internalAny.ycloudState.markConnected, {});

    // 2. Record Inbound Message
    await ctx.runMutation(internalAny.ycloudState.addInboundMessage, {
      contactId,
      customerName: args.customerName,
      content: args.text,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType as MediaType | undefined,
    });

    // 3. Check Mute
    const botMuted = await ctx.runQuery(internalAny.ycloudState.getEffectiveMute, { contactId });
    if (botMuted) return;

    // 4. Ensure Session & Thread
    // Ensure applicant exists (user tracking)
    await ctx.runMutation(internalAny.whatsappBotState.ensureApplicant, {
      contactId,
      phoneNumber: contactId.replace(/^whatsapp:/, ""),
      customerName: args.customerName,
    });

    const applicant = await ctx.runQuery(internalAny.whatsappBotState.getApplicantByContact, { contactId });
    const applicantProfileId = (applicant as { profileId?: string | null })?.profileId ?? null;
    const applicantDocumentNumber = (applicant as { documentNumber?: string | null })?.documentNumber ?? null;

    // Ensure session exists
    const sessionId = await ctx.runMutation(internalAny.whatsappBotState.ensureSession, {
      contactId,
      profileId: applicantProfileId ? (applicantProfileId as unknown as Id<"profiles">) : undefined,
    });
    const session = await ctx.runQuery(internalAny.whatsappBotState.getSessionByContact, {
      contactId,
    });

    if (!session) return; 

    let threadId = session.threadId as string | undefined;
    if (!threadId) {
        const created = await tanticoAgent.createThread(ctx, { title: `WhatsApp ${contactId}` });
        threadId = created.threadId;
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          threadId,
        });
    }

    let resolvedProfile: { _id?: unknown; fullName?: unknown } | null = null;
    if (session.profileId) {
      resolvedProfile = await ctx.runQuery(internalAny.profiles.get, { id: session.profileId });
    }
    if (!resolvedProfile && applicantProfileId) {
      resolvedProfile = await ctx.runQuery(internalAny.profiles.get, { id: applicantProfileId });
    }
    if (!resolvedProfile && applicantDocumentNumber) {
      resolvedProfile = await ctx.runQuery(internalAny.profiles.findByDocumentNumber, {
        documentNumber: applicantDocumentNumber,
      });
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
      const created = await tanticoAgent.createThread(ctx, { title: `WhatsApp ${contactId} (reset)` });
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

      const replyText = [
        "Listo. Reinicié la conversación.",
        "¿Qué servicio necesitas hoy?",
      ].join("\n");
      const providerMessageId = await sendWhatsAppText({ contactId, content: replyText });
      if (providerMessageId) {
        await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
          contactId,
          content: replyText,
          providerMessageId,
        });
      }
      return;
    }

    // 5. Run Agent
    const tools = {
        searchProfileByNumber,
        getSpecialDateToday,
        listServices,
        getServiceFields,
        validateServiceField,
        createRequest
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

    try {
        const response = await tanticoAgent.generateText(ctx, { threadId }, {
            prompt: contextPrompt,
            tools
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
          const allServices = (await ctx.runQuery(internalAny.services.listAll, {})) as Array<{
            name?: string;
            status?: boolean;
          }>;
          const serviceNames = (allServices || []).filter((s) => s.status !== false).map((s) => String(s.name ?? "").trim()).filter(Boolean);
          const normalizedReply = normalizeForMatch(replyText);
          const matchesAnyService = serviceNames.some((name) => normalizedReply.includes(normalizeForMatch(name)));
          const looksLikeServiceList = normalizedReply.includes("servicios disponibles") || normalizedReply.includes("- servicio") || normalizedReply.includes("servicio de");

          if (looksLikeServiceList && serviceNames.length > 0 && !matchesAnyService) {
            const today = getBogotaDateStrings(new Date());
            const special = await ctx.runQuery(internalAny.specialDates.getTodayForGreeting, {
              today: today.iso,
              monthDay: today.monthDay,
            });
            const specialLine = special?.title ? `Hoy celebramos el *${special.title}*.` : "";
            const lines = [
              "¡Hola! Soy Tantico, tu asistente virtual.",
              specialLine,
              "Voy a mostrarte los servicios disponibles:",
              ...serviceNames.map((n) => `- ${n}`),
              "",
              "¿Cuál de estos servicios necesitas?",
            ].filter((l) => l !== "");
            replyText = lines.join("\n");
          }
        }

        if (replyText) {
             const providerMessageId = await sendWhatsAppText({ contactId, content: replyText });
             if (providerMessageId) {
                 await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
                     contactId,
                     content: replyText,
                     providerMessageId
                 });
             }
        }
    } catch (error) {
        console.error("Agent error:", error);
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

    await ctx.runMutation(internal.ycloudState.addOutboundMessage, {
      contactId,
      content,
      providerMessageId,
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
