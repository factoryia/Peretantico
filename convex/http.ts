
import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { anyApi } from "convex/server";

const http = httpRouter();

auth.addHttpRoutes(http);

const webhookYCloud = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventType = (body as { type?: string })?.type;
  if (eventType && eventType !== "whatsapp.inbound_message.received") {
    return new Response(
      JSON.stringify({ ok: true, skipped: "event type not processed" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const wim = (body as { whatsappInboundMessage?: unknown })?.whatsappInboundMessage as
    | {
        from?: string;
        customerProfile?: { name?: string };
        type?: string;
        text?: { body?: string };
        image?: { link?: string; caption?: string };
        video?: { link?: string; caption?: string };
        audio?: { link?: string };
        document?: { link?: string; filename?: string; caption?: string };
        sticker?: { link?: string };
        location?: unknown;
      }
    | undefined;

  let contactId: string;
  let customerName: string | undefined;
  let text: string;
  let mediaUrl: string | undefined;
  let mediaType: "image" | "video" | "audio" | "document" | undefined;

  if (wim) {
    const from = (wim.from ?? "").trim();
    if (!from) {
      return new Response(
        JSON.stringify({ error: "Missing from in whatsappInboundMessage" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    contactId = from.startsWith("whatsapp:")
      ? from
      : `whatsapp:${from.startsWith("+") ? from : `+${from}`}`;
    customerName =
      wim.customerProfile?.name?.trim() ||
      from.replace(/^whatsapp:/, "").replace(/^\+/, "") ||
      undefined;

    if (wim.type === "text" && wim.text?.body) {
      text = wim.text.body;
    } else if (wim.type === "image") {
      mediaUrl = wim.image?.link;
      mediaType = "image";
      text = wim.image?.caption?.trim() ? wim.image.caption : "Imagen";
    } else if (wim.type === "video") {
      mediaUrl = wim.video?.link;
      mediaType = "video";
      text = wim.video?.caption?.trim() ? wim.video.caption : "Video";
    } else if (wim.type === "audio") {
      mediaUrl = wim.audio?.link;
      mediaType = "audio";
      text = "Audio";
    } else if (wim.type === "document") {
      mediaUrl = wim.document?.link;
      mediaType = "document";
      text = wim.document?.caption?.trim() || wim.document?.filename || "Documento";
    } else if (wim.type === "sticker") {
      mediaUrl = wim.sticker?.link;
      mediaType = "image";
      text = "Sticker";
    } else if (wim.type === "location") {
      text = "[Ubicación]";
    } else {
      text = wim.type ? `[${wim.type}]` : "";
    }
  } else {
    const simple = body as {
      contactId?: string;
      customerName?: string;
      text?: string;
    };
    const rawContact = (simple.contactId ?? "").trim();
    contactId = rawContact.startsWith("whatsapp:")
      ? rawContact
      : rawContact
        ? `whatsapp:${rawContact.startsWith("+") ? rawContact : `+${rawContact}`}`
        : "unknown";
    customerName = simple.customerName?.trim() || undefined;
    text = simple.text ?? "";
  }

  if (!contactId || contactId === "unknown" || contactId.includes("unknown")) {
    return new Response(JSON.stringify({ error: "Invalid or missing contactId/from" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventId = (body as { id?: string })?.id ?? `evt_${Date.now()}_${contactId}`;

  try {
    await ctx.runAction(anyApi.ycloudBot.processInboundMessage, {
      eventId,
      contactId,
      customerName,
      text,
      mediaUrl,
      mediaType,
    });
  } catch {
    return new Response(JSON.stringify({ ok: true, received: true, processed: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

http.route({
  path: "/webhooks/ycloud",
  method: "POST",
  handler: webhookYCloud,
});

export default http;
