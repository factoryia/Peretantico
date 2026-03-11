import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";
import type { Id } from "../../../_generated/dataModel";

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export const createRequest = createTool({
  description: "Crea una solicitud para un servicio con los datos validados y confirmados",
  args: jsonSchema<{
    applicantId: string;
    serviceId: string;
    title?: string;
    data: { fieldId: string; value: unknown }[];
    attachments?: { fileName: string; url: string; storageId?: string }[];
    paymentMethod?: string;
    isPrioritized?: boolean;
  }>({
    type: "object",
    properties: {
      applicantId: { type: "string", description: "ID del perfil (profiles)" },
      serviceId: { type: "string", description: "ID del servicio (services)" },
      title: { type: "string" },
      data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fieldId: { type: "string" },
            value: {},
          },
          required: ["fieldId", "value"],
          additionalProperties: false,
        },
      },
      attachments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fileName: { type: "string" },
            url: { type: "string" },
            storageId: { type: "string" },
          },
          required: ["fileName", "url"],
          additionalProperties: false,
        },
      },
      paymentMethod: { type: "string" },
      isPrioritized: { type: "boolean" },
    },
    required: ["applicantId", "serviceId", "data"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const service = (await ctx.runQuery(anyApi.services.get, {
      id: args.serviceId as Id<"services">,
    })) as
      | {
          fields?: Array<{
            _id: Id<"serviceFields">;
            name?: string;
            required?: boolean;
            status?: boolean;
          }>;
        }
      | null;
    if (!service) return { ok: false, message: "No encontré el servicio." };

    const requiredFields = (service.fields || []).filter((f) => f.status !== false && f.required === true);
    const provided = new Map<string, unknown>();
    for (const item of args.data || []) {
      const fid = String(item.fieldId ?? "").trim();
      if (!fid) continue;
      provided.set(fid, item.value);
    }

    const missing = requiredFields
      .filter((f) => !hasMeaningfulValue(provided.get(String(f._id))))
      .map((f) => String(f.name ?? ""));
    if (missing.length) {
      return {
        ok: false,
        message: `Faltan campos obligatorios: ${missing.join(", ")}.`,
        missingFields: missing,
      };
    }

    const requestId = await ctx.runMutation(anyApi.requests.create, {
      applicantId: args.applicantId as Id<"profiles">,
      serviceId: args.serviceId as Id<"services">,
      title: args.title,
      entryDate: Date.now(),
      data: (args.data || []).map((d) => ({ fieldId: d.fieldId as Id<"serviceFields">, value: d.value })),
      attachments: args.attachments || [],
      paymentMethod: args.paymentMethod,
      isPrioritized: args.isPrioritized,
    });

    const request = await ctx.runQuery(anyApi.requests.get, { id: requestId as Id<"requests"> });

    return {
      ok: true,
      requestId,
      applicationNumber: request?.applicationNumber,
    };
  },
});
