import type { CompleteRequest } from "./complete-request";
import { shouldUseDeterministicRequestUi } from "../../../lib/deterministic-requests";

export interface RequestFlowAttachmentItem {
  id: string;
  label: string;
  url: string;
  kind: "service_field" | "payment_receipt" | "evidence" | "other";
  fieldId?: string;
  fieldName?: string;
}

export interface RequestFlowAttachmentGroup {
  key: string;
  title: string;
  items: RequestFlowAttachmentItem[];
}

type BackendAttachment = {
  _id?: string;
  id?: string;
  fileName?: string;
  url?: string;
  kind?: string;
  fieldId?: string;
};

type BackendField = {
  _id?: string;
  id?: string;
  name?: string;
};

type BackendDataItem = {
  fieldId?: string;
  field?: BackendField | null;
};

type BackendRequestLike = {
  service?: { workflowMode?: string | null } | null;
  addressSnapshot?: { raw?: string; source?: string; confirmedAt?: number } | null;
  flowStatus?: string | null;
  paymentStatus?: string | null;
  adminValidationStatus?: string | null;
  adminValidationReason?: string | null;
  adminValidationAt?: number | null;
  receiptAttachments?: BackendAttachment[] | null;
  attachments?: BackendAttachment[] | null;
  data?: BackendDataItem[] | null;
};

function mapAttachmentKind(kind: string | undefined): RequestFlowAttachmentItem["kind"] {
  if (kind === "service_field" || kind === "payment_receipt" || kind === "evidence") return kind;
  return "other";
}

function buildFieldNameMap(data: BackendDataItem[] | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of data ?? []) {
    const fieldId = String(item.fieldId ?? item.field?._id ?? item.field?.id ?? "").trim();
    const fieldName = String(item.field?.name ?? "").trim();
    if (fieldId && fieldName) {
      map.set(fieldId, fieldName);
    }
  }
  return map;
}

export function buildRequestAttachmentGroups(request: BackendRequestLike): RequestFlowAttachmentGroup[] {
  const fieldNameMap = buildFieldNameMap(request.data);
  const groups = new Map<string, RequestFlowAttachmentGroup>();

  const ensureGroup = (key: string, title: string) => {
    const existing = groups.get(key);
    if (existing) return existing;
    const created: RequestFlowAttachmentGroup = { key, title, items: [] };
    groups.set(key, created);
    return created;
  };

  const pushItems = (attachments: BackendAttachment[] | null | undefined) => {
    for (const attachment of attachments ?? []) {
      const url = String(attachment.url ?? "").trim();
      if (!url) continue;
      const fieldId = String(attachment.fieldId ?? "").trim() || undefined;
      const fieldName = fieldId ? fieldNameMap.get(fieldId) : undefined;
      const kind = mapAttachmentKind(attachment.kind);
      const key =
        kind === "payment_receipt"
          ? "payment_receipt"
          : fieldId
            ? `field:${fieldId}`
            : kind === "evidence"
              ? "evidence"
              : "other";
      const title =
        kind === "payment_receipt"
          ? "Comprobante de transferencia"
          : fieldName
            ? `Adjuntos · ${fieldName}`
            : kind === "evidence"
              ? "Evidencia"
              : "Adjuntos adicionales";

      ensureGroup(key, title).items.push({
        id: String(attachment._id ?? attachment.id ?? `${key}:${url}`),
        label: String(attachment.fileName ?? fieldName ?? "Adjunto"),
        url,
        kind,
        fieldId,
        fieldName,
      });
    }
  };

  pushItems(request.attachments);
  pushItems(request.receiptAttachments);

  return Array.from(groups.values());
}

export function adaptRequestFlowState<T extends BackendRequestLike>(request: T): Pick<
  CompleteRequest,
  | "addressSnapshot"
  | "flowStatus"
  | "paymentFlowStatus"
  | "adminValidationStatus"
  | "adminValidationReason"
  | "adminValidationAt"
  | "receiptAttachments"
  | "attachmentGroups"
> {
  if (!shouldUseDeterministicRequestUi(request)) {
    return {
      addressSnapshot: undefined,
      flowStatus: undefined,
      paymentFlowStatus: undefined,
      adminValidationStatus: undefined,
      adminValidationReason: undefined,
      adminValidationAt: undefined,
      receiptAttachments: [],
      attachmentGroups: [],
    };
  }

  const attachmentGroups = buildRequestAttachmentGroups(request);
  const receiptGroup = attachmentGroups.find((group) => group.key === "payment_receipt");
  const adminValidationStatus =
    request.adminValidationStatus && request.adminValidationStatus !== "not_required"
      ? request.adminValidationStatus
      : undefined;

  return {
    addressSnapshot: request.addressSnapshot
      ? {
          raw: request.addressSnapshot.raw ?? "",
          source:
            request.addressSnapshot.source === "user_edit" ? "user_edit" : "profile",
          confirmedAt: request.addressSnapshot.confirmedAt,
        }
      : undefined,
    flowStatus: request.flowStatus ?? undefined,
    paymentFlowStatus: request.paymentStatus ?? undefined,
    adminValidationStatus,
    adminValidationReason: request.adminValidationReason ?? undefined,
    adminValidationAt: request.adminValidationAt ?? undefined,
    receiptAttachments: receiptGroup?.items ?? [],
    attachmentGroups,
  };
}
