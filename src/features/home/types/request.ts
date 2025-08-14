export interface Request {
  id: string
  type: string
  attributes: {
    title: string
    field_application_number: string
    field_application_score?: number
    field_entry_date: string
    field_estimated_application_hour?: number
    field_logistics_costs?: number
    field_service_value?: number
    status: boolean
    promote?: boolean
    sticky?: boolean
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
      [key: string]: any
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
      field_logistics_costs: number
      field_service_value: number
      status: boolean
      promote: boolean
      sticky: boolean
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
      field_application_statuses: {
        data: { type: "taxonomy_term--application_statuses"; id: string }
      }
      field_service_status: {
        data: { type: "taxonomy_term--application_statuses"; id: string }
      }
    }
  }
}

// Helper types for related entities
export interface Applicant {
  id: string
  name: string
  email?: string
  phone?: string
}

export interface Distributor {
  id: string
  name: string
  email?: string
  phone?: string
  status?: string
}

export interface Subservice {
  id: string
  name: string
  code?: string
  value?: string
  priorityValue?: string
}

export interface ApplicationStatus {
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
