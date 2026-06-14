import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";

export const escalateToHuman = createTool({
  description:
    "Escala la conversación a un asesor humano cuando no entiendes al usuario, hace una pregunta fuera del flujo que no puedes resolver, o no sabes cómo continuar. Silencia el bot y marca la conversación para que un asesor la atienda. Después de llamarla, envía el mensaje de escalamiento al usuario.",
  args: jsonSchema<{ contactId: string; reason?: string }>({
    type: "object",
    properties: {
      contactId: { type: "string", description: "contactId del chat (whatsapp:...)" },
      reason: { type: "string", description: "Motivo breve del escalamiento (para el asesor)" },
    },
    required: ["contactId"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const contactId = (args.contactId ?? "").trim();
    if (!contactId) return { ok: false, message: "Falta contactId para escalar." };

    await ctx.runMutation(anyApi.conversationState.escalateToHumanByContact, {
      contactId,
      reason: args.reason?.trim() || undefined,
    });

    return { ok: true, escalated: true };
  },
});
