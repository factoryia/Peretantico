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
import { createApplicantProfile } from "./system/ai/tools/createApplicantProfile";
import { createRequest } from "./system/ai/tools/createRequest";
import { getRequestStatus } from "./system/ai/tools/getRequestStatus";

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

const OFF_TOPIC_REPLY = [
  "En este chat solo puedo ayudarte a crear solicitudes de servicios de Pere Tantico Tequendo o consultar el estado de una solicitud (REQ-XXXXXX).",
  "",
  'Si quieres ver la lista, escribe "servicios".',
  "",
  "¿Qué servicio necesitas hoy?",
].join("\n");

function isStronglyOffTopic(normalized: string, raw: string): boolean {
  const t = raw.trim();
  if (/[0-9]\s*[+*/]\s*[0-9]/.test(t)) return true;
  if (/[0-9]\s*-\s*[0-9]/.test(t)) {
    const normalizedRaw = normalizeForMatch(raw);
    const looksLikeStreetNumber = /#\s*\d+\s*-\s*\d+/.test(t);
    const looksLikeAddress =
      looksLikeStreetNumber ||
      /\b(calle|carrera|cra|cll|avenida|av|apto|apartamento|barrio|km|transversal|diagonal)\b/.test(normalizedRaw);
    if (!looksLikeAddress) return true;
  }

  const patterns: RegExp[] = [
    /\b(algebra|algebraico|ecuacion|ecuaciones|derivada|derivadas|integral|integrales|trigonometria|logaritmo|logaritmos|matematic|calculo|polinomio|factoriza|simplifica|fraccion|fracciones|raiz|raices)\b/,
    /\b(programacion|programar|codigo|code|python|javascript|typescript|react|node|sql)\b/,
    /\b(chiste|cuentame un chiste|cuento|poema|cancion|letra|horoscopo)\b/,
  ];

  return patterns.some((r) => r.test(normalized));
}

function isOnTopicMessage(normalized: string, raw: string): boolean {
  if (!normalized) return false;

  if (/\breq\s*\d{3,}\b/.test(normalized)) return true;

  if (
    /\b(servicio|servicios|solicitud|solicitudes|pedido|pedidos|estado|seguimiento|consultar|consulta|precio|costo|valor|pago|pagar|prioridad|prioritario|radicacion|autorizacion|cita|citas|medicamento|medicamentos|domicilio|entrega)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  if (/\b(documento|cedula|cc|ti|pasaporte|nombre|direccion|correo|email)\b/.test(normalized)) return true;

  if (/\b(ayuda|me ayudas|necesito ayuda)\b/.test(normalized)) return true;

  if (
    normalized === "si" ||
    normalized === "no" ||
    normalized === "ok" ||
    normalized === "listo" ||
    normalized === "correcto" ||
    normalized === "confirmo" ||
    normalized === "de acuerdo"
  ) {
    return true;
  }

  if (/^\s*(hola|buenas|buenos dias|buenas tardes|buenas noches|buen dia)\b/.test(normalized)) return true;

  if (/\S+@\S+\.\S+/.test(raw)) return true;

  if (/\b(calle|carrera|cra|cll|avenida|av|apto|apartamento|barrio|km|transversal|diagonal)\b/.test(normalized)) return true;

  const digitCount = raw.replace(/\D/g, "").length;
  if (digitCount >= 6) return true;

  return false;
}

function wordCount(normalized: string): number {
  if (!normalized) return 0;
  return normalized.split(/\s+/g).filter(Boolean).length;
}

function looksLikeShortFlowAnswer(normalized: string, raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^\d{1,3}$/.test(t)) return true;
  if (/\S+@\S+\.\S+/.test(t)) return true;
  if (t.replace(/\D/g, "").length >= 6) return true;
  const wc = wordCount(normalized);
  if (wc >= 1 && wc <= 40 && t.length <= 250) return true;
  return false;
}

function lastOutboundLooksLikeWeAreAskingForInput(args: { normalizedOutbound: string; rawOutbound: string }): boolean {
  const normalizedOutbound = args.normalizedOutbound;
  if (!normalizedOutbound && !args.rawOutbound) return false;
  if (normalizedOutbound.includes("que servicio necesitas")) return true;
  if (normalizedOutbound.includes("cual de estos servicios necesitas")) return true;
  if (normalizedOutbound.includes("lista de servicios disponibles")) return true;
  if (normalizedOutbound.includes("comenzaremos con el campo")) return true;
  if (normalizedOutbound.includes("por favor indicame")) return true;
  if (normalizedOutbound.includes("por favor indiqueme")) return true;
  if (normalizedOutbound.includes("cual de las siguientes opciones prefieres")) return true;
  if (normalizedOutbound.includes("empecemos")) return true;
  if (args.rawOutbound.includes("?")) return true;
  return false;
}

function shouldBlockMessage(args: {
  rawText: string;
  normalized: string;
  hasMedia: boolean;
  hasActiveFlow: boolean;
  applicantNeedsProfile: boolean;
}): boolean {
  const text = args.rawText.trim();
  if (!text && !args.hasMedia) return false;
  if (args.hasMedia) return false;

  if (isStronglyOffTopic(args.normalized, args.rawText)) return true;

  if (args.hasActiveFlow || args.applicantNeedsProfile) return false;

  return !isOnTopicMessage(args.normalized, args.rawText);
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
        const all = (await ctx.runQuery(internalAny.services.listAll, {})) as Array<{
          name?: string;
          price?: number;
          status?: boolean;
        }>;
        const services = (all || [])
          .filter((s) => s.status !== false)
          .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "es"));
        const lines = [
          "Aquí tienes la lista de servicios disponibles:",
          "",
          ...services
            .map(
              (s, idx) =>
                `${idx + 1}) ${String(s.name ?? "").trim()}${
                  typeof s.price === "number" ? ` - $${s.price.toLocaleString("es-CO")}` : ""
                }`
            )
            .filter((l) => !/^\d+\)\s*$/.test(l)),
          "",
          "Responde con el número o el nombre del servicio.",
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

      const hasMedia = Boolean(args.mediaUrl || args.mediaType);
      const applicantNeedsProfile = (applicant as { state?: string } | null)?.state === "NEEDS_PROFILE";
      const recentMessages = (await ctx.runQuery(internalAny.ycloudState.listRecentMessages, {
        contactId,
        limit: 8,
      })) as Array<{ direction?: string; content?: string }>;
      let lastOutboundContent = "";
      for (let i = recentMessages.length - 1; i >= 0; i--) {
        const m = recentMessages[i];
        if (m?.direction === "OUTBOUND" && typeof m.content === "string") {
          lastOutboundContent = m.content;
          break;
        }
      }
      const normalizedLastOutbound = normalizeForMatch(lastOutboundContent);

      let effectiveText = rawText;
      const numericChoice = rawText.trim().match(/^\d{1,3}$/)?.[0] ?? "";
      const lastWasServiceList = normalizedLastOutbound.includes("lista de servicios disponibles");
      if (numericChoice && lastWasServiceList) {
        const all = (await ctx.runQuery(internalAny.services.listAll, {})) as Array<{
          name?: string;
          status?: boolean;
        }>;
        const services = (all || [])
          .filter((s) => s.status !== false)
          .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "es"));
        const n = Number(numericChoice);
        const picked = Number.isFinite(n) ? services[n - 1] : null;
        const pickedName = picked?.name ? String(picked.name).trim() : "";
        if (pickedName) {
          effectiveText = pickedName;
        }
      }

      const inferredActiveFlow =
        lastOutboundLooksLikeWeAreAskingForInput({
          normalizedOutbound: normalizedLastOutbound,
          rawOutbound: lastOutboundContent,
        }) &&
        looksLikeShortFlowAnswer(normalizedCommand, rawText);

      if (inferredActiveFlow) {
        const cutMarkers = [
          /responda\s+ia\s*[:-]/i,
          /responde\s+ia\s*[:-]/i,
          /respuesta\s+ia\s*[:-]/i,
        ];
        for (const m of cutMarkers) {
          const idx = effectiveText.search(m);
          if (idx > 0) {
            const left = effectiveText.slice(0, idx).trim();
            if (left) effectiveText = left;
            break;
          }
        }
      }
      const normalizedEffective = normalizeForMatch(effectiveText);

      const hasActiveFlow =
        Boolean(session.serviceId) ||
        (Array.isArray((session as { fieldIds?: unknown }).fieldIds) && ((session as { fieldIds?: unknown[] }).fieldIds?.length ?? 0) > 0) ||
        typeof (session as { currentFieldIndex?: unknown }).currentFieldIndex === "number" ||
        inferredActiveFlow;

      if (
        shouldBlockMessage({
          rawText,
          normalized: normalizedEffective || normalizedCommand,
          hasMedia,
          hasActiveFlow,
          applicantNeedsProfile,
        })
      ) {
        const replyText = OFF_TOPIC_REPLY;
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
        createApplicantProfile,
        createRequest,
        getRequestStatus,
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

${effectiveText}
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
