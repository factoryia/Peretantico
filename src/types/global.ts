export interface TaxonomyTerm {
  id: string;
  name: string;
}

export interface TaxonomyApiResponse {
  data: Array<{
    id: string;
    attributes: {
      name: string;
    };
  }>;
}

export type ServiceType =
  | string
  | "node--civil_registry_request"
  | "node--death_certificate_request"
  | "node--marriage_certificate_request"
  | "node--request_medication"
  | "node--water_sample_fridge"
  | "node--property_certification"
  | "node--medical_bills"
  | "node--property_unbundling_request";
