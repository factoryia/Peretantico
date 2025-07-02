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