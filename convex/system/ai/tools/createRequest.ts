import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";

import type { Id } from "../../../_generated/dataModel";
import { buildRequestCompletionMessage } from "../requestCompletion";
import { isDeterministicWorkflowEnabled, resolveRequestFlow } from "../../requestFlow";

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
    address?: string;
    updateProfileAddress?: boolean;
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
      address: { type: "string" },
      updateProfileAddress: { type: "boolean" },
      isPrioritized: { type: "boolean" },
    },
    required: ["serviceId", "data"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    // Validate required fields before processing
    const paymentMethod = (args.paymentMethod ?? "").trim().toLowerCase();
    const validPaymentMethods = ["efectivo", "transferencia", "contraentrega", "cash", "transfer", "card", "delivery"];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return {
        ok: false,
        message: "Antes de crear la solicitud, debes indicar el método de pago: efectivo, transferencia o contraentrega.",
        missingPaymentMethod: true,
      };
    }

    // Validate address is provided
    const address = (args.address ?? "").trim();
    if (!address) {
      return {
        ok: false,
        message: "Antes de crear la solicitud, necesito confirmar tu dirección de entrega. ¿Cuál es tu dirección y municipio?",
        missingAddress: true,
      };
    }

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
          hasPriority?: boolean;
          price?: number;
          priorityPrice?: number;
          estimatedHours?: number;
          priorityHours?: number;
          fields?: Array<{
            _id: Id<"serviceFields">;
            name?: string;
            type?: string;
            required?: boolean;
          status?: boolean;
          multiple?: boolean;
          settings?: unknown;
        }>;
          workflowMode?: string;
          workflowConfig?: unknown;
        }
      | null;
    if (!service) return { ok: false, message: "No encontré el servicio." };

    const session = contactId
      ? ((await ctx.runQuery(anyApi.whatsappBotState.getSessionByContact, { contactId })) as {
          _id: Id<"botSessions">;
          data?: { flow?: { branchKey?: string | null; addressConfirmed?: boolean; paymentDraft?: { method?: string | null } } };
        } | null)
      : null;

    const flowState = session?.data?.flow;
    const deterministicEnabled = isDeterministicWorkflowEnabled({
      workflowMode: service.workflowMode,
      workflowConfig: service.workflowConfig as Parameters<typeof resolveRequestFlow>[0]["workflowConfig"],
    });
    const allActiveFields = (service.fields || []).filter((f) => f.status !== false);
    const requiredFields = allActiveFields.filter((f) => f.required === true);
    const fieldTypeById = new Map<string, string>();
    const fieldNameById = new Map<string, string>();
    for (const f of service.fields || []) {
      fieldTypeById.set(String(f._id), String(f.type ?? "Text"));
      fieldNameById.set(String(f._id), String(f.name ?? ""));
    }
    const activeFields = allActiveFields;
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
    const normalizedAttachments: { fileName: string; url: string; storageId?: string; fieldId?: Id<"serviceFields">; kind?: string }[] = [];
    for (const item of args.data || []) {
      const fieldId = String(item.fieldId ?? "").trim();
      const value = item.value;

      // For File fields, the storageId should already be provided from validateServiceField
      // No need to download - just use the value as-is
      normalizedData.push({ fieldId, value });
    }

    for (const item of normalizedData) {
      const type = fieldTypeById.get(item.fieldId) ?? "Text";
      if (type !== "File") continue;
      const values = Array.isArray(item.value) ? item.value : [item.value];
      for (const storageId of values) {
        if (!storageId) continue;
        const url = await storageCtx.storage.getUrl(storageId as Id<"_storage">);
        if (!url) continue;
        normalizedAttachments.push({
          fieldId: item.fieldId as Id<"serviceFields">,
          kind: "service_field",
          fileName: fieldNameById.get(item.fieldId) || "Archivo",
          url,
          storageId: String(storageId),
        });
      }
    }

    const resolvedPaymentMethod = paymentMethod || flowState?.paymentDraft?.method || undefined;

    for (const a of args.attachments || []) {
      const url = String(a.url ?? "").trim();
      const fileName = String(a.fileName ?? "").trim();
      // Use storageId directly if provided - the file was already downloaded when message arrived
      if (a.storageId) {
        normalizedAttachments.push({
          fileName: fileName || "Adjunto",
          url: url || "",
          storageId: a.storageId,
          kind: deterministicEnabled && resolvedPaymentMethod === "transfer" ? "payment_receipt" : "evidence",
        });
        continue;
      }
      // No storageId and no URL - skip or error
      normalizedAttachments.push({
        fileName: fileName || "Adjunto",
        url: url || "",
        storageId: "",
        kind: deterministicEnabled && resolvedPaymentMethod === "transfer" ? "payment_receipt" : "evidence",
      });
    }

    const collectedData = Object.fromEntries(normalizedData.map((item) => [item.fieldId, item.value]));
    const profile = await ctx.runQuery(anyApi.profiles.get, { id: applicantId });
    const chosenAddress = (args.address ?? profile?.address ?? "").trim();

    const flow = resolveRequestFlow({
      workflowMode: service.workflowMode,
      workflowConfig: service.workflowConfig as Parameters<typeof resolveRequestFlow>[0]["workflowConfig"],
      fieldIds: activeFields.map((field) => String(field._id)),
      collectedData,
      branchKey: flowState?.branchKey ?? null,
      profileAddress: profile?.address ?? null,
      addressConfirmed: Boolean(chosenAddress),
      paymentMethod: resolvedPaymentMethod,
      receiptAttachmentIds: normalizedAttachments.filter((item) => item.kind === "payment_receipt").map((item) => item.storageId).filter(Boolean) as string[],
      adminValidationStatus: deterministicEnabled && resolvedPaymentMethod === "transfer" ? "pending" : "not_required",
    });

    if (flow.stage === "payment") {
      return { ok: false, message: "Antes de terminar, necesito que elijas un método de pago." };
    }

    if (flow.stage === "receipt") {
      return { ok: false, message: "Si el pago es por transferencia, debes adjuntar el comprobante." };
    }

    if (args.updateProfileAddress && chosenAddress && chosenAddress !== (profile?.address ?? "")) {
      await ctx.runMutation(anyApi.profiles.updateCustomer, {
        id: applicantId,
        address: chosenAddress,
      });
    }

    const baseServicePrice = typeof service.price === "number" ? service.price : 0;
    const prioritizedValue =
      args.isPrioritized && service.hasPriority
        ? typeof service.priorityPrice === "number"
          ? service.priorityPrice
          : baseServicePrice
        : undefined;
    const estimatedApplicationHour = typeof service.estimatedHours === "number" ? service.estimatedHours : undefined;
    const estimatedPrioritizedHour =
      args.isPrioritized && service.hasPriority && typeof service.priorityHours === "number"
        ? service.priorityHours
        : undefined;

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
      paymentMethod: resolvedPaymentMethod,
      addressSnapshot: deterministicEnabled && chosenAddress
        ? {
            raw: chosenAddress,
            source: chosenAddress === (profile?.address ?? "") ? "profile" : "user_edit",
            confirmedAt: Date.now(),
          }
        : undefined,
      flowStatus: deterministicEnabled ? flow.stage : undefined,
      paymentStatus: deterministicEnabled ? flow.paymentStatus : undefined,
      adminValidationStatus: deterministicEnabled ? flow.adminValidationStatus : undefined,
      isPrioritized: args.isPrioritized,
      serviceValue: baseServicePrice,
      prioritizedValue,
      estimatedApplicationHour,
      estimatedPrioritizedHour,
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

    if (contactId && session?._id) {
      await ctx.runMutation(anyApi.whatsappBotState.patchSession, {
        id: session!._id,
        data: {
          ...(session?.data ?? {}),
          flow: deterministicEnabled
            ? {
                ...(flowState ?? {}),
                stage: flow.stage,
                branchKey: flow.branchKey,
                pendingFieldIds: flow.pendingFieldIds,
                draftAddress: chosenAddress || undefined,
                paymentDraft: { method: resolvedPaymentMethod },
              }
            : undefined,
        },
      });

    }

    if (contactId) {
      completion = {
        closeConversation: false,
        message: buildRequestCompletionMessage({
          applicationNumber,
          contextRestarted: false,
          paymentMethod: resolvedPaymentMethod,
          address: chosenAddress || undefined,
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
