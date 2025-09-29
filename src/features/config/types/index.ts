export interface Category {
  uuid: string;
  name: string;
  description: string | null;
  status: "activo" | "inactivo";
  created: string;
}

export interface Service {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description?: string;
  status: "activo" | "inactivo";
  creationDate: string;
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
  field_description?: string;
  field_date: string; // ISO date
  field_is_annual: boolean; // <-- IMPORTANTE, boolean
  status: boolean; // <-- IMPORTANTE, boolean
  created?: string; // puede ser 'created', 'revision_timestamp', etc.
}
