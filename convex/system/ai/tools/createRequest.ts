import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";
import type { Id } from "../../../_generated/dataModel";

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

async function downloadAndStoreUrl(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">>; getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  url: string,
  fileName?: string
): Promise<{ storageId: Id<"_storage">; url: string; fileName?: string } | null> {
  const headers: Record<string, string> = {};
  const apiKey = process.env.YCLOUD_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(url, { headers });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? undefined;
  const arrayBuffer = await res.arrayBuffer();
  const blob = new Blob([arrayBuffer], contentType ? { type: contentType } : undefined);
  const storageId = await ctx.storage.store(blob);
  const storedUrl = await ctx.storage.getUrl(storageId);
  if (!storedUrl) return null;
  return { storageId, url: storedUrl, fileName };
}

export const createRequest = createTool({
  description: "Crea una solicitud para un servicio con los datos validados y confirmados",
  args: jsonSchema<{
    contactId?: string;
    phoneNumber?: string;
    applicantId?: string;
    applicant?: {
      fullName: string;
      documentType: string;
      documentNumber: string;
      phoneNumber: string;
      email?: string;
      address?: string;
      department?: string;
      municipality?: string;
      birthDate?: string;
      gender?: string;
    };
    serviceId: string;
    title?: string;
    data: { fieldId: string; value: unknown }[];
    attachments?: { fileName: string; url: string; storageId?: string }[];
    paymentMethod?: string;
    isPrioritized?: boolean;
  }>({
    type: "object",
    properties: {
      contactId: { type: "string", description: "contactId del chat (whatsapp:...)" },
      phoneNumber: { type: "string", description: "Número de teléfono del usuario" },
      applicantId: { type: "string", description: "ID del perfil (profiles) si existe" },
      applicant: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          documentType: { type: "string" },
          documentNumber: { type: "string" },
          phoneNumber: { type: "string" },
          email: { type: "string" },
          address: { type: "string" },
          department: { type: "string" },
          municipality: { type: "string" },
          birthDate: { type: "string" },
          gender: { type: "string" },
        },
        required: ["fullName", "documentType", "documentNumber", "phoneNumber"],
        additionalProperties: false,
      },
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
    required: ["serviceId", "data"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const contactId = (args.contactId ?? "").trim();
    const phoneNumber = (args.phoneNumber ?? "").trim();

    const applicantIdRaw = (args.applicantId ?? "").trim();
    const invalidApplicantId =
      !applicantIdRaw ||
      applicantIdRaw === "null" ||
      applicantIdRaw === "undefined" ||
      applicantIdRaw === "false";
    let applicantId: Id<"profiles"> | null = invalidApplicantId ? null : (applicantIdRaw as Id<"profiles">);

    if (!applicantId && contactId) {
      const session = await ctx.runQuery(anyApi.whatsappBotState.getSessionByContact, { contactId });
      const sid = (session as { profileId?: Id<"profiles"> | undefined } | null)?.profileId;
      if (sid) applicantId = sid;
    }

    if (!applicantId && contactId) {
      const applicant = await ctx.runQuery(anyApi.whatsappBotState.getApplicantByContact, { contactId });
      const pid = (applicant as { profileId?: Id<"profiles"> | undefined } | null)?.profileId;
      if (pid) applicantId = pid;
    }

    if (!applicantId && phoneNumber) {
      const byPhone = await ctx.runQuery(anyApi.profiles.findByPhoneNumber, { phoneNumber });
      if (byPhone?._id) applicantId = byPhone._id as Id<"profiles">;
    }

    if (!applicantId && args.applicant) {
      const applicant = {
        fullName: args.applicant.fullName.trim(),
        documentType: args.applicant.documentType.trim(),
        documentNumber: args.applicant.documentNumber.trim(),
        phoneNumber: args.applicant.phoneNumber.trim(),
        email: args.applicant.email?.trim() || undefined,
        address: args.applicant.address?.trim() || undefined,
        department: args.applicant.department?.trim() || undefined,
        municipality: args.applicant.municipality?.trim() || undefined,
        birthDate: args.applicant.birthDate?.trim() || undefined,
        gender: args.applicant.gender?.trim() || undefined,
      };
      if (applicant.fullName && applicant.documentType && applicant.documentNumber && applicant.phoneNumber) {
        const byDoc = await ctx.runQuery(anyApi.profiles.findByDocumentNumber, {
          documentNumber: applicant.documentNumber,
        });
        if (byDoc?._id) {
          applicantId = byDoc._id as Id<"profiles">;
        } else {
          const byPhone = await ctx.runQuery(anyApi.profiles.findByPhoneNumber, {
            phoneNumber: applicant.phoneNumber,
          });
          if (byPhone?._id) {
            applicantId = byPhone._id as Id<"profiles">;
          } else {
            try {
              applicantId = (await ctx.runMutation(anyApi.profiles.createCustomer, applicant)) as Id<"profiles">;
            } catch {
              const existing = await ctx.runQuery(anyApi.profiles.findByDocumentNumber, {
                documentNumber: applicant.documentNumber,
              });
              if (existing?._id) applicantId = existing._id as Id<"profiles">;
            }
          }
        }
      }
    }

    if (!applicantId) {
      return {
        ok: false,
        message:
          "Antes de crear la solicitud necesito registrarte. Por favor indícame: nombre completo, tipo y número de documento, y confirma tu número de contacto.",
        missingApplicant: true,
      };
    }

    if (contactId) {
      await ctx.runMutation(anyApi.whatsappBotState.ensureSession, { contactId, profileId: applicantId });
      const row = await ctx.runQuery(anyApi.whatsappBotState.getApplicantByContact, { contactId });
      if (row?._id) {
        await ctx.runMutation(anyApi.whatsappBotState.patchApplicant, {
          id: row._id,
          profileId: applicantId,
          state: "HAS_PROFILE",
        });
      }
    }

    const service = (await ctx.runQuery(anyApi.services.get, {
      id: args.serviceId as Id<"services">,
    })) as
      | {
          fields?: Array<{
            _id: Id<"serviceFields">;
            name?: string;
            type?: string;
            required?: boolean;
            status?: boolean;
          }>;
        }
      | null;
    if (!service) return { ok: false, message: "No encontré el servicio." };

    const requiredFields = (service.fields || []).filter((f) => f.status !== false && f.required === true);
    const fieldTypeById = new Map<string, string>();
    const fieldNameById = new Map<string, string>();
    for (const f of service.fields || []) {
      fieldTypeById.set(String(f._id), String(f.type ?? "Text"));
      fieldNameById.set(String(f._id), String(f.name ?? ""));
    }
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

    const storageCtx = ctx as unknown as {
      storage: { store: (blob: Blob) => Promise<Id<"_storage">>; getUrl: (id: Id<"_storage">) => Promise<string | null> };
    };

    const normalizedData: { fieldId: string; value: unknown }[] = [];
    for (const item of args.data || []) {
      const fieldId = String(item.fieldId ?? "").trim();
      const value = item.value;
      const type = fieldTypeById.get(fieldId) ?? "Text";

      if (type === "File" && typeof value === "string" && isHttpUrl(value)) {
        const stored = await downloadAndStoreUrl(storageCtx, value);
        if (stored) {
          normalizedData.push({ fieldId, value: stored.storageId });
          continue;
        }
        return {
          ok: false,
          message: `No pude guardar el archivo para "${fieldNameById.get(fieldId) || "Archivo"}". Por favor reenvía el archivo.`,
        };
      }

      normalizedData.push({ fieldId, value });
    }

    const normalizedAttachments: { fileName: string; url: string; storageId?: string }[] = [];
    for (const a of args.attachments || []) {
      const url = String(a.url ?? "").trim();
      const fileName = String(a.fileName ?? "").trim();
      if (url && isHttpUrl(url)) {
        const stored = await downloadAndStoreUrl(storageCtx, url, fileName || undefined);
        if (stored) {
          normalizedAttachments.push({
            fileName: stored.fileName ?? (fileName || "Adjunto"),
            url: stored.url,
            storageId: String(stored.storageId),
          });
          continue;
        }
        return { ok: false, message: `No pude guardar el adjunto "${fileName || "Adjunto"}". Por favor reenvíalo.` };
      }
      normalizedAttachments.push({ fileName: fileName || "Adjunto", url, storageId: a.storageId });
    }

    const requestId = await ctx.runMutation(anyApi.requests.create, {
      applicantId,
      serviceId: args.serviceId as Id<"services">,
      title: args.title,
      entryDate: Date.now(),
      data: normalizedData.map((d) => ({ fieldId: d.fieldId as Id<"serviceFields">, value: d.value })),
      attachments: normalizedAttachments,
      paymentMethod: args.paymentMethod,
      isPrioritized: args.isPrioritized,
    });

    const request = await ctx.runQuery(anyApi.requests.get, { id: requestId as Id<"requests"> });

    if (contactId) {
      const session = await ctx.runQuery(anyApi.whatsappBotState.getSessionByContact, { contactId });
      if (session?._id) {
        await ctx.runMutation(anyApi.whatsappBotState.patchSession, {
          id: session._id,
          serviceId: undefined,
          fieldIds: undefined,
          currentFieldIndex: undefined,
          data: {},
          attachments: [],
          state: "INIT",
        });
      }
    }

    return {
      ok: true,
      requestId,
      applicationNumber: request?.applicationNumber,
    };
  },
});
