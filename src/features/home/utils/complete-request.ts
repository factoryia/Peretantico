import api from "@/api";
import { useQuery } from "@tanstack/react-query";
import type { ServiceType } from "@/types/global";

// --- Interfaces ---

interface CompleteRequestsApiResponse {
  data: CompleteRequest[];
  included?: any[];
  meta: {
    count: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}
}

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
  isPrioritized?: boolean;
  requestStatus?: "Atendida" | "EnProceso" | "Finalizada" | "Incompleta";
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
// largely unused in new backend unless we map 'data' field to these structures
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

// --- Main Service Logic ---

export const fetchCompleteRequests = async (
  filters: CompleteRequestFilters = {},
): Promise<CompleteRequestsApiResponse> => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      subservice,
      assignedDistributor,
      requestNumber,
      periodo,
      zonaId,
      isPrioritized,
      paymentStatus,
      search,
    } = filters;

    // Build params for new backend
    const params: Record<string, any> = {};

    // Pagination
    params.page = page;
    params.limit = limit;

    // Status mapping: backend expects boolean true/false or string "true"/"false"
    if (status) {
        if (status === "true" || status === "1" || status === "active") {
            params.status = "true";
        } else if (status === "false" || status === "0" || status === "inactive") {
            params.status = "false";
        }
    }

    // Subservice -> ServiceId
    if (subservice && subservice !== "all") {
        params.serviceId = subservice;
    }

    // Distributor
    if (assignedDistributor && assignedDistributor !== "all") {
        params.distributorId = assignedDistributor;
    }

    // Request Number
    if (requestNumber) {
        params.applicationNumber = requestNumber;
    }

    // New filters
    if (periodo && periodo !== "all") {
        params.periodo = periodo;
    }
    if (zonaId && zonaId !== "all") {
        params.zonaId = zonaId;
    }
    if (isPrioritized !== undefined) {
        params.isPrioritized = isPrioritized;
    }
    if (paymentStatus && paymentStatus !== "all") {
        params.paymentStatus = paymentStatus;
    }
    if (search) {
        params.search = search;
    }

    const response = await api.get<any[]>("/requests", { params });
    const requests = Array.isArray(response.data) ? response.data : [];

    // Transform Data
    const transformedData: CompleteRequest[] = requests.map((req: any) => {
        const rawServiceData =
          Array.isArray(req.data)
            ? req.data
            : Array.isArray((req as any).serviceData)
            ? (req as any).serviceData
            : [];
        return {
            id: req.id,
            drupal_internal__nid: 0, // Deprecated/Not available
            title: req.title || "",
            created: req.createdAt,
            field_application_number: req.applicationNumber || "",
            field_entry_date: req.entryDate ? new Date(req.entryDate).toISOString() : "",
            field_application_score: req.applicationScore || 0,
            field_estimated_application_hour: req.estimatedApplicationHour || 0,
            field_estimated_prioritized_hour: req.estimatedPrioritizedHour || 0,
            field_logistics_costs: Number(req.logisticsCosts) || 0,
            field_service_value: Number(req.serviceValue) || 0,
            field_prioritized_value: Number(req.prioritizedValue) || 0,
            field_priority_value: Number(req.prioritizedValue) || 0, // Duplicate mapping
            field_is_recurring: req.isRecurring || false,
            field_observations: req.observations || "",
            paymentMethod: req.paymentMethod ?? null,
            isPrioritized: req.isPrioritized ?? false,
            requestStatus: req.requestStatus ?? "EnProceso",
            status: req.status,
            promote: req.promote,
            sticky: req.sticky,
            
            // Relations
            applicant: req.applicant ? {
                id: req.applicant.id,
                name: req.applicant.fullName || req.applicant.title || "Sin nombre",
                documentNumber: req.applicant.documentNumber,
                phoneNumber: req.applicant.phoneNumber,
                address: req.applicant.address,
            } : undefined,

            distributor: req.distributor ? {
                id: req.distributor.id,
                name: req.distributor.title || req.distributor.name || "Sin nombre",
            } : undefined,

            subservice: req.service ? {
                id: req.service.id,
                name: req.service.name || "Sin nombre",
            } : undefined,

            // New backend might not return these taxonomy terms directly yet
            applicationStatus: undefined, 
            paymentStatus: undefined,
            
            // InfoService (RequestData) mapping could be added here if needed
            infoService: undefined,
            paymentInfo: null,
            evidenceImage:
              req.attachments && req.attachments.length > 0
                ? {
                    id: req.attachments[0].id,
                    uri: req.attachments[0].url,
                    alt: req.attachments[0].fileName,
                  }
                : undefined,
            data: rawServiceData.map((item: any) => ({
              id: item.id,
              fieldId: item.fieldId,
              value: item.value,
              field: item.field
                ? {
                    id: item.field.id,
                    name: item.field.name,
                    code: item.field.code ?? null,
                    description: item.field.description ?? null,
                    type:
                      item.field.type ||
                      ("Text" as
                        | "Text"
                        | "Number"
                        | "Date"
                        | "Boolean"
                        | "Select"
                        | "File"),
                    required: !!item.field.required,
                    multiple: !!item.field.multiple,
                    order:
                      typeof item.field.order === "number"
                        ? item.field.order
                        : 0,
                    options: item.field.options ?? null,
                    status: !!item.field.status,
                    settings: item.field.settings ?? null,
                  }
                : undefined,
            })),
        };
    });

    // Client-side pagination since backend returns all for now
    const totalCount = transformedData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = transformedData.slice(startIndex, endIndex);

    return {
      data: paginatedData as any, // Cast to any to satisfy RequestsApiResponse.data type (Request[])
      meta: {
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching complete requests:", error);
    throw error;
  }
};

export const useCompleteRequests = (filters: CompleteRequestFilters = {}) => {
  return useQuery({
    queryKey: ["complete-requests", filters],
    queryFn: () => fetchCompleteRequests(filters),
    // Removed select: transformCompleteRequests because we transform in fetch
  });
};
