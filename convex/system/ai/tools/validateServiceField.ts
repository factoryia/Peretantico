import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";
import type { Id } from "../../../_generated/dataModel";

function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBoolean(raw: string): boolean | null {
  const t = normalizeForMatch(raw);
  if (!t) return null;
  if (t === "si" || t === "sí" || t === "s" || t === "yes" || t === "y" || t === "true") return true;
  if (t === "no" || t === "n" || t === "false") return false;
  return null;
}

function parseOptions(rawOptions: unknown): string[] {
  if (Array.isArray(rawOptions)) return rawOptions.map((x) => String(x)).filter(Boolean);
  if (typeof rawOptions === "string") {
    return rawOptions
      .split(/[\n,;]/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof rawOptions === "object" && rawOptions !== null && "items" in rawOptions) {
    const items = (rawOptions as { items?: unknown }).items;
    if (Array.isArray(items)) {
      const out: string[] = [];
      for (const item of items) {
        if (typeof item === "string") out.push(item);
        else if (typeof item === "number" || typeof item === "boolean") out.push(String(item));
        else if (typeof item === "object" && item !== null) {
          const maybe = item as { value?: unknown; label?: unknown };
          const v = typeof maybe.value === "string" ? maybe.value : undefined;
          const l = typeof maybe.label === "string" ? maybe.label : undefined;
          if (v) out.push(v);
          else if (l) out.push(l);
        }
      }
      return out.filter(Boolean);
    }
  }
  return [];
}

export const validateServiceField = createTool({
  description: "Valida y normaliza el valor de un campo de un servicio",
  args: jsonSchema<{ serviceId: string; fieldId: string; value: string; mediaUrl?: string; fileName?: string }>({
    type: "object",
    properties: {
      serviceId: { type: "string", description: "ID del servicio" },
      fieldId: { type: "string", description: "ID del campo del servicio" },
      value: { type: "string", description: "Valor en texto enviado por el usuario" },
      mediaUrl: { type: "string", description: "URL del archivo adjunto (si aplica)" },
      fileName: { type: "string", description: "Nombre del archivo adjunto (si aplica)" },
    },
    required: ["serviceId", "fieldId", "value"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const serviceId = args.serviceId.trim();
    const fieldId = args.fieldId.trim();
    const raw = (args.value ?? "").trim();
    const mediaUrl = (args.mediaUrl ?? "").trim();
    if (!serviceId || !fieldId) return { ok: false, message: "Falta serviceId o fieldId." };

    const service = (await ctx.runQuery(anyApi.services.get, {
      id: serviceId as Id<"services">,
    })) as
      | {
          fields?: Array<{
            _id: Id<"serviceFields">;
            name?: string;
            type?: string;
            required?: boolean;
            options?: unknown;
          }>;
        }
      | null;
    const field = (service?.fields || []).find((f) => String(f._id) === fieldId);
    if (!field) return { ok: false, message: "No encontré ese campo para el servicio." };

    const type = String(field.type ?? "Text");
    const required = Boolean(field.required);

    if (!raw) {
      if (required) return { ok: false, message: `El campo "${field.name}" es obligatorio.` };
      return { ok: true, normalizedValue: "" };
    }

    if (type === "Number") {
      const n = Number(raw.replace(",", "."));
      if (!Number.isFinite(n)) return { ok: false, message: `Para "${field.name}" necesito un número.` };
      return { ok: true, normalizedValue: n };
    }

    if (type === "Date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return { ok: false, message: `Para "${field.name}" necesito una fecha en formato AAAA-MM-DD.` };
      }
      return { ok: true, normalizedValue: raw };
    }

    if (type === "Boolean") {
      const b = parseBoolean(raw);
      if (b === null) return { ok: false, message: `Para "${field.name}" responda Sí o No.` };
      return { ok: true, normalizedValue: b };
    }

    if (type === "Select") {
      const options = parseOptions(field.options);
      if (options.length === 0) return { ok: true, normalizedValue: raw };
      const normRaw = normalizeForMatch(raw);
      const match = options.find((o) => normalizeForMatch(o) === normRaw) ?? null;
      if (match) return { ok: true, normalizedValue: match };
      return {
        ok: false,
        message: `Para "${field.name}", elija una opción válida: ${options.join(", ")}.`,
      };
    }

    if (type === "File") {
      if (mediaUrl) return { ok: true, normalizedValue: mediaUrl };
      if (/^https?:\/\//i.test(raw)) return { ok: true, normalizedValue: raw };
      return { ok: false, message: `Para "${field.name}", necesito que envíe el archivo.` };
    }

    return { ok: true, normalizedValue: raw };
  },
});
