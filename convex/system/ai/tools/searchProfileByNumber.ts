import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";

export const searchProfileByNumber = createTool({
  description: "Busca un perfil por número de teléfono y devuelve sus datos básicos",
  args: jsonSchema<{ phoneNumber: string }>({
    type: "object",
    properties: {
      phoneNumber: {
        type: "string",
        description: "Número de teléfono, con o sin +",
      },
    },
    required: ["phoneNumber"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const phone = (args.phoneNumber ?? "").trim();
    if (!phone) return { found: false, reason: "phone_empty" };

    const profile = await ctx.runQuery(anyApi.profiles.findByPhoneNumber, {
      phoneNumber: phone,
    });
    if (!profile) return { found: false };

    return {
      found: true,
      profile: {
        id: profile._id,
        fullName: profile.fullName,
        documentType: profile.documentType,
        documentNumber: profile.documentNumber,
        phoneNumber: profile.phoneNumber,
        email: profile.email,
        address: profile.address,
      },
    };
  },
});
