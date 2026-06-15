const STAFF_ROLE_NAMES = new Set([
  "repartidor",
  "distributor",
  "administrador",
  "admin",
  "superadmin",
]);

export function normalizeRoleName(role: string): string {
  return role.trim().toLowerCase();
}

export function isStaffRole(role: string): boolean {
  return STAFF_ROLE_NAMES.has(normalizeRoleName(role));
}

export function isStaffProfile(roles: string[]): boolean {
  return roles.some(isStaffRole);
}

export function isServiceCustomerProfile(args: {
  roles: string[];
  linkedToDistributor: boolean;
}): boolean {
  if (args.linkedToDistributor) return false;
  if (isStaffProfile(args.roles)) return false;
  return true;
}
