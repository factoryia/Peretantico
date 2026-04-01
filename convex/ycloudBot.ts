import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
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
import { buildRequestCompletionMessage } from "./system/ai/requestCompletion";
import { resolveRequestFlow } from "./system/requestFlow";
import {
  buildServicesListReply,
  buildInboundContextPrompt,
  deriveInboundFlowDecision,
  extractCreateRequestCompletion,
  getUnsupportedIntentReply,
  isResetThreadTitle,
  normalizeForMatch,
  resolveAgentEmptyReply,
} from "./ycloudBot.helpers";
import { mergeSessionFlow } from "./whatsappBotState";

type MediaType = "image" | "video" | "audio" | "document";

type AgentToolResult = {
  type?: string;
  toolName?: string;
  input?: Record<string, unknown>;
  result?: unknown;
  output?: unknown;
};

function unwrapToolPayload(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const boxed = value as { type?: unknown; value?: unknown };
  if (boxed.type === "json" && boxed.value && typeof boxed.value === "object") {
    return boxed.value as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

async function syncDeterministicSessionFlow(args: {
  ctx: Pick<ActionCtx, "runMutation" | "runQuery">;
  internalAny: typeof anyApi;
  sessionId: Id<"botSessions">;
  session: {
    serviceId?: Id<"services">;
    fieldIds?: Id<"serviceFields">[];
    currentFieldIndex?: number | null;
    data?: unknown;
  };
  toolResults?: unknown[];
}) {
  const toolResults = Array.isArray(args.toolResults) ? (args.toolResults as AgentToolResult[]) : [];
  if (toolResults.length === 0) return;

  let serviceId = args.session.serviceId ? String(args.session.serviceId) : null;
  let fieldIds = Array.isArray(args.session.fieldIds) ? args.session.fieldIds.map((id) => String(id)) : [];
  let currentData = args.session.data;

  for (const toolResult of toolResults) {
    if (toolResult?.type !== "tool-result") continue;
    const input = unwrapToolPayload(toolResult.input) ?? {};
    const output = unwrapToolPayload(toolResult.output) ?? unwrapToolPayload(toolResult.result) ?? {};

    if (toolResult.toolName === "getServiceFields") {
      const found = output.found !== false;
      const service = output.service && typeof output.service === "object" ? (output.service as Record<string, unknown>) : null;
      if (!found || !service?.id) continue;

      serviceId = String(service.id);
      fieldIds = Array.isArray(output.fields)
        ? output.fields
            .map((field) => (field && typeof field === "object" ? String((field as Record<string, unknown>).id ?? "") : ""))
            .filter(Boolean)
        : [];

      currentData = mergeSessionFlow(currentData, {
        stage: typeof output.branchKey === "string" ? "fields" : "branch",
        branchKey: typeof output.branchKey === "string" ? output.branchKey : null,
        pendingFieldIds: fieldIds,
      });
    }

    if (toolResult.toolName === "validateServiceField" && output.ok === true) {
      const fieldId = String(input.fieldId ?? "").trim();
      if (!fieldId) continue;
      const normalizedValue = output.normalizedValue;
      currentData = mergeSessionFlow(currentData, {
        stage: "fields",
        collectedData: { [fieldId]: normalizedValue },
      });
    }

    if (toolResult.toolName === "createRequest") {
      const paymentMethod = String(input.paymentMethod ?? "").trim() || null;
      currentData = mergeSessionFlow(currentData, {
        paymentDraft: { method: paymentMethod },
      });
    }
  }

  if (!serviceId) return;

  const service = await args.ctx.runQuery(args.internalAny.services.get, {
    id: serviceId,
  }).catch(() => null);
  const serviceRecord = service && typeof service === "object" ? (service as Record<string, unknown>) : null;
  if (!serviceRecord) return;

  const flow = (currentData && typeof currentData === "object" && "flow" in (currentData as Record<string, unknown>)
    ? ((currentData as Record<string, unknown>).flow as Record<string, unknown> | undefined)
    : undefined) ?? {};

  const resolved = resolveRequestFlow({
    workflowMode: String(serviceRecord.workflowMode ?? "legacy"),
    workflowConfig: (serviceRecord.workflowConfig ?? undefined) as Parameters<typeof resolveRequestFlow>[0]["workflowConfig"],
    fieldIds,
    collectedData:
      flow.collectedData && typeof flow.collectedData === "object"
        ? (flow.collectedData as Record<string, unknown>)
        : undefined,
    branchKey: typeof flow.branchKey === "string" ? flow.branchKey : null,
    addressConfirmed: Boolean(flow.addressConfirmed || flow.draftAddress),
    paymentMethod:
      flow.paymentDraft && typeof flow.paymentDraft === "object" && typeof (flow.paymentDraft as Record<string, unknown>).method === "string"
        ? String((flow.paymentDraft as Record<string, unknown>).method)
        : null,
  });

  currentData = mergeSessionFlow(currentData, {
    stage: resolved.stage,
    branchKey: resolved.branchKey,
    pendingFieldIds: resolved.pendingFieldIds,
  });

  const nextFieldIndex = resolved.pendingFieldIds.length > 0 ? fieldIds.indexOf(resolved.pendingFieldIds[0]) : -1;

  await args.ctx.runMutation(args.internalAny.whatsappBotState.patchSession, {
    id: args.sessionId,
    serviceId: serviceId as unknown as Id<"services">,
    fieldIds: fieldIds.map((id) => id as unknown as Id<"serviceFields">),
    currentFieldIndex: nextFieldIndex >= 0 ? nextFieldIndex : null,
    data: currentData,
    state: resolved.stage === "complete" ? "INIT" : "IN_PROGRESS",
  });
}

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
  if (!apiKey || !fromNumber) {
    console.warn("[sendWhatsAppText] Missing YCLOUD_API_KEY or YCLOUD_PHONE_NUMBER");
    return null;
  }

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
    console.error("[sendWhatsAppText] Failed to=${to} status=${res.status} error=${data.message ?? data.status ?? res.statusText}");
    throw new Error(data.message ?? data.status ?? res.statusText);
  }

  return null;
}

async function clearContactMessageHistory(
  ctx: Pick<ActionCtx, "runMutation">,
  internalAny: typeof anyApi,
  contactId: string
): Promise<void> {
  for (;;) {
    const res = await ctx.runMutation(internalAny.ycloudState.deleteMessagesByContactBatch, {
      contactId,
      limit: 500,
    });
    const boxed = res && typeof res === "object" ? (res as Record<string, unknown>) : null;
    if (boxed?.isDone === true) break;
  }
}

async function applyConversationReset(args: {
  ctx: Pick<ActionCtx, "runAction" | "runMutation">;
  internalAny: typeof anyApi;
  sessionId: Id<"botSessions">;
  contactId: string;
  customerName?: string;
  currentThreadId?: string;
  newThreadId: string;
  clearProfileAssociation: boolean;
  deleteCurrentThreadMessages: boolean;
}): Promise<void> {
  if (args.deleteCurrentThreadMessages && args.currentThreadId) {
    await args.ctx
      .runAction(components.agent.threads.deleteAllForThreadIdSync, { threadId: args.currentThreadId })
      .catch(() => null);
  }

  await clearContactMessageHistory(args.ctx, args.internalAny, args.contactId);

  if (args.clearProfileAssociation) {
    await args.ctx.runMutation(args.internalAny.whatsappBotState.clearProfileAssociationForContact, {
      contactId: args.contactId,
    });
  }

  await args.ctx.runMutation(args.internalAny.conversationState.resetConversationForContact, {
    contactId: args.contactId,
    newThreadId: args.newThreadId,
    customerName: args.customerName,
  });

  await args.ctx.runMutation(args.internalAny.whatsappBotState.patchSession, {
    id: args.sessionId,
    threadId: args.newThreadId,
    profileId: args.clearProfileAssociation ? null : undefined,
    serviceId: null,
    fieldIds: null,
    currentFieldIndex: null,
    data: {},
    attachments: [],
    state: "INIT",
  });
}

export const processInboundMessage = internalAction({
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
      });

      // IMMEDIATE MEDIA DOWNLOAD: Try to download media right now while URL is fresh
      let mediaStorageId: Id<"_storage"> | undefined;
      if (args.mediaUrl) {
        const apiKey = process.env.YCLOUD_API_KEY;
        const headers: Record<string, string> = {};
        if (apiKey) headers["X-API-Key"] = apiKey;

        try {
          console.log("Attempting immediate media download from webhook URL...");
          const res = await fetch(args.mediaUrl, { headers });
          console.log("Immediate download response:", res.status);

          if (res.ok) {
            const contentType = res.headers.get("content-type") ?? undefined;
            const arrayBuffer = await res.arrayBuffer();
            const blob = new Blob([arrayBuffer], contentType ? { type: contentType } : undefined);
            mediaStorageId = await ctx.storage.store(blob);
            console.log("Media downloaded immediately, storageId:", mediaStorageId);
          } else {
            console.warn("Immediate download failed with status:", res.status);
          }
        } catch (downloadError) {
          console.warn("Error in immediate media download:", downloadError);
        }
      }

      // Store pending media info in session for later use if immediate download failed
      if (!mediaStorageId && args.mediaUrl) {
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          pendingMediaUrl: args.mediaUrl,
          pendingMediaId: args.mediaId,
          pendingMediaType: args.mediaType,
          pendingMediaFilename: args.mediaFilename,
        });
      } else if (mediaStorageId) {
        // Clear any pending media since we downloaded successfully
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          pendingMediaUrl: null,
          pendingMediaId: null,
          pendingMediaType: null,
          pendingMediaFilename: null,
        });
      }
      const session = await ctx.runQuery(internalAny.whatsappBotState.getSessionByContact, {
        contactId,
      });

      if (!session) return;

      if (session.state === "INIT" && session.serviceId) {
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          serviceId: null,
          fieldIds: null,
          currentFieldIndex: null,
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
          serviceId: null,
          fieldIds: null,
          currentFieldIndex: null,
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
          serviceId: null,
          fieldIds: null,
          currentFieldIndex: null,
          data: {},
          attachments: [],
          state: "INIT",
        });
      }

      const inbound = await ctx.runMutation(internalAny.ycloudState.addInboundMessage, {
        contactId,
        customerName: args.customerName,
        content: args.text,
        mediaUrl: mediaStorageId ? undefined : args.mediaUrl, // Only store URL if we couldn't download
        mediaId: args.mediaId,
        mediaStorageId: mediaStorageId,
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
        const created = await tanticoAgent.createThread(ctx, { title: `WhatsApp ${contactId} (reset)`, userId: contactId });
        await applyConversationReset({
          ctx,
          internalAny,
          sessionId,
          contactId,
          customerName: args.customerName,
          currentThreadId: threadId,
          newThreadId: created.threadId,
          clearProfileAssociation: true,
          deleteCurrentThreadMessages: true,
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

      if (threadId) {
        const activeThread = await ctx.runQuery(components.agent.threads.getThread, { threadId }).catch(() => null);
        if (isResetThreadTitle(activeThread?.title)) {
          const created = await tanticoAgent.createThread(ctx, { title: `WhatsApp ${contactId}`, userId: contactId });
          await ctx.runMutation(internalAny.conversationState.resetConversationForContact, {
            contactId,
            newThreadId: created.threadId,
            customerName: args.customerName,
          });
          await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
            id: sessionId,
            threadId: created.threadId,
            serviceId: null,
            fieldIds: null,
            currentFieldIndex: null,
            data: {},
            attachments: [],
            state: "INIT",
          });
          threadId = created.threadId;
        }
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
          hasPriority?: boolean;
          priorityPrice?: number;
          status?: boolean;
        }>;
        const services = (all || [])
          .filter((s) => s.status !== false)
          .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "es"));
        const replyText = buildServicesListReply(services);
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
      const allServices = (await ctx.runQuery(internalAny.services.listAll, {})) as Array<{
        name?: string;
        status?: boolean;
      }>;
      const flowDecision = deriveInboundFlowDecision({
        rawText,
        hasMedia,
        lastOutboundContent,
        services: allServices || [],
        hasSessionServiceId: Boolean(session.serviceId),
        sessionFieldIdsCount: Array.isArray((session as { fieldIds?: unknown[] }).fieldIds)
          ? (((session as { fieldIds?: unknown[] }).fieldIds?.length ?? 0) as number)
          : 0,
        currentFieldIndex:
          typeof (session as { currentFieldIndex?: unknown }).currentFieldIndex === "number"
            ? ((session as { currentFieldIndex?: number }).currentFieldIndex ?? undefined)
            : undefined,
        applicantNeedsProfile,
      });
      const effectiveText = flowDecision.effectiveText;

      if (flowDecision.shouldBlock) {
        const replyText = getUnsupportedIntentReply();
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

      // Get media info - only pass mediaStorageId to context (no YCloud URLs)
      const contextPrompt = buildInboundContextPrompt({
        contactId,
        effectiveText,
        resolvedProfileId,
        resolvedProfileName: resolvedProfile?.fullName ? String(resolvedProfile.fullName) : null,
        mediaType: args.mediaType,
        mediaStorageId: mediaStorageId ? String(mediaStorageId) : undefined,
        sessionState: session.state ? String(session.state) : null,
        serviceId: session.serviceId ? String(session.serviceId) : null,
        currentFieldIndex: typeof session.currentFieldIndex === "number" ? session.currentFieldIndex : null,
      });

      const response = await tanticoAgent.generateText(ctx, { threadId }, {
        prompt: contextPrompt,
        tools,
      });

      console.log("[processInboundMessage] Agent response:", {
        textLength: response.text?.length ?? 0,
        textPreview: (response.text ?? "").substring(0, 200),
        toolResultsCount: response.toolResults?.length ?? 0,
        toolNames: response.toolResults?.map((r) => r?.toolName).filter(Boolean),
      });

      await syncDeterministicSessionFlow({
        ctx,
        internalAny,
        sessionId,
        session,
        toolResults: response.toolResults,
      }).catch((syncError) => {
        console.error("Session flow sync error:", syncError);
      });

      const rawCompletion = extractCreateRequestCompletion(response.toolResults);

      // NEW POLICY: If ok=true but no completion, create soft reset instead of new thread
      if (rawCompletion?.ok && !rawCompletion.completion) {
        rawCompletion.completion = {
          closeConversation: false,
          message: buildRequestCompletionMessage({
            applicationNumber: rawCompletion.applicationNumber,
            contextRestarted: false,
          }),
          closureApplied: false,
          contextRestarted: false,
          softReset: true,
        };
      }

      let replyText = (response.text ?? "").trim();
      console.log("[processInboundMessage] Initial replyText from response.text:", {
        length: replyText.length,
        preview: replyText.substring(0, 200),
      });

      // NEW POLICY: Soft reset instead of thread rotation
      // - No new thread creation
      // - No message deletion
      // - Keep profile association for identity continuity
      // - Only reset session state (service, fields, data)
      if (rawCompletion?.ok && rawCompletion.completion?.softReset) {
        // Soft reset: clear session state but keep profile/identity
        await ctx.runMutation(internalAny.whatsappBotState.patchSession, {
          id: sessionId,
          // Keep threadId - no rotation
          // Keep profileId - preserve identity
          serviceId: null,
          fieldIds: null,
          currentFieldIndex: null,
          data: {},
          attachments: [],
          state: "INIT",
        });

        // Close the conversation but keep thread (for context continuity if needed later)
        // Actually, per new policy: don't close anything, just reset for clean next message
        // The conversation stays open, just session state is reset
      }
        
      if (!replyText) {
        console.log("[processInboundMessage] replyText is empty, trying listMessages...");
        const messages = await tanticoAgent.listMessages(ctx, { threadId, paginationOpts: { numItems: 10, cursor: null } });
        console.log("[processInboundMessage] listMessages result:", { count: messages.page.length });
        const lastAssistant = [...messages.page].reverse().find((m) => m.message?.role === "assistant");
        if (lastAssistant) {
          const content = lastAssistant.message?.content;
          replyText = extractTextFromMessageContent(content).trim();
          console.log("[processInboundMessage] Got replyText from listMessages:", { length: replyText.length, preview: replyText.substring(0, 200) });
        }
      }
        
      if (!replyText) {
        const messages = await tanticoAgent.listMessages(ctx, { threadId, paginationOpts: { numItems: 10, cursor: null } });
        const lastAssistant = [...messages.page].reverse().find((m) => m.message?.role === "assistant");
        if (lastAssistant) {
          const content = lastAssistant.message?.content;
          replyText = extractTextFromMessageContent(content).trim();
        }
      }

      if (rawCompletion?.ok && rawCompletion.completion?.closeConversation) {
        replyText = replyText || rawCompletion.completion.message?.trim() || "";
      }

      replyText = resolveAgentEmptyReply({
        assistantText: replyText,
        toolResults: response.toolResults,
        lastOutboundContent,
      });

      console.log("[processInboundMessage] Final replyText:", {
        length: replyText?.length ?? 0,
        preview: (replyText ?? "").substring(0, 300),
        hasContent: Boolean(replyText),
      });

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
