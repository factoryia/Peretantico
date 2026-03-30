import { describe, expect, it } from "vitest";
import { resolveThreadIdForConversation } from "../../convex/conversationState";

describe("conversation thread resolution", () => {
  it("prefers requested thread id over existing thread id", () => {
    const next = resolveThreadIdForConversation({
      currentThreadId: "thread_old",
      requestedThreadId: "thread_new",
    });

    expect(next).toBe("thread_new");
  });

  it("keeps existing thread id when requested thread id is missing", () => {
    const next = resolveThreadIdForConversation({
      currentThreadId: "thread_old",
      requestedThreadId: undefined,
    });

    expect(next).toBe("thread_old");
  });
});
