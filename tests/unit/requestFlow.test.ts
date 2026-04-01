import { afterEach, describe, expect, it } from "vitest";
import { resolveRequestFlow } from "../../convex/system/requestFlow";

const originalDeterministicFlag = process.env.ENABLE_DETERMINISTIC_REQUESTS;

afterEach(() => {
  process.env.ENABLE_DETERMINISTIC_REQUESTS = originalDeterministicFlag;
});

describe("requestFlow resolver", () => {
  it("falls back to legacy mode when deterministic config is missing", () => {
    const result = resolveRequestFlow({
      workflowMode: "legacy",
      fieldIds: ["field_1"],
      collectedData: {},
    });

    expect(result.mode).toBe("legacy");
    expect(result.stage).toBe("fields");
  });

  it("falls back to legacy mode when the global kill switch is disabled", () => {
    process.env.ENABLE_DETERMINISTIC_REQUESTS = "false";

    const result = resolveRequestFlow({
      workflowMode: "deterministic",
      workflowConfig: { requirePaymentMethod: true },
      fieldIds: ["field_1"],
      collectedData: {},
    });

    expect(result.mode).toBe("legacy");
    expect(result.stage).toBe("fields");
  });

  it("requires receipt for transfer payments", () => {
    const result = resolveRequestFlow({
      workflowMode: "deterministic",
      workflowConfig: { requirePaymentMethod: true },
      fieldIds: ["field_1"],
      collectedData: { field_1: "ok" },
      addressConfirmed: true,
      paymentMethod: "transfer",
      adminValidationStatus: "pending",
      receiptAttachmentIds: [],
    });

    expect(result.stage).toBe("receipt");
    expect(result.paymentStatus).toBe("pending_receipt");
  });

  it("keeps transfer requests in admin review until approved", () => {
    const result = resolveRequestFlow({
      workflowMode: "deterministic",
      workflowConfig: { requirePaymentMethod: true },
      fieldIds: ["field_1"],
      collectedData: { field_1: "ok" },
      addressConfirmed: true,
      paymentMethod: "transfer",
      adminValidationStatus: "pending",
      receiptAttachmentIds: ["att_1"],
    });

    expect(result.stage).toBe("admin_review");
    expect(result.eligibleForCompletion).toBe(false);
  });

  it("resolves configured branch and only blocks pending branch fields", () => {
    const result = resolveRequestFlow({
      workflowMode: "deterministic",
      workflowConfig: {
        branches: [
          { key: "persona", rules: [{ fieldId: "tipo", equals: "persona" }], fieldIds: ["tipo", "cedula"] },
          { key: "empresa", rules: [{ fieldId: "tipo", equals: "empresa" }], fieldIds: ["tipo", "nit"] },
        ],
      },
      fieldIds: ["tipo", "cedula", "nit"],
      collectedData: { tipo: "empresa" },
      addressConfirmed: true,
    });

    expect(result.branchKey).toBe("empresa");
    expect(result.pendingFieldIds).toEqual(["nit"]);
  });
});
