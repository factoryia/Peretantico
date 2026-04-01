import { afterEach, describe, expect, it, vi } from "vitest";
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

  return tool.execute.call({ ...(createRequest as object), ctx }, args, { toolCallId: "deterministic-flow", messages: [] });
}

const originalDeterministicFlag = process.env.ENABLE_DETERMINISTIC_REQUESTS;

afterEach(() => {
  process.env.ENABLE_DETERMINISTIC_REQUESTS = originalDeterministicFlag;
});

describe("deterministic request flow integration", () => {
  it("blocks migrated transfer requests until the receipt is attached", async () => {
    process.env.ENABLE_DETERMINISTIC_REQUESTS = "true";

    const ctx = {
      runQuery: vi.fn().mockImplementation((_: unknown, queryArgs: { id?: string; contactId?: string }) => {
        if (queryArgs?.id === "service_transfer") {
          return Promise.resolve({
            workflowMode: "deterministic",
            workflowConfig: { requirePaymentMethod: true },
            price: 10000,
            fields: [{ _id: "field_required", name: "Documento", type: "Text", required: true, status: true }],
          });
        }
        if (queryArgs?.id === "profile_1") {
          return Promise.resolve({ _id: "profile_1", address: "Calle 1" });
        }
        if (queryArgs?.contactId) {
          return Promise.resolve({ _id: "session_1", data: { flow: {} } });
        }
        return Promise.resolve(null);
      }),
      runMutation: vi.fn().mockResolvedValue({}),
      storage: {
        store: async () => "storage_x",
        getUrl: async () => "https://storage.local/storage_x",
      },
    };

    const result = (await invokeCreateRequest(ctx, {
      contactId: "whatsapp:+573001234567",
      applicantId: "profile_1",
      serviceId: "service_transfer",
      data: [{ fieldId: "field_required", value: "ok" }],
      paymentMethod: "transfer",
      address: "Carrera 10 # 20-30",
      attachments: [],
    })) as { ok: boolean; message?: string };

    expect(result.ok).toBe(false);
    expect(result.message).toContain("debes adjuntar el comprobante");
  });

  it("returns final confirmation with request code after migrated flow is satisfied", async () => {
    process.env.ENABLE_DETERMINISTIC_REQUESTS = "true";
    let createdPayload: Record<string, unknown> | null = null;

    const ctx = {
      runQuery: vi.fn().mockImplementation((_: unknown, queryArgs: { id?: string; contactId?: string }) => {
        if (queryArgs?.id === "service_transfer") {
          return Promise.resolve({
            workflowMode: "deterministic",
            workflowConfig: { requirePaymentMethod: true },
            price: 10000,
            fields: [{ _id: "field_required", name: "Documento", type: "Text", required: true, status: true }],
          });
        }
        if (queryArgs?.id === "profile_1") {
          return Promise.resolve({ _id: "profile_1", address: "Calle 1" });
        }
        if (queryArgs?.contactId) {
          return Promise.resolve({ _id: "session_1", data: { flow: {} } });
        }
        if (queryArgs?.id === "request_created") {
          return Promise.resolve({ applicationNumber: "REQ-777777" });
        }
        return Promise.resolve(null);
      }),
      runMutation: vi.fn().mockImplementation((_: unknown, mutationArgs: Record<string, unknown>) => {
        if (mutationArgs?.applicationNumber) {
          createdPayload = mutationArgs;
          return Promise.resolve({ requestId: "request_created", applicationNumber: "REQ-777777" });
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
      serviceId: "service_transfer",
      data: [{ fieldId: "field_required", value: "ok" }],
      paymentMethod: "transfer",
      address: "Carrera 10 # 20-30",
      attachments: [{ fileName: "comprobante.pdf", url: "https://example.com/comprobante.pdf", storageId: "receipt_1" }],
    })) as {
      ok: boolean;
      applicationNumber?: string;
      completion?: { message?: string };
    };

    expect(result.ok).toBe(true);
    expect(result.applicationNumber).toBe("REQ-777777");
    expect(result.completion?.message).toContain("REQ-777777");
    expect(createdPayload).toMatchObject({
      addressSnapshot: { raw: "Carrera 10 # 20-30" },
      paymentStatus: "pending_admin_validation",
      adminValidationStatus: "pending",
    });
  });

  it("falls back to legacy creation immediately when the backend kill switch is off", async () => {
    process.env.ENABLE_DETERMINISTIC_REQUESTS = "false";
    let createdPayload: Record<string, unknown> | null = null;

    const ctx = {
      runQuery: vi.fn().mockImplementation((_: unknown, queryArgs: { id?: string; contactId?: string }) => {
        if (queryArgs?.id === "service_transfer") {
          return Promise.resolve({
            workflowMode: "deterministic",
            workflowConfig: { requirePaymentMethod: true },
            price: 10000,
            fields: [{ _id: "field_required", name: "Documento", type: "Text", required: true, status: true }],
          });
        }
        if (queryArgs?.contactId) {
          return Promise.resolve({ _id: "session_1", data: { flow: {} } });
        }
        if (queryArgs?.id === "request_created") {
          return Promise.resolve({ applicationNumber: "REQ-333333" });
        }
        return Promise.resolve(null);
      }),
      runMutation: vi.fn().mockImplementation((_: unknown, mutationArgs: Record<string, unknown>) => {
        if (mutationArgs?.applicationNumber) {
          createdPayload = mutationArgs;
          return Promise.resolve({ requestId: "request_created", applicationNumber: "REQ-333333" });
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
      serviceId: "service_transfer",
      data: [{ fieldId: "field_required", value: "ok" }],
      paymentMethod: "transfer",
      attachments: [],
    })) as { ok: boolean; applicationNumber?: string };

    expect(result.ok).toBe(true);
    expect(result.applicationNumber).toBe("REQ-333333");
    expect(createdPayload).not.toBeNull();
    expect(createdPayload?.["addressSnapshot"]).toBeUndefined();
    expect(createdPayload?.["paymentStatus"]).toBeUndefined();
    expect(createdPayload?.["adminValidationStatus"]).toBeUndefined();
  });
});
