export interface Category {
  uuid: string;
  name: string;
  description: string | null;
  status: "activo" | "inactivo";
  created: string;
}

export type FieldType = "Text" | "Number" | "Date" | "Boolean" | "Select" | "File";

export interface WorkflowBranchRule {
  fieldId: string;
  equals?: string;
}

export interface WorkflowBranch {
  key: string;
  label?: string;
  fieldIds?: string[];
  rules?: WorkflowBranchRule[];
}

export interface WorkflowConfig {
  addressStrategy?: "profile_confirm" | "always_prompt";
  requirePaymentMethod?: boolean;
  paymentMethods?: Array<"cash" | "transfer" | "card" | "delivery">;
  branches?: WorkflowBranch[];
}

export interface ServiceField {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  type: FieldType;
  required: boolean;
  multiple: boolean;
  order: number;
  options?: unknown | null;
  status: boolean;
  settings?: {
    maxFiles?: number;
    acceptedMimeTypes?: string[];
  } | null;
}

export interface Service {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  price: number;
  status: "activo" | "inactivo";
  creationDate: string;
  fields?: ServiceField[];
  // Priority support fields
  hasPriority?: boolean;
  priorityPrice?: number;
  estimatedHours?: number;
  priorityHours?: number;
  workflowMode?: "legacy" | "deterministic";
  workflowConfig?: WorkflowConfig | null;
  // Service category for workflow routing
  category?: "salud" | "notarial" | "catastral" | "logistica";
}

export interface Subservice {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  servicioId: string;
  servicioNombre: string;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  valor: string;
  valorPrioridad: string;
  estado: "activo" | "inactivo";
  fechaCreacion: string;
}

export interface SpecialDate {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date
  repeat: boolean;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}
