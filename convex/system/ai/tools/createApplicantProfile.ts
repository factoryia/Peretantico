import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";
import type { Id } from "../../../_generated/dataModel";

export const createApplicantProfile = createTool({
  description: "Crea o asocia el perfil del usuario al chat usando sus datos confirmados",
  args: jsonSchema<{
    contactId: string;
    phoneNumber: string;
    fullName: string;
    documentType: string;
    documentNumber: string;
    email?: string;
    address?: string;
  }>({
    type: "object",
    properties: {
      contactId: { type: "string" },
      phoneNumber: { type: "string" },
      fullName: { type: "string" },
      documentType: { type: "string" },
      documentNumber: { type: "string" },
      email: { type: "string" },
      address: { type: "string" },
    },
    required: ["contactId", "phoneNumber", "fullName", "documentType", "documentNumber"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const contactId = args.contactId.trim();
    const phoneNumber = args.phoneNumber.trim();
    const fullName = args.fullName.trim();
    const documentType = args.documentType.trim();
    const documentNumber = args.documentNumber.trim();
    const email = args.email?.trim() || undefined;
    const address = args.address?.trim() || undefined;

    if (!contactId || !phoneNumber || !fullName || !documentType || !documentNumber) {
      return { ok: false, message: "Faltan datos para crear el perfil." };
    }

    await ctx.runMutation(anyApi.whatsappBotState.ensureApplicant, {
      contactId,
      phoneNumber,
      customerName: fullName,
    });

    const applicant = (await ctx.runQuery(anyApi.whatsappBotState.getApplicantByContact, { contactId })) as
      | { _id: Id<"botApplicants">; profileId?: Id<"profiles"> | null }
      | null;
    if (!applicant?._id) return { ok: false, message: "No pude preparar el registro del usuario." };

    await ctx.runMutation(anyApi.whatsappBotState.patchApplicant, {
      id: applicant._id,
      fullName,
      documentType,
      documentNumber,
      email,
      address,
    });

    await ctx.runMutation(anyApi.whatsappBotState.ensureApplicant, {
      contactId,
      phoneNumber,
      customerName: fullName,
    });

    const refreshed = (await ctx.runQuery(anyApi.whatsappBotState.getApplicantByContact, { contactId })) as
      | { _id: Id<"botApplicants">; profileId?: Id<"profiles"> | null }
      | null;
    const profileId = refreshed?.profileId ? String(refreshed.profileId) : null;
    if (!profileId) {
      return {
        ok: false,
        message: "No pude crear o asociar el perfil todavía. Por favor intenta de nuevo.",
      };
    }

    await ctx.runMutation(anyApi.whatsappBotState.ensureSession, {
      contactId,
      profileId: profileId as unknown as Id<"profiles">,
    });

    return { ok: true, profileId };
  },
});
