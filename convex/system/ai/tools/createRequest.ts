import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";
import { components } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import { buildRequestCompletionMessage } from "../requestCompletion";

export function buildCompletionThreadTitles(args: {
  contactId: string;
  applicationNumber?: string;
}): { closedThreadTitle: string; nextActiveThreadTitle: string } {
  const safeContact = args.contactId.trim();
  const reqLabel = args.applicationNumber?.trim() || "nueva solicitud";
  return {
    closedThreadTitle: `WhatsApp ${safeContact} (${reqLabel})`,
    nextActiveThreadTitle: `WhatsApp ${safeContact}`,
  };
}

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
    applicant?: unknown;
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
      applicant: { description: "No se usa: el perfil debe crearse por separado" },
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

    if (!applicantId) {
      const applicantArg =
        typeof args.applicant === "object" && args.applicant !== null ? (args.applicant as Record<string, unknown>) : null;
      const argFullName = applicantArg?.fullName
        ? String(applicantArg.fullName).trim()
        : applicantArg?.name
          ? String(applicantArg.name).trim()
          : "";
      const argDocType = applicantArg?.documentType ? String(applicantArg.documentType).trim() : "";
      const argDocNumber = applicantArg?.documentNumber ? String(applicantArg.documentNumber).trim() : "";
      const argEmail = applicantArg?.email ? String(applicantArg.email).trim() : undefined;
      const argAddress = applicantArg?.address ? String(applicantArg.address).trim() : undefined;

      if (phoneNumber && argFullName && argDocType && argDocNumber) {
        const byDoc = await ctx.runQuery(anyApi.profiles.findByDocumentNumber, {
          documentNumber: argDocNumber,
        });
        if (byDoc?._id) {
          applicantId = byDoc._id as Id<"profiles">;
        } else {
          const byPhone = await ctx.runQuery(anyApi.profiles.findByPhoneNumber, { phoneNumber });
          if (byPhone?._id) {
            applicantId = byPhone._id as Id<"profiles">;
          } else {
            applicantId = (await ctx.runMutation(anyApi.profiles.createCustomer, {
              fullName: argFullName,
              documentType: argDocType,
              documentNumber: argDocNumber,
              phoneNumber,
              email: argEmail || undefined,
              address: argAddress || undefined,
            })) as Id<"profiles">;
          }
        }

        if (applicantId && contactId) {
          await ctx.runMutation(anyApi.whatsappBotState.ensureApplicant, {
            contactId,
            phoneNumber,
            customerName: argFullName,
          });

          const existingApplicant = (await ctx.runQuery(anyApi.whatsappBotState.getApplicantByContact, { contactId })) as
            | { _id: Id<"botApplicants"> }
            | null;
          if (existingApplicant?._id) {
            await ctx.runMutation(anyApi.whatsappBotState.patchApplicant, {
              id: existingApplicant._id,
              fullName: argFullName,
              documentType: argDocType,
              documentNumber: argDocNumber,
              email: argEmail || undefined,
              address: argAddress || undefined,
              profileId: applicantId,
              state: "HAS_PROFILE",
            });
          }
          await ctx.runMutation(anyApi.whatsappBotState.ensureSession, { contactId, profileId: applicantId });
        }
      }

      const applicant = contactId
        ? ((await ctx.runQuery(anyApi.whatsappBotState.getApplicantByContact, { contactId })) as
            | {
                _id?: Id<"botApplicants">;
                fullName?: string;
                documentType?: string;
                documentNumber?: string;
                phoneNumber?: string;
                email?: string;
                address?: string;
                profileId?: Id<"profiles"> | null;
              }
            | null)
        : null;

      const candidatePhone = (phoneNumber || applicant?.phoneNumber || "").trim();
      const candidateFullName = (applicant?.fullName ?? "").trim();
      const candidateDocType = (applicant?.documentType ?? "").trim();
      const candidateDocNumber = (applicant?.documentNumber ?? "").trim();

      const canCreateProfile = Boolean(candidatePhone && candidateFullName && candidateDocType && candidateDocNumber);

      if (canCreateProfile) {
        const byDoc = await ctx.runQuery(anyApi.profiles.findByDocumentNumber, {
          documentNumber: candidateDocNumber,
        });
        if (byDoc?._id) {
          applicantId = byDoc._id as Id<"profiles">;
        } else {
          const byPhone = await ctx.runQuery(anyApi.profiles.findByPhoneNumber, { phoneNumber: candidatePhone });
          if (byPhone?._id) {
            applicantId = byPhone._id as Id<"profiles">;
          } else {
            applicantId = (await ctx.runMutation(anyApi.profiles.createCustomer, {
              fullName: candidateFullName,
              documentType: candidateDocType,
              documentNumber: candidateDocNumber,
              phoneNumber: candidatePhone,
              email: applicant?.email?.trim() || undefined,
              address: applicant?.address?.trim() || undefined,
            })) as Id<"profiles">;
          }
        }

        if (applicantId && contactId) {
          await ctx.runMutation(anyApi.whatsappBotState.ensureSession, { contactId, profileId: applicantId });
          if (applicant?._id) {
            await ctx.runMutation(anyApi.whatsappBotState.patchApplicant, {
              id: applicant._id,
              profileId: applicantId,
              state: "HAS_PROFILE",
            });
          }
        }
      }

      if (!applicantId) {
        return {
          ok: false,
          message:
            "Antes de crear la solicitud necesito que tu perfil esté registrado. Dime tu nombre completo, tipo y número de documento.",
          missingApplicant: true,
        };
      }
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
          price?: number;
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
    const activeFields = (service.fields || []).filter((f) => f.status !== false);
    const provided = new Map<string, unknown>();
    for (const item of args.data || []) {
      const fid = String(item.fieldId ?? "").trim();
      if (!fid) continue;
      provided.set(fid, item.value);
    }
    const hasAnyMeaningful = (args.data || []).some((item) => hasMeaningfulValue(item.value));
    if (activeFields.length > 0 && !hasAnyMeaningful) {
      const first = activeFields[0];
      return {
        ok: false,
        message: `Antes de crear la solicitud necesito al menos un dato del servicio. Empecemos con "${String(first?.name ?? "el primer campo")}".`,
        missingFields: [String(first?.name ?? "Campo")],
      };
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

    const baseServicePrice = typeof service.price === "number" ? service.price : 0;

    // Generate applicationNumber before mutation so it can be passed and returned
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const generatedApplicationNumber = `REQ-${randomDigits}`;

    const createdRequest = await ctx.runMutation(anyApi.requests.create, {
      applicantId,
      serviceId: args.serviceId as Id<"services">,
      title: args.title,
      entryDate: Date.now(),
      data: normalizedData.map((d) => ({ fieldId: d.fieldId as Id<"serviceFields">, value: d.value })),
      attachments: normalizedAttachments,
      paymentMethod: args.paymentMethod,
      isPrioritized: args.isPrioritized,
      serviceValue: baseServicePrice,
      // Pass applicationNumber so mutation returns it in response
      applicationNumber: generatedApplicationNumber,
    });

    const requestId = typeof createdRequest === 'object' && createdRequest !== null 
      ? (createdRequest as { requestId: Id<"requests"> }).requestId 
      : createdRequest as Id<"requests">;
    
    const applicationNumberFromCreate = typeof createdRequest === 'object' && createdRequest !== null
      ? (createdRequest as { applicationNumber?: string }).applicationNumber
      : generatedApplicationNumber;

    const request = await ctx.runQuery(anyApi.requests.get, { id: requestId });
    
    // Use applicationNumber from create mutation response, fallback to generated or query result
    const applicationNumber = applicationNumberFromCreate || request?.applicationNumber;

    // NEW POLICY: No thread rotation. Just reset session state for clean context.
    // Keep profileId for identity continuity.
    let completion:
      | {
          closeConversation: boolean;
          message: string;
          newThreadId?: string;
          closureApplied: boolean;
          contextRestarted?: boolean;
          softReset: boolean;
        }
      | undefined;

    if (contactId) {
      // Soft reset: just indicate the session state should be cleared
      // No thread creation, no thread closure - keeps context simple
      completion = {
        closeConversation: false,
        message: buildRequestCompletionMessage({
          applicationNumber,
          contextRestarted: false,
        }),
        closureApplied: false,
        contextRestarted: false,
        softReset: true,
      };
    }

    return {
      ok: true,
      requestId,
      applicationNumber,
      completion,
    };
  },
});
