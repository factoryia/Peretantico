import { afterEach, describe, expect, it } from "vitest";
import { adaptRequestFlowState } from "../../src/features/home/utils/request-flow-adapter";

const originalUiFlag = (globalThis as typeof globalThis & { __VITE_ENABLE_DETERMINISTIC_REQUESTS__?: string }).__VITE_ENABLE_DETERMINISTIC_REQUESTS__;

afterEach(() => {
  (globalThis as typeof globalThis & { __VITE_ENABLE_DETERMINISTIC_REQUESTS__?: string }).__VITE_ENABLE_DETERMINISTIC_REQUESTS__ = originalUiFlag;
});

describe("request flow adapter", () => {
  it("groups field attachments and transfer receipt for operative UI", () => {
    (globalThis as typeof globalThis & { __VITE_ENABLE_DETERMINISTIC_REQUESTS__?: string }).__VITE_ENABLE_DETERMINISTIC_REQUESTS__ = "true";

    const adapted = adaptRequestFlowState({
      service: { workflowMode: "deterministic" },
      addressSnapshot: { raw: "Calle 123", source: "profile", confirmedAt: 1 },
      flowStatus: "admin_review",
      paymentStatus: "pending_admin_validation",
      adminValidationStatus: "pending",
      data: [
        { fieldId: "field_doc", field: { _id: "field_doc", name: "Documento" } },
      ],
      attachments: [
        {
          _id: "att_1",
          fileName: "cedula.pdf",
          url: "https://files.local/cedula.pdf",
          kind: "service_field",
          fieldId: "field_doc",
        },
      ],
      receiptAttachments: [
        {
          _id: "att_receipt",
          fileName: "comprobante.pdf",
          url: "https://files.local/comprobante.pdf",
          kind: "payment_receipt",
        },
      ],
    });

    expect(adapted.addressSnapshot?.raw).toBe("Calle 123");
    expect(adapted.attachmentGroups).toHaveLength(2);
    expect(adapted.attachmentGroups?.[0]?.items[0]?.label).toBeTruthy();
    expect(adapted.receiptAttachments?.[0]?.kind).toBe("payment_receipt");
  });

  it("hides deterministic UI artifacts when the global UI kill switch is disabled", () => {
    (globalThis as typeof globalThis & { __VITE_ENABLE_DETERMINISTIC_REQUESTS__?: string }).__VITE_ENABLE_DETERMINISTIC_REQUESTS__ = "false";

    const adapted = adaptRequestFlowState({
      service: { workflowMode: "deterministic" },
      addressSnapshot: { raw: "Calle 123", source: "profile", confirmedAt: 1 },
      flowStatus: "admin_review",
      paymentStatus: "pending_admin_validation",
      adminValidationStatus: "pending",
      receiptAttachments: [
        { _id: "att_receipt", fileName: "comprobante.pdf", url: "https://files.local/comprobante.pdf", kind: "payment_receipt" },
      ],
    });

    expect(adapted.addressSnapshot).toBeUndefined();
    expect(adapted.adminValidationStatus).toBeUndefined();
    expect(adapted.attachmentGroups).toEqual([]);
  });
});
