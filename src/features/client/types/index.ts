// types.ts
export interface ProfileAttribute {
  drupal_internal__nid: number
  drupal_internal__vid: number
  langcode: string
  revision_timestamp: string
  status: boolean
  title: string
  created: string
  changed: string
  promote: boolean
  sticky: boolean
  default_langcode: boolean
  revision_translation_affected: boolean
  path: {
    alias: string | null
    pid: number | null
    langcode: string
  }
  field_address: string
  field_birth_date: string
  field_department: string | null
  field_document_number: string
  field_full_name: string
  field_id: string | null
  field_mail: string
  field_municipality_residence: string | null
  field_phone_number: string
}

export interface RelationshipData {
  type: string
  id: string
  meta: {
    drupal_internal__target_id: number
  }
}

export interface ProfileRelationships {
  node_type: {
    data: RelationshipData
    links: {
      related: { href: string }
      self: { href: string }
    }
  }
  revision_uid: {
    data: RelationshipData
    links: {
      related: { href: string }
      self: { href: string }
    }
  }
  uid: {
    data: RelationshipData
    links: {
      related: { href: string }
      self: { href: string }
    }
  }
  field_gender: {
    data: RelationshipData
    links: {
      related: { href: string }
      self: { href: string }
    }
  }
  field_parent_type: {
    data: RelationshipData | null
    links: {
      related: { href: string }
      self: { href: string }
    }
  }
  field_type_document: {
    data: RelationshipData
    links: {
      related: { href: string }
      self: { href: string }
    }
  }
}

export interface ProfileDataItem {
  type: string
  id: string
  links: {
    self: { href: string }
  }
  attributes: ProfileAttribute
  relationships: ProfileRelationships
}

export interface ProfileApiResponse {
  jsonapi: {
    version: string
    meta: {
      links: {
        self: { href: string }
      }
    }
  }
  data: ProfileDataItem[]
  meta: {
    count: number
    omitted?: {
      detail: string
      links: {
        help: { href: string }
        [key: string]: any
      }
    }
  }
  links: {
    self: { href: string }
  }
}

// Simplified Customer type for UI components
export interface Customer {
  id: string
  fullName: string
  documentType: string // This will be the label, e.g., "Cédula de Ciudadanía"
  documentNumber: string
  birthDate: string // YYYY-MM-DD
  gender: string // This will be the label, e.g., "Masculino"
  phoneNumber: string
  email: string
  department: string
  municipality: string
  address: string
  parentStatus: string // This will be the label, e.g., "Sí"
}

export type FormMode = "create" | "view" | "edit"

// Form values for API submission
export interface CustomerFormValues {
  fullName: string
  documentType: string // Value (e.g., "CC")
  documentNumber: string
  birthDate: string // YYYY-MM-DD
  gender: string // Value (e.g., "masculino")
  phoneNumber: string
  email: string
  department: string
  municipality: string
  address: string
  parentStatus: string // Value (e.g., "si")
}

// Constants for select options
export const documentTypes = [
  { value: "CC", label: "Cédula de Ciudadanía", id: "46e92f21-b5c2-4e1b-92d2-81917eb91499" }, // Example ID
  { value: "TI", label: "Tarjeta de Identidad", id: "another-uuid-for-ti" },
  { value: "CE", label: "Cédula de Extranjería", id: "yet-another-uuid-for-ce" },
  // Add more as needed
]

export const genders = [
  { value: "masculino", label: "Masculino", id: "2b939ab9-39a2-4c4f-9bf6-387813d862cf" }, // Example ID
  { value: "femenino", label: "Femenino", id: "uuid-for-femenino" },
  { value: "otro", label: "Otro", id: "uuid-for-otro" },
]

export const parentStatuses = [
  { value: "si", label: "Sí", id: "a36ac584-e874-408c-b5cc-aee0890764a0" }, // Example ID
  { value: "no", label: "No", id: "uuid-for-no" },
]

export const colombianDepartments = [
  { value: "Amazonas", label: "Amazonas" },
  { value: "Antioquia", label: "Antioquia" },
  { value: "Arauca", label: "Arauca" },
  { value: "Atlántico", label: "Atlántico" },
  { value: "Bolívar", label: "Bolívar" },
  { value: "Boyacá", label: "Boyacá" },
  { value: "Caldas", label: "Caldas" },
  { value: "Caquetá", label: "Caquetá" },
  { value: "Casanare", label: "Casanare" },
  { value: "Cauca", label: "Cauca" },
  { value: "Cesar", label: "Cesar" },
  { value: "Chocó", label: "Chocó" },
  { value: "Córdoba", label: "Córdoba" },
  { value: "Cundinamarca", label: "Cundinamarca" },
  { value: "Guainía", label: "Guainía" },
  { value: "Guaviare", label: "Guaviare" },
  { value: "Huila", label: "Huila" },
  { value: "La Guajira", label: "La Guajira" },
  { value: "Magdalena", label: "Magdalena" },
  { value: "Meta", label: "Meta" },
  { value: "Nariño", label: "Nariño" },
  { value: "Norte de Santander", label: "Norte de Santander" },
  { value: "Putumayo", label: "Putumayo" },
  { value: "Quindío", label: "Quindío" },
  { value: "Risaralda", label: "Risaralda" },
  { value: "San Andrés y Providencia", label: "San Andrés y Providencia" },
  { value: "Santander", label: "Santander" },
  { value: "Sucre", label: "Sucre" },
  { value: "Tolima", label: "Tolima" },
  { value: "Valle del Cauca", label: "Valle del Cauca" },
  { value: "Vaupés", label: "Vaupés" },
  { value: "Vichada", label: "Vichada" },
]

export const colombianMunicipalities: Record<string, { value: string; label: string }[]> = {
  Meta: [
    { value: "VILLAVICENCIO", label: "Villavicencio" },
    { value: "ACACIAS", label: "Acacías" },
    { value: "BARRANCA DE UPÍA", label: "Barranca de Upía" },
  ],
  Cundinamarca: [
    { value: "Bogotá", label: "Bogotá D.C." },
    { value: "Soacha", label: "Soacha" },
    { value: "Zipaquirá", label: "Zipaquirá" },
  ],
  // Add more departments and their municipalities as needed
}
