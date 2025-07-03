export interface Category {
  uuid: string;
  name: string;
  description: string | null;
  status: boolean;
  created: string;
}

export interface Service {
  id: string;
  categoryId: number;
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
  codigo: string;
  valor: string;
  valorPrioridad: string;
  estado: "activo" | "inactivo";
  fechaCreacion: string;
}
