function getUiDeterministicFlagOverride(): string | undefined {
  if (typeof globalThis !== "undefined" && "__VITE_ENABLE_DETERMINISTIC_REQUESTS__" in globalThis) {
    const flag = (globalThis as typeof globalThis & { __VITE_ENABLE_DETERMINISTIC_REQUESTS__?: unknown }).__VITE_ENABLE_DETERMINISTIC_REQUESTS__;
    return typeof flag === "string" ? flag : undefined;
  }

  return undefined;
}

export function isDeterministicRequestsUiEnabled(rawFlag = getUiDeterministicFlagOverride() ?? import.meta.env.VITE_ENABLE_DETERMINISTIC_REQUESTS): boolean {
  return rawFlag !== "false" && rawFlag !== "0";
}

type RequestLikeForUiGuard = {
  service?: { workflowMode?: string | null } | null;
  addressSnapshot?: unknown;
  flowStatus?: string | null;
  paymentStatus?: string | null;
  adminValidationStatus?: string | null;
  receiptAttachments?: unknown[] | null;
  attachments?: Array<{ kind?: string | null }> | null;
};

export function shouldUseDeterministicRequestUi(request: RequestLikeForUiGuard | null | undefined): boolean {
  if (!isDeterministicRequestsUiEnabled()) return false;
  if (request?.service?.workflowMode === "deterministic") return true;
  if (request?.addressSnapshot) return true;
  if (request?.flowStatus) return true;
  if (request?.paymentStatus) return true;
  if (request?.adminValidationStatus && request.adminValidationStatus !== "not_required") return true;
  if ((request?.receiptAttachments?.length ?? 0) > 0) return true;
  return (request?.attachments ?? []).some((attachment) => attachment?.kind === "payment_receipt");
}
