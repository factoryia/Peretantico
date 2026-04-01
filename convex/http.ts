
import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { anyApi } from "convex/server";

const http = httpRouter();

auth.addHttpRoutes(http);

function parseYCloudSignatureHeader(value: string): { timestamp: string; signature: string } | null {
  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  let timestamp: string | undefined;
  let signature: string | undefined;

  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    const key = (k ?? "").trim();
    const val = rest.join("=").trim();
    if (!key || !val) continue;
    if (key === "t") timestamp = val;
    if (key === "s" || key === "v1") signature = val;
  }

  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

function toHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let hex = "";
  for (const b of view) hex += b.toString(16).padStart(2, "0");
  return hex;
}

async function sha256Hex(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return toHex(digest);
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(sig);
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const webhookYCloud = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const ycloudSigHeader = request.headers.get("ycloud-signature")?.trim();
    let ycloudVerified = false;

    if (ycloudSigHeader) {
      const parsed = parseYCloudSignatureHeader(ycloudSigHeader);
      const toleranceSeconds = Number.parseInt(process.env.WEBHOOK_TOLERANCE_SECONDS || "300", 10);
      if (parsed) {
        const ts = Number.parseInt(parsed.timestamp, 10);
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (Number.isFinite(ts) && Math.abs(nowSeconds - ts) <= toleranceSeconds) {
          const signedPayload = `${parsed.timestamp}.${rawBody}`;
          const computed = await hmacSha256Hex(webhookSecret, signedPayload);
          ycloudVerified = secureEqual(computed, parsed.signature);
        }
      }
    }

    const headerSecret = request.headers.get("x-webhook-secret")?.trim();
    const authHeader = request.headers.get("authorization")?.trim();
    const bearerSecret =
      authHeader && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice("bearer ".length).trim()
        : undefined;
    const legacyVerified = headerSecret === webhookSecret || bearerSecret === webhookSecret;

    if (!ycloudVerified && !legacyVerified) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody) as unknown;
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
        image?: { id?: string; link?: string; caption?: string };
        video?: { id?: string; link?: string; caption?: string };
        audio?: { id?: string; link?: string };
        document?: { id?: string; link?: string; filename?: string; caption?: string };
        sticker?: { id?: string; link?: string };
        location?: unknown;
      }
    | undefined;

  let contactId: string;
  let customerName: string | undefined;
  let text: string;
  let mediaUrl: string | undefined;
  let mediaId: string | undefined;
  let mediaType: "image" | "video" | "audio" | "document" | undefined;
  let mediaFilename: string | undefined;

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
      mediaId = wim.image?.id;
      mediaType = "image";
      text = wim.image?.caption?.trim() ? wim.image.caption : "Imagen";
    } else if (wim.type === "video") {
      mediaUrl = wim.video?.link;
      mediaId = wim.video?.id;
      mediaType = "video";
      text = wim.video?.caption?.trim() ? wim.video.caption : "Video";
    } else if (wim.type === "audio") {
      mediaUrl = wim.audio?.link;
      mediaId = wim.audio?.id;
      mediaType = "audio";
      text = "Audio";
    } else if (wim.type === "document") {
      mediaUrl = wim.document?.link;
      mediaId = wim.document?.id;
      mediaType = "document";
      mediaFilename = wim.document?.filename?.trim() || undefined;
      text = wim.document?.caption?.trim() || wim.document?.filename || "Documento";
    } else if (wim.type === "sticker") {
      mediaUrl = wim.sticker?.link;
      mediaId = wim.sticker?.id;
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

  const providedId = (body as { id?: string })?.id?.trim();
  const eventId = providedId || `evt_${(await sha256Hex(rawBody)).slice(0, 24)}_${contactId}`;

  try {
    await ctx.scheduler.runAfter(0, anyApi.ycloudBot.processInboundMessage, {
      eventId,
      contactId,
      customerName,
      text,
      mediaUrl,
      mediaId,
      mediaType,
      mediaFilename,
      attempt: 0,
    });
  } catch {
    return new Response(JSON.stringify({ ok: true, received: true, scheduled: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, received: true, scheduled: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

http.route({
  path: "/webhooks/ycloud",
  method: "POST",
  handler: webhookYCloud,
});

const publicRequest = httpAction(async (ctx, request) => {
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const requestId = await ctx.runQuery(anyApi.whatsappBotState.getRequestIdByShareToken, { token });
  if (!requestId) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await ctx.runQuery(anyApi.requests.get, { id: requestId });
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

http.route({
  path: "/public/request",
  method: "GET",
  handler: publicRequest,
});

export default http;
