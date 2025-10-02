export interface Request {
    id: string
    type: string
    attributes: {
      title: string
      field_application_number: string
      field_application_score?: number
      field_entry_date: string
      field_estimated_application_hour?: number
      field_estimated_prioritized_hour?: number
      field_priority_estimated_hours?: number
      field_logistics_costs?: number
      field_service_value?: number
      field_prioritized_value?: number
      field_priority_value?: number
      field_is_recurring?: boolean
      field_service_status?: string
      field_request_status?: string
      field_observations?: string
      field_payment_status?: string
      field_used_channel?: string
      status: boolean
      promote?: boolean
      sticky: boolean
      created: string
      changed: string
    }
    relationships: {
      field_applicant?: {
        data?: {
          id: string
          type: string
        }
      }
      field_distributor_data?: {
        data?: {
          id: string
          type: string
        }
      }
      field_subservice?: {
        data?: {
          id: string
          type: string
        }
      }
      field_category?: {
        data?: {
          id: string
          type: string
        }
      }
      field_service?: {
        data?: {
          id: string
          type: string
        }
      }
      field_application_statuses?: {
        data?: {
          id: string
          type: string
        }
      }
      field_service_status?: {
        data?: {
          id: string
          type: string
        }
      }
      field_payment_status?: {
        data?: {
          id: string
          type: string
        }
      }
      field_used_channel?: {
        data?: {
          id: string
          type: string
        }
      }
      field_info_service?: {
        data?: {
          id: string
          type: string
          meta?: {
            drupal_internal__target_id: number
          }
        }
      }
    }
  }
  
  export interface RequestsApiResponse {
    data: Request[]
    included?: Array<{
      id: string
      type: string
      attributes: {
        name?: string
        drupal_internal__tid?: number
        [key: string]: unknown
      }
    }>
    meta?: {
      count: number
    }
  }
  
  export interface RequestFilters {
    status?: string
    subservice?: string
    assignedDistributor?: string
    requestNumber?: string
    applicantName?: string
    page?: number
    limit?: number
  }
  
  export interface RequestFormValues {
    title: string
    field_application_score: number
    field_estimated_application_hour?: number
    field_logistics_costs?: number
  }
  
    export interface UpdateRequestPayload {
    data: {
      type: "node--request"
      id: string
      attributes: {
        title: string
        field_application_number?: string
        field_application_score?: number
        field_entry_date?: string
        field_estimated_application_hour?: number
        field_logistics_costs?: number
        field_service_value?: number
        status?: boolean
        promote?: boolean
        sticky?: boolean
      }
      relationships?: {
        field_applicant?: {
          data: { type: "node--profile"; id: string }
        }
        field_distributor_data?: {
          data: { type: "node--distributor"; id: string }
        }
        field_subservice?: {
          data: { type: "taxonomy_term--category"; id: string }
        }
      }
    }
  }
  
  export interface CreateRequestPayload {
    data: {
      type: "node--request"
      attributes: {
        title: string
        field_application_number: string
        field_application_score: number
        field_entry_date: string
        field_estimated_application_hour: number
        field_estimated_prioritized_hour?: number
        field_logistics_costs: number
        field_service_value: number
        field_prioritized_value?: number
        field_is_recurring?: boolean
        field_service_status?: string
        field_request_status?: string
        field_observations?: string
        field_payment_status?: string
        field_used_channel?: string
        status?: boolean
        promote: boolean
        sticky: boolean
        // Campos dinámicos del subservicio (p.ej. pharmacy_claims)
        field_drugstore?: string
        field_eps?: string
        field_ips_address?: string | null
        field_path?: Array<{
          uri: string
          title: string
          options: unknown[]
        }>
        // Permitir otros campos dinámicos
        [key: string]: unknown
      }
      relationships: {
        field_applicant: {
          data: { type: "node--profile"; id: string }
        }
        field_subservice?: {
          data: { type: "taxonomy_term--category"; id: string }
        }
        field_distributor_data?: {
          data: { type: "node--distributor"; id: string }
        }
        field_application_statuses?: {
          data: { type: "taxonomy_term--application_statuses"; id: string }
        }
        field_service_status?: {
          data: { type: "taxonomy_term--application_statuses"; id: string }
        }
        field_payment_status?: {
          data: { type: "taxonomy_term--payment_status"; id: string }
        }
        field_used_channel?: {
          data: { type: "taxonomy_term--used_channel"; id: string }
        }
        field_info_service?: {
          data: { type: "node"; id: string }
        }
        field_category?: {
          data: { type: "taxonomy_term--category"; id: string }
        }
        field_service?: {
          data: { type: "taxonomy_term--category"; id: string }
        }
      }
    }
  }
  
  // Helper types for related entities
  export interface ApplicantBasic {
    id: string
    name: string
    email?: string
    phone?: string
  }
  
  export interface DistributorBasic {
    id: string
    name: string
    email?: string
    phone?: string
    status?: string
  }
  
  export interface SubserviceBasic {
    id: string
    name: string
    code?: string
    value?: string
    priorityValue?: string
  }
  
  export interface ApplicationStatusBasic {
    id: string
    name: string
  }
  
  // Nuevos tipos para asignación
  export interface AssignDistributorPayload {
    data: {
      type: "node--request"
      id: string
      relationships: {
        field_distributor_data: {
          data: { type: "node--distributor"; id: string }
        }
      }
    }
  }
  
  export interface AssignApplicantPayload {
    data: {
      type: "node--request"
      id: string
      relationships: {
        field_applicant: {
          data: { type: "node--profile"; id: string }
        }
      }
    }
  }
  
  // Tipo para el modal de asignación
  export interface AssignmentModalData {
    requestId: string
    requestNumber: string
    currentDistributor?: string
    currentApplicant?: string
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
    id: string
    type: string
    attributes: {
      name: string
      description?: string
      [key: string]: unknown
    }
  }
  
  export interface PaymentStatus extends TaxonomyTerm {
    type: "taxonomy_term--payment_status"
  }
  
  export interface UsedChannel extends TaxonomyTerm {
    type: "taxonomy_term--used_channel"
  }
  
  export interface ApplicationStatus extends TaxonomyTerm {
    type: "taxonomy_term--application_statuses"
  }
  