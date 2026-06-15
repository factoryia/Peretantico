import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/** Repartidor marcó la entrega como completada (UI: "Completada"). */
export const DISTRIBUTOR_COMPLETED_STATUS = "Atendida" as const;

/** Admin liquidó el pago al repartidor en Costos. */
export const DISTRIBUTOR_PAID_STATUS = "Finalizada" as const;

export async function isRequestPaidToDistributor(
  ctx: QueryCtx,
  requestId: Id<"requests">
): Promise<boolean> {
  const link = await ctx.db
    .query("paymentRequests")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .first();
  return !!link;
}

export function resolveDistributorPaymentStatus(
  request: Pick<Doc<"requests">, "requestStatus">,
  paidToDistributor: boolean
): "Pendiente" | "Pagado" | "N/A" {
  if (request.requestStatus === DISTRIBUTOR_COMPLETED_STATUS) {
    return paidToDistributor ? "Pagado" : "Pendiente";
  }
  if (request.requestStatus === DISTRIBUTOR_PAID_STATUS) {
    return "Pagado";
  }
  return "N/A";
}

export async function computeDistributorSettlementStatus(
  ctx: QueryCtx,
  distributorId: Id<"distributors">
): Promise<"Pendiente" | "Pagado"> {
  const completed = await ctx.db
    .query("requests")
    .withIndex("by_distributor", (q) => q.eq("distributorId", distributorId))
    .filter((q) => q.eq(q.field("requestStatus"), DISTRIBUTOR_COMPLETED_STATUS))
    .collect();

  for (const req of completed) {
    if (!(await isRequestPaidToDistributor(ctx, req._id))) {
      return "Pendiente";
    }
  }

  return "Pagado";
}
