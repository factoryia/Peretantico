import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

function isTruthyFieldValue(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "si" || normalized === "sí";
  }
  return false;
}

export async function requestRequiresFilingPhoto(
  ctx: QueryCtx,
  requestId: Id<"requests">
): Promise<boolean> {
  const rows = await ctx.db
    .query("requestData")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .collect();

  for (const row of rows) {
    const field = await ctx.db.get(row.fieldId);
    const code = field?.code?.toLowerCase() ?? "";
    if (code.includes("requires_filing") && isTruthyFieldValue(row.value)) {
      return true;
    }
  }

  return false;
}
