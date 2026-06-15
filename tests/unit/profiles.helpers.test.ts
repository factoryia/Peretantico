import { describe, expect, it } from "vitest";
import { isServiceCustomerProfile, isStaffProfile } from "../../convex/profiles.helpers";

describe("profiles.helpers", () => {
  it("treats Repartidor and Administrador as staff", () => {
    expect(isStaffProfile(["Repartidor"])).toBe(true);
    expect(isStaffProfile(["Administrador"])).toBe(true);
    expect(isStaffProfile(["distributor"])).toBe(true);
  });

  it("keeps Solicitante and profiles without staff roles as customers", () => {
    expect(
      isServiceCustomerProfile({ roles: ["Solicitante"], linkedToDistributor: false })
    ).toBe(true);
    expect(isServiceCustomerProfile({ roles: [], linkedToDistributor: false })).toBe(true);
  });

  it("excludes profiles linked to a distributor account", () => {
    expect(
      isServiceCustomerProfile({ roles: ["Solicitante"], linkedToDistributor: true })
    ).toBe(false);
  });
});
