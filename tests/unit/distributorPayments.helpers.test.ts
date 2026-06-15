import { describe, expect, it } from "vitest";
import { resolveDistributorPaymentStatus } from "../../convex/distributorPayments.helpers";

describe("resolveDistributorPaymentStatus", () => {
  it("marks Atendida without payment link as Pendiente", () => {
    expect(resolveDistributorPaymentStatus({ requestStatus: "Atendida" }, false)).toBe(
      "Pendiente"
    );
  });

  it("marks Atendida with payment link as Pagado", () => {
    expect(resolveDistributorPaymentStatus({ requestStatus: "Atendida" }, true)).toBe(
      "Pagado"
    );
  });

  it("marks Finalizada as Pagado", () => {
    expect(resolveDistributorPaymentStatus({ requestStatus: "Finalizada" }, false)).toBe(
      "Pagado"
    );
  });

  it("marks EnProceso as N/A", () => {
    expect(resolveDistributorPaymentStatus({ requestStatus: "EnProceso" }, false)).toBe("N/A");
  });
});
