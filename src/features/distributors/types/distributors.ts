import type { TaxonomyTerm } from "@/types/global";

export interface Distributor {
  id: string;
  status: boolean;
  title: string;
  currentAvailability: boolean;
  documentNumber: string;
  entryDate: string;
  vehicleId: string;
  email: string;
  observations: string | null;
  phoneNumber: string;
  documentType: TaxonomyTerm;
  coverageArea: TaxonomyTerm;
  transportationType: TaxonomyTerm;
}

export interface DistributorsApiResponse {
  data: Array<{
    id: string;
    attributes: {
      title: string;
      status: boolean;
      field_current_availability: boolean;
      field_document_number: string;
      field_entry_date: string;
      field_id_vehicle: string;
      field_mail: string;
      field_observations: string | null;
      field_phone_number: string;
    };
    relationships: {
      field_type_document: { data: { id: string } };
      field_coverage_area: { data: { id: string } };
      field_type_transportation: { data: { id: string } };
    };
  }>;
  included?: Array<{
    id: string;
    type: string;
    attributes: { name: string };
  }>;
  meta?: { count: number };
}

export interface FetchDistributorsParams {
  coverageAreaId?: string;
  status?: boolean;
  fullName?: string;
  documentNumber?: string;
  page?: number;
  limit?: number;
}
