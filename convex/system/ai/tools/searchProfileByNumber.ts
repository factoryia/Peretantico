import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";

function normalizePhoneDigits(input: string): string {
  return (input ?? "").replace(/[^\d+]/g, "").trim();
}

function phoneVariants(raw: string): string[] {
  const t = normalizePhoneDigits(raw);
  if (!t) return [];

  const noPlus = t.replace(/^\+/, "");
  const digitsOnly = noPlus.replace(/\D/g, "");

  const variants = new Set<string>();
  variants.add(t);
  variants.add(noPlus);
  if (digitsOnly) variants.add(digitsOnly);

  if (digitsOnly.length === 10 && digitsOnly.startsWith("3")) {
    variants.add(`+57${digitsOnly}`);
    variants.add(`57${digitsOnly}`);
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("57")) {
    variants.add(`+${digitsOnly}`);
    variants.add(digitsOnly.slice(2));
  }

  return Array.from(variants).filter(Boolean);
}

export const searchProfileByNumber = createTool({
  description: "Busca un perfil por número de teléfono y devuelve sus datos básicos",
  args: jsonSchema<{ phoneNumber?: string; documentNumber?: string }>({
    type: "object",
    properties: {
      phoneNumber: {
        type: "string",
        description: "Número de teléfono, con o sin +",
      },
      documentNumber: {
        type: "string",
        description: "Número de documento (si ya lo tienes a mano)",
      },
    },
    required: [],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const doc = (args.documentNumber ?? "").trim();
    if (doc) {
      const byDoc = await ctx.runQuery(anyApi.profiles.findByDocumentNumber, { documentNumber: doc });
      if (byDoc) {
        return {
          found: true,
          profile: {
            id: byDoc._id,
            fullName: byDoc.fullName,
            documentType: byDoc.documentType,
            documentNumber: byDoc.documentNumber,
            phoneNumber: byDoc.phoneNumber,
            email: byDoc.email,
            address: byDoc.address,
          },
        };
      }
    }

    const phone = (args.phoneNumber ?? "").trim();
    if (!phone) return { found: false, reason: "missing_phone_or_document" };

    let profile:
      | {
          _id: string;
          fullName: string;
          documentType: string;
          documentNumber: string;
          phoneNumber: string;
          email?: string;
          address?: string;
        }
      | null = null;
    for (const variant of phoneVariants(phone)) {
      profile = await ctx.runQuery(anyApi.profiles.findByPhoneNumber, { phoneNumber: variant });
      if (profile) break;
    }
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
