import { describe, expect, it, vi } from "vitest";
import { buildPriorityQuestion, buildServicesListReply } from "../../convex/ycloudBot.helpers";
import { createRequest } from "../../convex/system/ai/tools/createRequest";

async function invokeCreateRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>
) {
  const tool = createRequest as unknown as {
    execute: (args: unknown, options: unknown) => Promise<unknown>;
  };

  return tool.execute.call({ ...(createRequest as object), ctx }, args, { toolCallId: "priority-flow", messages: [] });
}

describe("chat priority flow integration", () => {
  it("shows both prices, asks for priority, and persists prioritized request values", async () => {
    const service = {
      name: "Solicitud de Medicamentos",
      status: true,
      price: 40000,
      hasPriority: true,
      priorityPrice: 100000,
    };

    const servicesReply = buildServicesListReply([
      { name: "Partida de Matrimonio", status: true, price: 35000 },
      service,
    ]);

    expect(servicesReply).toContain("Solicitud de Medicamentos - normal $40.000 | prioritario $100.000");

    const priorityQuestion = buildPriorityQuestion(service);

    expect(priorityQuestion).toContain("valor normal $40.000");
    expect(priorityQuestion).toContain("valor prioritario $100.000");
    expect(priorityQuestion).toContain("¿Deseas radicarlo como prioridad? Responde sí o no.");

    const fieldId = "field_eps";
    let createdPayload: Record<string, unknown> | null = null;

    const ctx = {
      runQuery: vi.fn().mockImplementation((queryFn: ReturnType<typeof vi.fn>, queryArgs: { id?: string }) => {
        if (queryArgs?.id === "service_medications") {
          return Promise.resolve({
            price: 40000,
            hasPriority: true,
            priorityPrice: 100000,
            estimatedHours: 24,
            priorityHours: 8,
            fields: [{ _id: fieldId, name: "EPS", type: "Text", required: true, status: true }],
          });
        }

        if (queryArgs?.id === "request_priority_created") {
          return Promise.resolve({ applicationNumber: "REQ-700001" });
        }

        return Promise.resolve(null);
      }),
      runMutation: vi.fn().mockImplementation((mutationFn: ReturnType<typeof vi.fn>, mutationArgs: Record<string, unknown>) => {
        if (mutationArgs?.applicationNumber) {
          createdPayload = mutationArgs;
          return Promise.resolve({ requestId: "request_priority_created", applicationNumber: "REQ-700001" });
        }

        return Promise.resolve({});
      }),
      storage: {
        store: async () => "storage_x",
        getUrl: async () => "https://storage.local/storage_x",
      },
    };

    const result = (await invokeCreateRequest(ctx, {
      contactId: "whatsapp:+573001234567",
      applicantId: "profile_1",
      serviceId: "service_medications",
      isPrioritized: true,
      data: [{ fieldId, value: "Capitan Medicina" }],
    })) as { ok: boolean; applicationNumber?: string };

    expect(result.ok).toBe(true);
    expect(result.applicationNumber).toBe("REQ-700001");
    expect(createdPayload).toMatchObject({
      isPrioritized: true,
      serviceValue: 40000,
      prioritizedValue: 100000,
      estimatedApplicationHour: 24,
      estimatedPrioritizedHour: 8,
    });
  });
});
