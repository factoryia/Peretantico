import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";
import type { Id } from "../../../_generated/dataModel";
import { getApplicableFieldIds, isDeterministicWorkflowEnabled, resolveBranchKey } from "../../requestFlow";

function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const getServiceFields = createTool({
  description: "Obtiene los campos de un servicio. IMPORTANTE: Si el campo es tipo 'Select', incluye las 'options' disponibles que DEBES mostrar al usuario. También incluye 'description' para dar contexto.",
  args: jsonSchema<{ serviceId?: string; serviceName?: string; branchKey?: string; contactId?: string }>({
    type: "object",
    properties: {
      serviceId: { type: "string", description: "ID del servicio" },
      serviceName: { type: "string", description: "Nombre del servicio" },
      branchKey: { type: "string", description: "Branch explícito si ya fue resuelto" },
      contactId: { type: "string", description: "contactId para leer estado de sesión" },
    },
    required: [],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const all = (await ctx.runQuery(anyApi.services.listAll, {})) as Array<{
      _id: Id<"services">;
      name?: string;
      status?: boolean;
      price?: number;
      hasPriority?: boolean;
      priorityPrice?: number;
      estimatedHours?: number;
      priorityHours?: number;
      workflowMode?: string;
      workflowConfig?: { branches?: Array<{ key: string; label?: string; fieldIds?: string[] }> };
      fields?: Array<{
        _id: Id<"serviceFields">;
        name?: string;
        type?: string;
        required?: boolean;
        multiple?: boolean;
        options?: unknown;
        description?: string;
        code?: string;
        order?: number;
        status?: boolean;
        settings?: unknown;
      }>;
    }>;
    const services = (all || []).filter((s) => s.status !== false);

    const byId = args.serviceId?.trim()
      ? services.find((s) => String(s._id) === args.serviceId!.trim())
      : null;
    const byName = args.serviceName?.trim()
      ? services.find((s) => normalizeForMatch(String(s.name ?? "")) === normalizeForMatch(args.serviceName!))
      : null;
    const service = byId || byName;
    if (!service) return { found: false };
    const deterministicEnabled = isDeterministicWorkflowEnabled(service);

    let activeBranchKey = args.branchKey?.trim() || null;
    if (deterministicEnabled && !activeBranchKey && args.contactId?.trim()) {
      const session = (await ctx.runQuery(anyApi.whatsappBotState.getSessionByContact, {
        contactId: args.contactId.trim(),
      })) as { data?: { flow?: { branchKey?: string | null; collectedData?: Record<string, unknown> } } } | null;
      const flow = session?.data?.flow;
      activeBranchKey =
        flow?.branchKey ??
        resolveBranchKey({ workflowConfig: service.workflowConfig, collectedData: flow?.collectedData });
    }

    const allowedFieldIds = new Set(
      getApplicableFieldIds({
        workflowConfig: deterministicEnabled ? service.workflowConfig : undefined,
        fieldIds: (service.fields || []).map((field) => String(field._id)),
        branchKey: deterministicEnabled ? activeBranchKey : null,
      })
    );

    const fields = (service.fields || [])
      .filter((f) => f.status !== false)
      .filter((f) => allowedFieldIds.size === 0 || allowedFieldIds.has(String(f._id)))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((f) => ({
        id: String(f._id),
        name: String(f.name ?? ""),
        type: String(f.type ?? "Text"),
        required: Boolean(f.required),
        multiple: Boolean(f.multiple),
        options: f.options ?? undefined,
        description: f.description ?? undefined,
        code: f.code ?? undefined,
        settings: f.settings ?? undefined,
      }));

    return {
      found: true,
      service: {
        id: String(service._id),
        name: String(service.name ?? ""),
        price: service.price ?? undefined,
        hasPriority: service.hasPriority ?? false,
        priorityPrice: service.priorityPrice ?? undefined,
        estimatedHours: service.estimatedHours ?? undefined,
        priorityHours: service.priorityHours ?? undefined,
        workflowMode: deterministicEnabled ? "deterministic" : "legacy",
        workflowConfig: deterministicEnabled ? service.workflowConfig ?? undefined : undefined,
      },
      branchKey: deterministicEnabled ? activeBranchKey : null,
      fields,
    };
  },
});
