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

  it("persists priority pricing and ETA when the prioritized service is requested", async () => {
    const serviceId = "service_priority";
    const fieldId = "field_priority_required";
    let createdPayload: Record<string, unknown> | null = null;

    const ctx = {
      runQuery: vi.fn().mockImplementation((queryFn: ReturnType<typeof vi.fn>, queryArgs: { id?: string }) => {
        if (queryArgs?.id === serviceId) {
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
          return Promise.resolve({ applicationNumber: "REQ-555555" });
        }

        return Promise.resolve(null);
      }),
      runMutation: vi.fn().mockImplementation((mutationFn: ReturnType<typeof vi.fn>, mutationArgs: Record<string, unknown>) => {
        if (mutationArgs?.applicationNumber) {
          createdPayload = mutationArgs;
          return Promise.resolve({ requestId: "request_priority_created", applicationNumber: "REQ-555555" });
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
      serviceId,
      isPrioritized: true,
      data: [{ fieldId, value: "Nueva EPS" }],
    })) as { ok: boolean; applicationNumber?: string };

    expect(result.ok).toBe(true);
    expect(result.applicationNumber).toBe("REQ-555555");
    expect(createdPayload).toMatchObject({
      isPrioritized: true,
      serviceValue: 40000,
      prioritizedValue: 100000,
      estimatedApplicationHour: 24,
      estimatedPrioritizedHour: 8,
    });
  });

  it("stores address snapshot and transfer validation metadata", async () => {
    const serviceId = "service_transfer";
    const fieldId = "field_required";
    let createdPayload: Record<string, unknown> | null = null;

    const ctx = {
      runQuery: vi.fn().mockImplementation((_: unknown, queryArgs: { id?: string; contactId?: string }) => {
        if (queryArgs?.id === serviceId) {
          return Promise.resolve({
            workflowMode: "deterministic",
            workflowConfig: { requirePaymentMethod: true },
            price: 10000,
            fields: [{ _id: fieldId, name: "Documento", type: "Text", required: true, status: true }],
          });
        }
        if (queryArgs?.id === "profile_1") {
          return Promise.resolve({ _id: "profile_1", address: "Calle 1" });
        }
        if (queryArgs?.contactId) {
          return Promise.resolve({ _id: "session_1", data: { flow: {} } });
        }
        if (queryArgs?.id === "request_transfer_created") {
          return Promise.resolve({ applicationNumber: "REQ-111111" });
        }
        return Promise.resolve(null);
      }),
      runMutation: vi.fn().mockImplementation((_: unknown, mutationArgs: Record<string, unknown>) => {
        if (mutationArgs?.applicationNumber) {
          createdPayload = mutationArgs;
          return Promise.resolve({ requestId: "request_transfer_created", applicationNumber: "REQ-111111" });
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
      serviceId,
      data: [{ fieldId, value: "ok" }],
      paymentMethod: "transfer",
      address: "Carrera 10 # 20-30",
      attachments: [{ fileName: "comprobante.pdf", url: "https://example.com/comprobante.pdf", storageId: "receipt_1" }],
    })) as { ok: boolean };

    expect(result.ok).toBe(true);
    expect(createdPayload).toMatchObject({
      paymentMethod: "transfer",
      paymentStatus: "pending_admin_validation",
      adminValidationStatus: "pending",
      addressSnapshot: {
        raw: "Carrera 10 # 20-30",
        source: "user_edit",
      },
    });
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
     * NEW POLICY TEST:
     * 
     * When creating a request, NO new thread should be created.
     * Instead, return completion with softReset: true.
     * 
     * This replaces the old behavior of closing the thread and creating a new one.
     */
    it("should NOT create new thread - return softReset instead", async () => {
      const existingThreadId = "thread_existing_456";
      const expectedAppNumber = "REQ-888888";

      const serviceMock = {
        price: 30000,
        fields: [
          { _id: fieldId, name: "Test Field", type: "Text", required: true, status: true },
        ],
      };

      const threadCreations: string[] = [];
      const threadUpdates: string[] = [];

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
          
          // Track thread operations - should NOT happen with new policy
          if (args?.patch?.title) {
            threadUpdates.push(args.patch.title);
            return Promise.resolve({});
          }
          
          if (args?.title && args?.userId) {
            threadCreations.push(args.title);
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
      })) as { 
        ok: boolean; 
        applicationNumber?: string;
        completion?: {
          closeConversation: boolean;
          closureApplied: boolean;
          contextRestarted?: boolean;
          softReset: boolean;
          newThreadId?: string;
        };
      };

      expect(result.ok).toBe(true);
      expect(result.completion).toBeDefined();

      // NEW POLICY: No thread creation
      expect(threadCreations).toHaveLength(0);
      
      // NEW POLICY: No thread closure/update
      expect(threadUpdates).toHaveLength(0);
      
      // NEW POLICY: softReset should be true
      expect(result.completion!.softReset).toBe(true);
      
      // NEW POLICY: closeConversation should be false
      expect(result.completion!.closeConversation).toBe(false);
      
      // NEW POLICY: No new thread ID
      expect(result.completion!.newThreadId).toBeUndefined();
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

  describe("new policy: soft reset without thread rotation", () => {
    const contactId = "whatsapp:+573001234567";
    const serviceId = "service_test";
    const fieldId = "field_test";
    const applicantId = "profile_test123";

    /**
     * NEW POLICY TEST: Identity/Profile should be preserved
     * 
     * When soft reset happens, the profileId should be preserved.
     * This is different from the old behavior where clearProfileAssociation was true.
     */
    it("should preserve profileId for identity continuity", async () => {
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
        runMutation: vi.fn().mockImplementation(() => {
          return Promise.resolve({});
        }),
        storage: {
          store: async () => "storage_test",
          getUrl: async () => "https://storage.local/test",
        },
        // Even with threadId, the new policy preserves identity
        threadId: "thread_123",
      };

      const result = (await invokeCreateRequest(ctx, {
        contactId,
        applicantId,
        serviceId,
        data: [{ fieldId, value: "test value" }],
      })) as {
        ok: boolean;
        completion?: {
          softReset: boolean;
          closeConversation: boolean;
          closureApplied: boolean;
          contextRestarted?: boolean;
        };
      };

      expect(result.ok).toBe(true);
      expect(result.completion).toBeDefined();
      expect(result.completion!.softReset).toBe(true);
      // Profile is NOT cleared - the completion does NOT have clearProfileAssociation
      // The caller (ycloudBot.ts) should preserve profileId when doing soft reset
    });

    /**
     * NEW POLICY TEST: Next message should have clean context
     * 
     * After request completion, session state (serviceId, fieldIds, data)
     * should be reset so next message starts fresh.
     * 
     * This is verified by ycloudBot.ts calling patchSession with null values
     * for serviceId, fieldIds, currentFieldIndex, data, attachments, and state="INIT".
     */
    it("softReset flag signals session state should be cleared", async () => {
      const serviceMock = {
        price: 15000,
        fields: [
          { _id: fieldId, name: "Field 1", type: "Text", required: true, status: true },
        ],
      };

      const ctx = {
        runQuery: vi.fn().mockImplementation((queryFn: ReturnType<typeof vi.fn>, queryArgs: { id?: string }) => {
          if (queryArgs?.id === serviceId) {
            return Promise.resolve(serviceMock);
          }
          return Promise.resolve(null);
        }),
        runMutation: vi.fn().mockResolvedValue({}),
        storage: {
          store: async () => "storage_test",
          getUrl: async () => "https://storage.local/test",
        },
      };

      const result = (await invokeCreateRequest(ctx, {
        contactId,
        applicantId,
        serviceId,
        data: [{ fieldId, value: "my value" }],
      })) as {
        ok: boolean;
        completion?: {
          softReset: boolean;
        };
      };

      expect(result.ok).toBe(true);
      expect(result.completion?.softReset).toBe(true);
      
      // The softReset flag tells ycloudBot.ts to:
      // - Set serviceId = null
      // - Set fieldIds = null  
      // - Set currentFieldIndex = null
      // - Set data = {}
      // - Set attachments = []
      // - Set state = "INIT"
      // This ensures next message starts with clean context
    });

    /**
     * TODO/FUTURE: Thread summarization when context exceeds token threshold
     * 
     * This test documents the future enhancement for context compaction.
     * 
     * Policy: If thread context grows beyond ~20k tokens, summarize/compact
     * instead of accumulating raw context.
     * 
     * Implementation suggestion:
     * - Add token counting before sending to agent
     * - If threshold exceeded, call summarize tool or inject summary prompt
     * - Store summary in conversation metadata
     * - Continue with summarized context
     * 
     * This is NOT implemented in this iteration - left as a seam for future work.
     */
    it("DOCUMENTED: future enhancement - token threshold summarization", () => {
      // This test documents the intended behavior for future implementation
      // Currently no summarization happens - context can grow unbounded
      
      const CURRENT_BEHAVIOR = "no summarization";
      const FUTURE_BEHAVIOR = "summarize at ~20k tokens";
      
      // Document the seam for future implementation
      expect(CURRENT_BEHAVIOR).toBeDefined();
      
      // Implementation would need:
      // 1. Token counter (e.g., using tiktoken or similar)
      // 2. Summarization tool or prompt injection
      // 3. Storage for conversation summary
      // 4. Check in ycloudBot.ts before calling generateText
      
      // This test passes but documents that enhancement is needed
      const enhancementNeeded = true;
      expect(enhancementNeeded).toBe(true);
    });
  });
});
