import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { anyApi } from "convex/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
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

async function sendWhatsAppText(args: { contactId: string; content: string }): Promise<string | null> {
  const apiKey = process.env.YCLOUD_API_KEY;
  const fromNumber = process.env.YCLOUD_PHONE_NUMBER;
  if (!apiKey || !fromNumber) return null;

  const toRaw = args.contactId.replace(/^whatsapp:/, "").trim().replace(/\s/g, "");
  const to = toRaw.startsWith("+") ? toRaw : `+${toRaw}`;
  const fromRaw = fromNumber.trim().replace(/\s/g, "");
  const from = fromRaw.startsWith("+") ? fromRaw : `+${fromRaw}`;

  const res = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      from,
      to,
      type: "text",
      text: { body: args.content.trim() },
    }),
  });
  const data = (await res.json()) as { id?: string; status?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? data.status ?? res.statusText);
  }
  return data.id ?? null;
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

    // Ensure session exists
    const sessionId = await ctx.runMutation(internalAny.whatsappBotState.ensureSession, {
      contactId,
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

    // 5. Run Agent
    const tools = {
        searchProfileByNumber,
        getSpecialDateToday,
        listServices,
        getServiceFields,
        validateServiceField,
        createRequest
    };

    const contextPrompt = `
[Contexto técnico]
contactId: ${contactId}
phoneNumber: ${contactId.replace(/^whatsapp:/, "")}
mediaUrl: ${args.mediaUrl || "N/A"}
[Fin contexto técnico]

${args.text}
    `.trim();

    try {
        const response = await tanticoAgent.generateText(ctx, { threadId }, {
            prompt: contextPrompt,
            tools: tools as any
        });

        // The agent response should be the text reply.
        // If it returns an object, we handle it, but typically it returns a string if just text.
        // We'll treat it as string.
        let replyText = typeof response === 'string' ? response : (response as any)?.text;
        
        if (!replyText) {
             // Fallback: list messages if needed, or assume empty response
             const messages = await tanticoAgent.listMessages(ctx, { threadId, paginationOpts: { numItems: 5, cursor: null } });
             const lastMsg = messages.page.find((m: any) => m.message?.role === 'assistant');
             if (lastMsg) {
                 const content = lastMsg.message?.content;
                 replyText = Array.isArray(content) ? content.map((c: any) => c.text).join("") : content as string;
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
