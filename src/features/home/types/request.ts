export interface Request {
  id: string;
  type: string;
  attributes: {
    drupal_internal__nid: number;
    title: string;
    field_application_number: string;
    field_application_score?: number;
    field_entry_date: string;
    field_estimated_application_hour?: number;
    field_estimated_prioritized_hour?: number;
    field_priority_estimated_hours?: number;
    field_logistics_costs?: number;
    field_service_value?: number;
    field_prioritized_value?: number;
    field_priority_value?: number;
    field_is_recurring?: boolean;
    field_service_status?: string;
    field_request_status?: string;
    field_observations?: string;
    field_payment_status?: string;
    field_used_channel?: string;
    status: boolean;
    promote?: boolean;
    sticky: boolean;
    created: string;
    changed: string;
  };
  relationships: {
    field_applicant?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_distributor_data?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_subservice?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_category?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_service?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_application_statuses?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_service_status?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_payment_status?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_used_channel?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_info_service?: {
      data?: {
        id: string;
        type: string;
      };
    };
    field_image?: {
      data?: {
        id: string;
        type: string;
      };
    };
  };
}

export interface RequestsApiResponse {
  data: Request[];
  included?: Array<{
    id: string;
    type: string;
    attributes: {
      name?: string;
      drupal_internal__tid?: number;
      [key: string]: unknown;
    };
    relationships?: {
      [key: string]: {
        data?: {
          id: string;
          type: string;
        };
      };
    };
  }>;
  meta?: {
    count: number;
  };
}

export interface RequestFilters {
  status?: string;
  subservice?: string;
  assignedDistributor?: string;
  requestNumber?: string;
  applicantName?: string;
  page?: number;
  limit?: number;
}

export interface RequestFormValues {
  title: string;
  field_application_score: number;
  field_estimated_application_hour?: number;
  field_logistics_costs?: number;
}

export interface UpdateRequestPayload {
  data: {
    type: "node--request";
    id: string;
    attributes: {
      title: string;
      field_application_number?: string;
      field_application_score?: number;
      field_entry_date?: string;
      field_estimated_application_hour?: number;
      field_logistics_costs?: number;
      field_service_value?: number;
      field_is_recurring?: boolean;
      field_observations?: string | null;
      serviceId?: string;
      status?: boolean;
      promote?: boolean;
      sticky?: boolean;
    };
    relationships?: {
      field_applicant?: {
        data: { type: "node--profile"; id: string };
      };
      field_distributor_data?: {
        data: { type: "node--distributor"; id: string };
      };
      field_subservice?: {
        data: { type: "taxonomy_term--category"; id: string };
      };
    };
  };
  serviceData?: RequestDataDto[];
  paymentMethod?: string | null;
  isPrioritized?: boolean;
  requestStatus?: RequestStatusEnum;
}

export interface CreateRequestPayload {
  data: {
    type: "node--request";
    attributes: {
      title: string;
      field_application_number: string;
      field_application_score: number;
      field_entry_date: string;
      field_estimated_application_hour: number;
      field_estimated_prioritized_hour?: number | null;
      field_logistics_costs: number;
      field_service_value: number;
      field_prioritized_value?: number | null;
      field_is_recurring?: boolean;
      field_service_status?: string | null;
      field_request_status?: string;
      field_observations?: string;
      field_payment_status?: string | null;
      field_used_channel?: string | null;
      status: boolean;
      promote: boolean;
      sticky: boolean;
      [key: string]: unknown;
    };
    relationships: {
      field_applicant: {
        data: { type: "node--profile"; id: string };
      };
      field_subservice?: {
        data: { type: "taxonomy_term--category"; id: string };
      };
      field_distributor_data?: {
        data: { type: "node--distributor"; id: string };
      } | null;
      field_application_statuses: {
        data: { type: "taxonomy_term--application_statuses"; id: string };
      };
      field_service_status: {
        data: { type: "taxonomy_term--application_statuses"; id: string };
      };
      field_payment_status?: {
        data: { type: "taxonomy_term--payment_status"; id: string };
      } | null;
      field_used_channel?: {
        data: { type: "taxonomy_term--used_channel"; id: string };
      } | null;
      field_info_service?: {
        data: { type: "node"; id: string };
      } | null;
      field_category?: {
        data: { type: "taxonomy_term--category"; id: string };
      };
      field_service?: {
        data: { type: "taxonomy_term--category"; id: string };
      };
      field_coverage_area?: {
        data: { type: "taxonomy_term--coverage_area"; id: string };
      };
      [key: string]: unknown;
    };
  };
}

// Helper types for related entities
export interface ApplicantBasic {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface DistributorBasic {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
}

export interface SubserviceBasic {
  id: string;
  name: string;
  code?: string;
  value?: string;
  priorityValue?: string;
}

export interface ApplicationStatusBasic {
  id: string;
  name: string;
}

// Nuevos tipos para asignación
// Tipo para el modal de asignación
export interface AssignmentModalData {
  requestId: string;
  requestNumber: string;
  currentDistributor?: string;
  currentApplicant?: string;
}

export interface EditRequestFormData {
  // Campos del solicitante
  applicantId: string;

  // Campos de la solicitud
  title: string;
  applicationNumber: string;
  applicationScore: number;
  entryDate: string;
  categoryId: string;
  serviceId: string;
  subserviceId: string;
  serviceCode: string;
  serviceValue: number;
  priorityValue: number;
  paymentStatus: string;
  usedChannel: string;
  estimatedHours: number;
  priorityEstimatedHours: number;
  logisticsCosts: number;
  isRecurring: boolean;
  dataValues?: Record<string, unknown>;
  paymentMethod: string;
  isPrioritized: boolean;

  // Campos del repartidor
  distributorId: string;

  // Gestión de solicitud
  serviceStatus: string;
  requestStatus: string;
  observations: string;

  // Configuración
  status: boolean;
  promote: boolean;
  sticky: boolean;
}

export interface Category {
  uuid: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string;
}

export interface Subservice {
  id: string;
  name: string;
  serviceId: string;
}

export interface Applicant {
  id: string;
  fullName: string;
  documentNumber: string;
  documentType: string;
  birthDate: string;
  gender: string;
  phone: string;
  email: string;
}

export interface Distributor {
  id: string;
  title: string;
  documentNumber: string;
  documentType: string;
  phone: string;
  email: string;
  status: string;
}

// Nuevos tipos para taxonomías
export interface TaxonomyTerm {
  id: string;
  type: string;
  attributes: {
    name: string;
    description?: string;
    [key: string]: unknown;
  };
}

export interface PaymentStatus extends TaxonomyTerm {
  type: "taxonomy_term--payment_status";
}

export interface UsedChannel extends TaxonomyTerm {
  type: "taxonomy_term--used_channel";
}

export interface ApplicationStatus extends TaxonomyTerm {
  type: "taxonomy_term--application_statuses";
}

// DTOs for Backend Requests (Simplified API)
export interface RequestDataDto {
  fieldId: string;
  value: unknown;
}

export type RequestStatusEnum = "Atendida" | "EnProceso" | "Finalizada" | "Incompleta";

export interface CreateRequestDto {
  applicantId: string;
  serviceId: string;
  title?: string | null;
  entryDate: string;
  data: RequestDataDto[];
  paymentMethod?: string | null;
  isPrioritized?: boolean;
  requestStatus?: RequestStatusEnum;
}

export interface UpdateRequestMetaDto {
  title?: string | null;
  observations?: string | null;
  status?: boolean;
  promote?: boolean;
  sticky?: boolean;
  isRecurring?: boolean;
  applicantId?: string;
  serviceId?: string;
  distributorId?: string;
  entryDate?: string;
  estimatedApplicationHour?: number;
  estimatedPrioritizedHour?: number;
  logisticsCosts?: number;
  serviceValue?: number;
  prioritizedValue?: number;
  data?: RequestDataDto[];
  paymentMethod?: string | null;
  isPrioritized?: boolean;
  requestStatus?: RequestStatusEnum;
}

export interface AssignDistributorDto {
  distributorId: string;
}

export interface UpdateStatusDto {
  status: boolean;
  observations?: string | null;
}

export interface BackendRequest {
  id: string;
  applicationNumber?: string | null;
  title?: string | null;
  entryDate?: string | null;
  applicant?: unknown;
  distributor?: unknown;
  service?: unknown;
  data?: unknown;
  attachments?: unknown;
  paymentMethod?: string | null;
  isPrioritized?: boolean;
  requestStatus?: RequestStatusEnum;
}

export interface RequestsListResponse {
  data: BackendRequest[];
  total?: number;
  page?: number;
  limit?: number;
}
