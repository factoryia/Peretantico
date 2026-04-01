export type WorkflowMode = "legacy" | "deterministic";
export type FlowStage = "service" | "branch" | "address" | "fields" | "payment" | "receipt" | "admin_review" | "complete";
export type PaymentMethod = "cash" | "transfer" | "card";
export type PaymentStatus = "not_started" | "pending_method" | "pending_receipt" | "pending_admin_validation" | "approved" | "rejected" | "completed";
export type AdminValidationStatus = "not_required" | "pending" | "approved" | "rejected";

export interface WorkflowBranchRule {
  fieldId: string;
  equals?: string | number | boolean;
  in?: Array<string | number | boolean>;
}

export interface WorkflowBranch {
  key: string;
  label?: string;
  rules?: WorkflowBranchRule[];
  fieldIds?: string[];
}

export interface WorkflowConfig {
  addressStrategy?: "profile_confirm" | "always_prompt";
  paymentMethods?: PaymentMethod[];
  requirePaymentMethod?: boolean;
  branches?: WorkflowBranch[];
}

export interface RequestFlowInput {
  workflowMode?: string | null;
  workflowConfig?: WorkflowConfig | null;
  fieldIds?: string[];
  collectedData?: Record<string, unknown>;
  branchKey?: string | null;
  profileAddress?: string | null;
  addressConfirmed?: boolean;
  paymentMethod?: string | null;
  receiptAttachmentIds?: string[];
  adminValidationStatus?: string | null;
}

export interface RequestFlowResult {
  mode: WorkflowMode;
  stage: FlowStage;
  branchKey: string | null;
  pendingFieldIds: string[];
  eligibleForCompletion: boolean;
  paymentStatus: PaymentStatus;
  adminValidationStatus: AdminValidationStatus;
}

export function isGlobalDeterministicRequestsEnabled(rawFlag = process.env.ENABLE_DETERMINISTIC_REQUESTS): boolean {
  return rawFlag !== "false" && rawFlag !== "0";
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function isDeterministicWorkflowEnabled(service: {
  workflowMode?: string | null;
  workflowConfig?: WorkflowConfig | null;
}): boolean {
  if (!isGlobalDeterministicRequestsEnabled()) return false;
  return service.workflowMode === "deterministic" && Boolean(service.workflowConfig);
}

export function resolveBranchKey(input: {
  workflowConfig?: WorkflowConfig | null;
  explicitBranchKey?: string | null;
  collectedData?: Record<string, unknown>;
}): string | null {
  if (input.explicitBranchKey) return input.explicitBranchKey;
  const branches = input.workflowConfig?.branches ?? [];
  const collectedData = input.collectedData ?? {};

  for (const branch of branches) {
    const rules = branch.rules ?? [];
    if (rules.length === 0) continue;
    const matches = rules.every((rule) => {
      const current = collectedData[rule.fieldId];
      if (!isMeaningful(current)) return false;
      if (Array.isArray(rule.in) && rule.in.length > 0) {
        const currentList = Array.isArray(current) ? current : [current];
        return currentList.some((item) => rule.in!.some((allowed) => normalizeText(allowed) === normalizeText(item)));
      }
      if (Object.prototype.hasOwnProperty.call(rule, "equals")) {
        return normalizeText(rule.equals) === normalizeText(current);
      }
      return false;
    });
    if (matches) return branch.key;
  }

  return null;
}

export function getApplicableFieldIds(input: {
  workflowConfig?: WorkflowConfig | null;
  fieldIds?: string[];
  branchKey?: string | null;
}): string[] {
  const allFieldIds = [...new Set((input.fieldIds ?? []).filter(Boolean))];
  if (!input.workflowConfig?.branches?.length) return allFieldIds;
  const branch = input.workflowConfig.branches.find((item) => item.key === input.branchKey);
  if (!branch?.fieldIds?.length) return allFieldIds;
  const allowed = new Set(branch.fieldIds);
  return allFieldIds.filter((fieldId) => allowed.has(fieldId));
}

export function resolveRequestFlow(input: RequestFlowInput): RequestFlowResult {
  const mode: WorkflowMode = isDeterministicWorkflowEnabled({
    workflowMode: input.workflowMode,
    workflowConfig: input.workflowConfig,
  })
    ? "deterministic"
    : "legacy";

  if (mode === "legacy") {
    return {
      mode,
      stage: "fields",
      branchKey: null,
      pendingFieldIds: (input.fieldIds ?? []).filter((fieldId) => !isMeaningful(input.collectedData?.[fieldId])),
      eligibleForCompletion: true,
      paymentStatus: "completed",
      adminValidationStatus: "not_required",
    };
  }

  const branchKey = resolveBranchKey({
    workflowConfig: input.workflowConfig,
    explicitBranchKey: input.branchKey,
    collectedData: input.collectedData,
  });
  const applicableFieldIds = getApplicableFieldIds({
    workflowConfig: input.workflowConfig,
    fieldIds: input.fieldIds,
    branchKey,
  });
  const pendingFieldIds = applicableFieldIds.filter((fieldId) => !isMeaningful(input.collectedData?.[fieldId]));
  const adminValidationStatus = (input.adminValidationStatus ?? "not_required") as AdminValidationStatus;
  const paymentMethod = normalizeText(input.paymentMethod);
  const receiptCount = input.receiptAttachmentIds?.length ?? 0;
  const requirePaymentMethod = input.workflowConfig?.requirePaymentMethod !== false;
  const requireAddressConfirmation = input.workflowConfig?.addressStrategy !== "always_prompt";

  let stage: FlowStage = "complete";
  let paymentStatus: PaymentStatus = "completed";

  if (input.workflowConfig?.branches?.length && !branchKey) {
    stage = "branch";
    paymentStatus = "not_started";
  } else if (requireAddressConfirmation && !input.addressConfirmed) {
    stage = "address";
    paymentStatus = "not_started";
  } else if (pendingFieldIds.length > 0) {
    stage = "fields";
    paymentStatus = "not_started";
  } else if (requirePaymentMethod && !paymentMethod) {
    stage = "payment";
    paymentStatus = "pending_method";
  } else if (paymentMethod === "transfer" && receiptCount === 0) {
    stage = "receipt";
    paymentStatus = "pending_receipt";
  } else if (paymentMethod === "transfer" && adminValidationStatus !== "approved") {
    stage = "admin_review";
    paymentStatus = adminValidationStatus === "rejected" ? "rejected" : "pending_admin_validation";
  }

  const eligibleForCompletion = stage === "complete";

  if (eligibleForCompletion && paymentMethod === "transfer") {
    paymentStatus = "approved";
  }

  return {
    mode,
    stage,
    branchKey,
    pendingFieldIds,
    eligibleForCompletion,
    paymentStatus,
    adminValidationStatus,
  };
}

export function getFieldFileConstraints(settings: unknown): {
  maxFiles?: number;
  acceptedMimeTypes?: string[];
} {
  if (!settings || typeof settings !== "object") return {};
  const source = settings as { maxFiles?: unknown; acceptedMimeTypes?: unknown };
  return {
    maxFiles: typeof source.maxFiles === "number" && source.maxFiles > 0 ? source.maxFiles : undefined,
    acceptedMimeTypes: Array.isArray(source.acceptedMimeTypes)
      ? source.acceptedMimeTypes.map((item) => String(item)).filter(Boolean)
      : undefined,
  };
}
