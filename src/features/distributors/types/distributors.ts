import type { TaxonomyTerm } from "@/types/global";

export interface Distributor {
  id: string;
  status: boolean;
  title: string;
  currentAvailability: boolean;
  documentNumber: string;
  entryDate: string;
  vehicleId: string | null;
  email: string | null;
  observations: string | null;
  phoneNumber: string;
  documentType: TaxonomyTerm;
  coverageArea: TaxonomyTerm;
  transportationType: TaxonomyTerm;
}

export interface FetchDistributorsParams {
  coverageAreaId?: string;
  status?: boolean;
  fullName?: string;
  documentNumber?: string;
  transportationTypeId?: string;
  documentType?: string;
  page?: number;
  limit?: number;
}
