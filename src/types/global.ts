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