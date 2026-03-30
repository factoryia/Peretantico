import { describe, expect, it, vi } from "vitest";
import { buildCompletionThreadTitles, createRequest } from "../../convex/system/ai/tools/createRequest";

/**
 * Test harness to invoke createRequest tool with mocked Convex context.
 * Uses direct function pattern for Convex queries/mutations.
 */
async function invokeCreateRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>
) {
  const tool = createRequest as unknown as {
    execute: (args: unknown, options: unknown) => Promise<unknown>;
  };

  return tool.execute.call(
    { ...(createRequest as object), ctx },
    args,
    { toolCallId: "test-call", messages: [] }
  );
}

describe("createRequest tool", () => {
  it("builds thread titles so closed thread keeps REQ and next thread is clean", () => {
    const titles = buildCompletionThreadTitles({
      contactId: "whatsapp:+573001234567",
      applicationNumber: "REQ-123456",
    });

    expect(titles.closedThreadTitle).toBe("WhatsApp whatsapp:+573001234567 (REQ-123456)");
    expect(titles.nextActiveThreadTitle).toBe("WhatsApp whatsapp:+573001234567");
  });

  it("blocks request creation when required field is missing", async () => {
    const testServiceId = "service_test";
    const requiredFieldId = "field_required";

    const ctx = {
      runQuery: vi.fn().mockImplementation((queryFn: ReturnType<typeof vi.fn>, queryArgs: { id?: string }) => {
        if (queryArgs?.id === testServiceId) {
          return Promise.resolve({
            price: 10000,
            fields: [
              { _id: requiredFieldId, name: "Required Field", type: "Text", required: true, status: true },
            ],
          });
        }
        return Promise.resolve(null);
      }),
      runMutation: vi.fn().mockImplementation(() => {
        throw new Error("should not create request when required field is missing");
      }),
      storage: {
        store: async () => "storage_x",
        getUrl: async () => "https://storage.local/storage_x",
      },
    };

    const result = (await invokeCreateRequest(ctx, {
      applicantId: "profile_1",
      serviceId: testServiceId,
      data: [], // Missing required field
    })) as { ok: boolean; message?: string; missingFields?: string[] };

    expect(result.ok).toBe(false);
  });

  describe("thread closure and rotation on request creation", () => {
    const serviceId = "service_test";
    const contactId = "whatsapp:+573001234567";
    const applicantId = "profile_test123";
    const fieldId = "field_test";

    /**
     * TDD RED TEST - BUG REPRODUCTION:
     * 
     * When createRequest is called WITHOUT an existing thread (threadId is undefined),
     * the tool should NOT claim that a conversation was closed or restarted.
     * 
     * Expected behavior:
     * - closureApplied should be FALSE (no thread existed to close)
     * - closeConversation should be FALSE (nothing was closed)
     * - contextRestarted should be FALSE (no context to restart)
     * 
     * Current buggy behavior:
     * - Returns closureApplied=true and closeConversation=true even when 
     *   there's no thread to close
     */
    it("should NOT claim closure/restart when no thread exists to close", async () => {
      const serviceMock = {
        price: 50000,
        fields: [
          { _id: fieldId, name: "Test Field", type: "Text", required: true, status: true },
        ],
      };

      const ctx = {
        runQuery: vi.fn().mockImplementation((queryFn: ReturnType<typeof vi.fn>, queryArgs: { id?: string }) => {
          if (queryArgs?.id === serviceId) {
            return Promise.resolve(serviceMock);
          }
          return Promise.resolve(null);
        }),
        runMutation: vi.fn().mockImplementation((mutationFn: ReturnType<typeof vi.fn>, mutationArgs: unknown) => {
          const args = mutationArgs as { title?: string; userId?: string; threadId?: string; patch?: { title?: string }; applicationNumber?: string };
          
          if (args?.applicationNumber) {
            return Promise.resolve({ _id: "request_123", applicationNumber: "REQ-999999" });
          }
          
          // Track thread operations
          if (args?.title && args?.userId) {
            return Promise.resolve({ _id: "thread_new_123" });
          }
          
          return Promise.resolve({});
        }),
        storage: {
          store: async () => "storage_test",
          getUrl: async () => "https://storage.local/test",
        },
        // CRITICAL: No threadId in context - no thread exists to close
        threadId: undefined,
      };

      const result = (await invokeCreateRequest(ctx, {
        contactId,
        applicantId,
        serviceId,
        data: [{ fieldId, value: "test value" }],
      })) as {
        ok: boolean;
        completion?: {
          closeConversation: boolean;
          closureApplied: boolean;
          newThreadId?: string;
          contextRestarted?: boolean;
        };
      };

      expect(result.ok).toBe(true);
      expect(result.completion).toBeDefined();

      // === TDD RED: These assertions express CORRECT expected behavior ===
      // They will FAIL against the current buggy implementation
      
      // When there's no thread to close, closureApplied must be FALSE
      expect(result.completion!.closureApplied).toBe(false);
      
      // When nothing was closed, closeConversation must be FALSE
      expect(result.completion!.closeConversation).toBe(false);
      
      // Context was NOT restarted - new thread was created fresh
      expect(result.completion!.contextRestarted).toBe(false);
    });

    /**
     * TDD RED TEST - BUG #2:
     * 
     * When closing an existing thread, the title MUST include the actual
     * application number (e.g., "REQ-888888"), NOT the placeholder 
     * "nueva solicitud".
     * 
     * The bug: buildCompletionThreadTitles is called with request?.applicationNumber
     * but the request query returns the old state before the mutation completes.
     */
    it("should include actual application number in closed thread title", async () => {
      const existingThreadId = "thread_existing_456";
      const expectedAppNumber = "REQ-888888";

      const serviceMock = {
        price: 30000,
        fields: [
          { _id: fieldId, name: "Test Field", type: "Text", required: true, status: true },
        ],
      };

      const threadUpdateTitles: string[] = [];

      const ctx = {
        runQuery: vi.fn().mockImplementation((queryFn: ReturnType<typeof vi.fn>, queryArgs: { id?: string }) => {
          if (queryArgs?.id === serviceId) {
            return Promise.resolve(serviceMock);
          }
          // Mock requests.get to return the application number
          if (queryArgs?.id === "request_created") {
            return Promise.resolve({ applicationNumber: expectedAppNumber });
          }
          return Promise.resolve(null);
        }),
        runMutation: vi.fn().mockImplementation((mutationFn: ReturnType<typeof vi.fn>, mutationArgs: unknown) => {
          const args = mutationArgs as { title?: string; userId?: string; threadId?: string; patch?: { title?: string }; applicationNumber?: string; id?: string };
          
          // When creating request, return with ID that we can query
          if (args?.applicationNumber) {
            return Promise.resolve({ _id: "request_created", applicationNumber: expectedAppNumber });
          }
          
          // Track thread update title
          if (args?.patch?.title) {
            threadUpdateTitles.push(args.patch.title);
            return Promise.resolve({});
          }
          
          if (args?.title && args?.userId) {
            return Promise.resolve({ _id: "thread_new_789" });
          }
          
          return Promise.resolve({});
        }),
        storage: {
          store: async () => "storage_test",
          getUrl: async () => "https://storage.local/test",
        },
        threadId: existingThreadId,
      };

      const result = (await invokeCreateRequest(ctx, {
        contactId,
        applicantId,
        serviceId,
        data: [{ fieldId, value: "test value" }],
      })) as { ok: boolean; applicationNumber?: string };

      expect(result.ok).toBe(true);

      // === TDD RED: This assertion expresses CORRECT expected behavior ===
      // It will FAIL against the current buggy implementation
      
      // Thread title MUST contain the actual application number, not placeholder
      expect(threadUpdateTitles[0]).toBe(`WhatsApp whatsapp:+573001234567 (${expectedAppNumber})`);
    });

    /**
     * TDD RED TEST - BUG #3:
     * 
     * When thread creation fails, contextRestarted MUST be explicitly set to FALSE,
     * not left as undefined.
     * 
     * The bug: In the catch block, contextRestarted is not included in the completion
     * object, resulting in undefined. ycloudBot.ts checks this value to determine
     * what message to show to the user.
     */
    it("should explicitly set contextRestarted to false when thread creation fails", async () => {
      const existingThreadId = "thread_existing_456";

      const serviceMock = {
        price: 25000,
        fields: [
          { _id: fieldId, name: "Test Field", type: "Text", required: true, status: true },
        ],
      };

      const ctx = {
        runQuery: vi.fn().mockImplementation((queryFn: ReturnType<typeof vi.fn>, queryArgs: { id?: string }) => {
          if (queryArgs?.id === serviceId) {
            return Promise.resolve(serviceMock);
          }
          return Promise.resolve(null);
        }),
        runMutation: vi.fn().mockImplementation((mutationFn: ReturnType<typeof vi.fn>, mutationArgs: unknown) => {
          const args = mutationArgs as { title?: string; userId?: string; applicationNumber?: string };
          
          if (args?.applicationNumber) {
            return Promise.resolve({ _id: "request_456", applicationNumber: "REQ-777777" });
          }
          
          // Thread creation FAILS - this triggers the catch block
          if (args?.title && args?.userId) {
            return Promise.reject(new Error("Convex Agent API error"));
          }
          
          return Promise.resolve({});
        }),
        storage: {
          store: async () => "storage_test",
          getUrl: async () => "https://storage.local/test",
        },
        threadId: existingThreadId,
      };

      const result = (await invokeCreateRequest(ctx, {
        contactId,
        applicantId,
        serviceId,
        data: [{ fieldId, value: "test value" }],
      })) as {
        ok: boolean;
        completion?: {
          closeConversation: boolean;
          closureApplied: boolean;
          contextRestarted?: boolean;
        };
      };

      expect(result.ok).toBe(true);

      // === TDD RED: These assertions express CORRECT expected behavior ===
      // They will FAIL against the current buggy implementation
      
      // When thread creation fails, the old thread wasn't properly closed
      expect(result.completion!.closureApplied).toBe(false);
      
      // contextRestarted must be explicitly FALSE, not undefined
      expect(result.completion!.contextRestarted).toBe(false);
      // Verify it's explicitly set (not just falsy/undefined)
      expect(result.completion!.contextRestarted).not.toBeUndefined();
    });
  });
});
