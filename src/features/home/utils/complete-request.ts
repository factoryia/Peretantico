import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { ServiceType } from "@/types/global";
import { adaptRequestFlowState } from "./request-flow-adapter";

// --- Interfaces ---

// interface CompleteRequestsApiResponse {
//   data: CompleteRequest[];
//   included?: any[];
//   meta: {
//     count: number;
//     page?: number;
//     limit?: number;
//     totalPages?: number;
//   }
// }

export interface PaymentDTO {
  id: string;
  title?: string;
  totalAmount?: number;
  status?: string;
}

export interface CompleteRequest {
  id: string;
  drupal_internal__nid: number;
  title: string;
  created: string;
  field_application_number: string;
  field_application_score?: number;
  field_entry_date: string;
  field_estimated_application_hour?: number;
  field_estimated_prioritized_hour?: number;
  field_priority_estimated_hours?: number;
  field_is_recurring?: boolean;
  field_logistics_costs?: number;
  field_prioritized_value?: number;
  field_priority_value?: number;
  field_service_value?: number;
  field_service_status?: string;
  field_request_status?: string;
  field_observations?: string;
  field_payment_status_id?: string;
  field_used_channel?: string;
  status?: boolean;
  promote?: boolean;
  sticky?: boolean;
  paymentMethod?: string | null;
  paymentFlowStatus?: string | null;
  isPrioritized?: boolean;
  requestStatus?: "Finalizada" | "EnProceso" | "Atendida" | "Incompleta";
  serviceId?: string; // Added serviceId field
  flowStatus?: string;
  adminValidationStatus?: string;
  adminValidationReason?: string;
  adminValidationAt?: number;
  addressSnapshot?: {
    raw: string;
    source: "profile" | "user_edit";
    confirmedAt?: number;
  };
  field_info_service?: {
    type: ServiceType;
    id: string;
  };

  applicant?: {
    id: string;
    name: string;
    documentNumber?: string;
    phoneNumber?: string;
    address?: string;
    documentType?: { id: string; name: string };
  };
  applicationStatus?: { id: string; name: string };
  distributor?: { id: string; name: string };
  paymentStatus?: { id: string; name: string };
  subservice?: { id: string; name: string };
  infoService?: InfoService;
  paymentInfo?: PaymentDTO | null;
  evidenceImage?: {
    id: string;
    uri: string;
    alt?: string;
  };
  evidenceStorageId?: string;
  evidenceUrl?: string;
  receiptAttachments?: {
    id: string;
    label: string;
    url: string;
    kind: "service_field" | "payment_receipt" | "evidence" | "other";
    fieldId?: string;
    fieldName?: string;
  }[];
  attachmentGroups?: {
    key: string;
    title: string;
    items: {
      id: string;
      label: string;
      url: string;
      kind: "service_field" | "payment_receipt" | "evidence" | "other";
      fieldId?: string;
      fieldName?: string;
    }[];
  }[];
  data?: {
    id: string;
    fieldId: string;
    value: unknown;
    field?: {
      id: string;
      name: string;
      code?: string | null;
      description?: string | null;
      type: "Text" | "Number" | "Date" | "Boolean" | "Select" | "File";
      required: boolean;
      multiple: boolean;
      order: number;
      options?: unknown | null;
      status: boolean;
      settings?: unknown | null;
    };
  }[];
}

export interface BaseInfoService {
  id: string;
  type: ServiceType;
  title?: string;
  priority?: string;
}

// Placeholder interfaces for InfoServices - keeping them for type compatibility
export interface MedicationInfoService extends BaseInfoService { type: "node--request_medication"; [key: string]: any; }
export interface CivilRegistryInfoService extends BaseInfoService { type: "node--civil_registry_request"; [key: string]: any; }
export interface DeathCertificateInfoService extends BaseInfoService { type: "node--death_certificate_request"; [key: string]: any; }
export interface MarriageCertificateInfoService extends BaseInfoService { type: "node--marriage_certificate_request"; [key: string]: any; }
export interface WaterSampleFridgeInfoService extends BaseInfoService { type: "node--water_sample_fridge"; [key: string]: any; }
export interface PropertyCertificationInfoService extends BaseInfoService { type: "node--property_certification"; [key: string]: any; }
export interface MedicalBillsInfoService extends BaseInfoService { type: "node--medical_bills"; [key: string]: any; }
export interface PropertyUnbundlingInfoService extends BaseInfoService { type: "node--property_unbundling_request"; [key: string]: any; }

export type InfoService =
  | MedicationInfoService
  | CivilRegistryInfoService
  | DeathCertificateInfoService
  | MarriageCertificateInfoService
  | WaterSampleFridgeInfoService
  | PropertyCertificationInfoService
  | MedicalBillsInfoService
  | PropertyUnbundlingInfoService
  | (BaseInfoService & { type: string; [key: string]: unknown });

export interface CompleteRequestFilters {
  status?: string;
  subservice?: string;
  assignedDistributor?: string;
  requestNumber?: string;
  applicantName?: string;
  page?: number;
  limit?: number;
  periodo?: string;
  zonaId?: string;
  isPrioritized?: boolean;
  paymentStatus?: string;
  search?: string;
}

// --- Main Hook Logic ---

export const useCompleteRequests = (filters: CompleteRequestFilters = {}) => {
  const {
    page = 1,
    limit = 50,
    status,
    subservice,
    assignedDistributor,
    requestNumber,
    applicantName,
    periodo,
    zonaId,
    isPrioritized,
    paymentStatus,
    search,
  } = filters;

  // Transform filters to Convex args
  const convexArgs: any = {
    // paginationOpts is not used anymore as we fetch all and paginate in client
    // but we might need it if we revert to pagination
  };

  const shouldFilterByRequestStatus =
    status &&
    status !== "all" &&
    (status === "EnProceso" ||
      status === "Atendida" ||
      status === "Finalizada" ||
      status === "Incompleta");

  if (subservice && subservice !== "all") {
    convexArgs.serviceId = subservice as Id<"services">;
  }

  if (assignedDistributor && assignedDistributor !== "all") {
    convexArgs.distributorId = assignedDistributor as Id<"distributors">;
  }

  if (requestNumber) {
    convexArgs.applicationNumber = requestNumber;
  }

  if (applicantName) {
    convexArgs.applicantName = applicantName;
  }

  if (periodo && periodo !== "all") {
    convexArgs.periodo = periodo;
  }

  if (zonaId && zonaId !== "all") {
    convexArgs.zonaId = zonaId as Id<"coverageAreas">;
  }

  if (isPrioritized !== undefined) {
    convexArgs.isPrioritized = isPrioritized;
  }

  if (paymentStatus && paymentStatus !== "all") {
    convexArgs.paymentStatus = paymentStatus;
  }

  if (search) {
    convexArgs.search = search;
  }

  // Handle "none" or invalid ID scenarios to prevent backend validation errors
  const shouldSkip = assignedDistributor === "none";

  // Fetch data from Convex
  const results = useQuery(api.requests.list, shouldSkip ? "skip" : convexArgs);
  const isLoading = results === undefined;

  // Transform Data
  let transformedData: CompleteRequest[] = [];
  
  if (results) {
    const rawData = Array.isArray(results) ? results : (results as any).page || [];
    // We cannot await inside map for a sync return in hook without state.
    // However, `useQuery` data is already there.
    // If we want to resolve URLs, we should do it in the backend query handler.
    
    transformedData = rawData.map((req: any) => ({
        id: req._id,
        drupal_internal__nid: 0,
        title: req.title || "",
        created: new Date(req._creationTime).toISOString(),
        field_application_number: req.applicationNumber || "",
        field_entry_date: req.entryDate ? new Date(req.entryDate).toISOString() : "",
        field_application_score: req.applicationScore || 0,
        field_estimated_application_hour: req.estimatedApplicationHour || 0,
        field_estimated_prioritized_hour: req.estimatedPrioritizedHour || 0,
        field_priority_estimated_hours: req.estimatedPrioritizedHour || 0,
        field_is_recurring: req.isRecurring || false,
        field_logistics_costs: Number(req.logisticsCosts) || 0,
        field_service_value: Number(req.serviceValue) || 0,
        field_prioritized_value: Number(req.prioritizedValue) || 0,
        field_priority_value: Number(req.prioritizedValue) || 0,
        field_observations: req.observations || "",
        paymentMethod: req.paymentMethod ?? null,
        isPrioritized: req.isPrioritized ?? false,
        requestStatus: req.requestStatus ?? "EnProceso",
        status: req.status,
        promote: req.promote,
        sticky: req.sticky,
        serviceId: req.service?._id || "", // Populate serviceId
        
        // Relations
        applicant: req.applicant ? {
          id: req.applicant._id,
          name: req.applicant.fullName || "Sin nombre",
          documentNumber: req.applicant.documentNumber,
          phoneNumber: req.applicant.phoneNumber,
          address: req.applicant.address,
        } : undefined,

        distributor: req.distributor ? {
          id: req.distributor._id,
          name: req.distributor.title || "Sin nombre",
        } : undefined,

        subservice: req.service ? {
          id: req.service._id,
          name: req.service.name || "Sin nombre",
        } : undefined,

        // Defaults
        applicationStatus: undefined, 
        paymentStatus: req.paymentStatus ? { id: req.paymentStatus, name: req.paymentStatus } : undefined,
        infoService: undefined,
        paymentInfo: null,
        evidenceStorageId: req.evidenceStorageId,
        evidenceUrl: req.evidenceUrl, // Now correctly populated from backend
        evidenceImage: (req.evidenceStorageId || req.evidenceUrl) ? {
           id: req.evidenceStorageId || "legacy",
           uri: req.evidenceUrl || "", 
           alt: "Evidencia de entrega"
        } : undefined,
        
        data: Array.isArray(req.data) ? req.data.map((d: any) => ({
          id: d._id || d.id,
          fieldId: d.fieldId,
          value: d.value,
          field: d.field ? {
             id: d.field._id || d.field.id,
             name: d.field.name,
             code: d.field.code,
             description: d.field.description,
             type: d.field.type,
             required: d.field.required,
             multiple: d.field.multiple,
             order: d.field.order,
             options: d.field.options,
             status: d.field.status,
             settings: d.field.settings
           } : undefined
        })) : [],
        ...adaptRequestFlowState(req),
    }));
  }

  if (shouldFilterByRequestStatus) {
    transformedData = transformedData.filter(
      (req) => req.requestStatus === status,
    );
  }

  // Client-side pagination
  const totalCount = transformedData.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = transformedData.slice(startIndex, endIndex);

  return {
    data: {
      data: paginatedData,
      meta: {
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    },
    isLoading,
    error: null,
    refetch: () => {}, // No-op for Convex
    isFetching: isLoading,
  };
};

// Deprecated function kept for compatibility if imported directly
export const fetchCompleteRequests = async (_filters: CompleteRequestFilters = {}) => {
  console.warn("fetchCompleteRequests is deprecated. Use useCompleteRequests hook instead.");
  return { data: [] as CompleteRequest[], meta: { count: 0, page: 1, limit: 50, totalPages: 0 } };
};
