import { describe, expect, it } from "vitest";

function isTruthyFieldValue(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "si" || normalized === "sí";
  }
  return false;
}

describe("requires filing field values", () => {
  it("accepts boolean and spanish string values", () => {
    expect(isTruthyFieldValue(true)).toBe(true);
    expect(isTruthyFieldValue("Sí")).toBe(true);
    expect(isTruthyFieldValue("false")).toBe(false);
  });
});
