import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { anyApi } from "convex/server";

type MediaType = "image" | "video" | "audio" | "document";

function normalizeWhatsAppContactId(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  const num = trimmed.replace(/\s/g, "");
  if (!num) return "whatsapp:+unknown";
  return `whatsapp:${num.startsWith("+") ? num : `+${num}`}`;
}

async function generateBotReply(args: {
  customerName?: string;
  text: string;
  history: { direction: "INBOUND" | "OUTBOUND"; content: string }[];
}): Promise<string | null> {
  const prompt = [
    "Eres un asistente virtual. Responde en texto plano, con saltos de línea cuando ayude. Sé breve y útil.",
    args.customerName ? `Cliente: ${args.customerName}` : "",
    args.history.length
      ? `Historial:\n${args.history
          .map((m) => `${m.direction === "INBOUND" ? "Cliente" : "Asistente"}: ${m.content}`)
          .join("\n")}`
      : "",
    `Cliente dice:\n${args.text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (openaiKey) {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(data.error?.message ?? res.statusText);
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(data.error?.message ?? res.statusText);
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return text.trim() || null;
  }

  return null;
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
  },
  handler: async (ctx, args) => {
    const internalAny = anyApi;

    const contactId = normalizeWhatsAppContactId(args.contactId);
    const dedupe = await ctx.runMutation(internalAny.ycloudState.recordProcessedEvent, {
      eventId: args.eventId,
    });
    if (dedupe?.duplicate) return;

    await ctx.runMutation(internalAny.ycloudState.markConnected, {});

    await ctx.runMutation(internalAny.ycloudState.addInboundMessage, {
      contactId,
      customerName: args.customerName,
      content: args.text,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType as MediaType | undefined,
    });

    const history = (await ctx.runQuery(internalAny.ycloudState.listRecentMessages, {
      contactId,
      limit: 12,
    })) as { direction: "INBOUND" | "OUTBOUND"; content: string }[];

    const reply = await generateBotReply({
      customerName: args.customerName,
      text: args.text,
      history,
    });
    if (!reply) return;

    const providerMessageId = await sendWhatsAppText({ contactId, content: reply });
    if (!providerMessageId) return;
    await ctx.runMutation(internalAny.ycloudState.addOutboundMessage, {
      contactId,
      content: reply,
      providerMessageId,
    });
  },
});
