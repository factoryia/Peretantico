import { describe, expect, it } from "vitest";
import { buildPatchSessionUpdates, mergeSessionFlow } from "../../convex/whatsappBotState";

describe("whatsapp session patch updates", () => {
  it("clears service flow fields when null values are provided", () => {
    const updates = buildPatchSessionUpdates({
      id: "session_1" as never,
      serviceId: null,
      fieldIds: null,
      currentFieldIndex: null,
      state: "INIT",
      data: {},
      attachments: [],
    });

    expect(Object.prototype.hasOwnProperty.call(updates, "serviceId")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(updates, "fieldIds")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(updates, "currentFieldIndex")).toBe(true);
    expect(updates.serviceId).toBeUndefined();
    expect(updates.fieldIds).toBeUndefined();
    expect(updates.currentFieldIndex).toBeUndefined();
  });

  it("does not touch service flow fields when they are omitted", () => {
    const updates = buildPatchSessionUpdates({
      id: "session_1" as never,
      state: "INIT",
    });

    expect(Object.prototype.hasOwnProperty.call(updates, "serviceId")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(updates, "fieldIds")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(updates, "currentFieldIndex")).toBe(false);
  });

  it("merges deterministic flow data without losing previous collected fields", () => {
    const merged = mergeSessionFlow(
      {
        flow: {
          stage: "fields",
          collectedData: { tipo: "persona" },
          paymentDraft: { method: "transfer" },
        },
      },
      {
        branchKey: "persona",
        pendingFieldIds: ["cedula"],
        collectedData: { cedula: "123" },
      }
    );

    expect(merged.flow).toMatchObject({
      stage: "fields",
      branchKey: "persona",
      pendingFieldIds: ["cedula"],
      collectedData: { tipo: "persona", cedula: "123" },
      paymentDraft: { method: "transfer" },
    });
  });
});
