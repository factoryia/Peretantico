import api from "@/api";
import { useQuery } from "@tanstack/react-query";
import type { RequestsApiResponse } from "../types/request";
import type { ServiceType } from "@/types/global";
import { fetchPaymentByRequest, type PaymentDTO } from "./get-payment-method";

// --- Interfaces ---

interface CompleteRequestsApiResponse extends RequestsApiResponse {
  payments?: Record<string, PaymentDTO | null>;
  meta: {
    count: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface CompleteRequest {
  id: string;
  drupal_internal__nid: number;
  title: string;
  created: string;
  field_application_number: string;
  field_application_score?: number;
  field_entry_date: string;
  field_estimated_application_hour?: number;
  field_estimated_prioritized_hour?: number;
  field_priority_estimated_hours?: number;
  field_is_recurring?: boolean;
  field_logistics_costs?: number;
  field_prioritized_value?: number;
  field_priority_value?: number;
  field_service_value?: number;
  field_service_status?: string;
  field_request_status?: string;
  field_observations?: string;
  field_payment_status_id?: string;
  field_used_channel?: string;
  status?: boolean;
  promote?: boolean;
  sticky?: boolean;
  field_info_service?: {
    type: ServiceType;
    id: string;
  };

  applicant?: {
    id: string;
    name: string;
    documentNumber?: string;
    phoneNumber?: string;
    address?: string;
    documentType?: { id: string; name: string };
  };
  applicationStatus?: { id: string; name: string };
  distributor?: { id: string; name: string };
  paymentStatus?: { id: string; name: string };
  subservice?: { id: string; name: string };
  infoService?: InfoService;
  paymentInfo?: PaymentDTO | null;
}

export interface BaseInfoService {
  id: string;
  type: ServiceType;
  title?: string;
  priority?: string;
}

export interface MedicationInfoService extends BaseInfoService {
  type: "node--request_medication";
  eps?: string;
  drugstore?: string;
  address?: string;
  phoneContact?: string;
  files?: Array<{ uri: string; title: string; options: any[] }>;
  observations?: string;
}

export interface CivilRegistryInfoService extends BaseInfoService {
  type: "node--civil_registry_request";
  hasRegistrationNumber?: boolean;
  registrantFullName?: string;
  registrantRegistrationCode?: string;
  registryFolioNumber?: string;
  registryInscriptionDate?: string;
  registryNotaryNumber?: string;
  registryTomeNumber?: string;
  registrySerialNumber?: string;
  files?: Array<{ uri: string; title: string; options: any[] }>;
}

export interface DeathCertificateInfoService extends BaseInfoService {
  type: "node--death_certificate_request";
  documentNumber?: string;
  hasOriginalDeathCertificate?: boolean;
  registrantFullName?: string;
  registrySerialNumber?: string;
  signedAuthorization?: { uri: string; title: string; options: any[] };
}

export interface MarriageCertificateInfoService extends BaseInfoService {
  type: "node--marriage_certificate_request";
  applicantIdCopy?: Array<{ uri: string; title: string; options: any[] }>;
  marriageCertificate?: { uri: string; title: string; options: any[] };
  signedAuthorization?: { uri: string; title: string; options: any[] };
  marriageCase?: string;
  marriageRegistry?: string;
  marriageType?: string;
}

export type InfoService =
  | MedicationInfoService
  | CivilRegistryInfoService
  | DeathCertificateInfoService
  | MarriageCertificateInfoService
  | (BaseInfoService & { type: string; [key: string]: any });

export interface CompleteRequestFilters {
  status?: string;
  subservice?: string;
  assignedDistributor?: string;
  requestNumber?: string;
  applicantName?: string;
  page?: number;
  limit?: number;
}

// interface ApiEntity {
//   id: string;
//   type: string;
//   attributes: { [key: string]: unknown };
//   relationships?: {
//     [key: string]: {
//       data?: { id: string; type: string };
//     };
//   };
// }

// --- Helper Functions ---

const fetchRelatedEntities = async (
  _type: string,
  ids: Set<string>,
  endpoint: string,
  includes?: string
) => {
  if (ids.size === 0) return { data: [], included: [] };
  const res = await api.get(endpoint, {
    params: {
      "filter[id][condition][path]": "id",
      "filter[id][condition][operator]": "IN",
      "filter[id][condition][value]": Array.from(ids).join(","),
      ...(includes && { include: includes }),
      "page[limit]": 100,
    },
  });
  return {
    data: res.data?.data || [],
    included: res.data?.included || [],
  };
};

const fetchMissingInclusions = async (requests: any[]): Promise<any[]> => {
  const idsMap: Record<string, Set<string>> = {
    applicant: new Set(),
    distributor: new Set(),
    subservice: new Set(),
    status: new Set(),
    paymentStatus: new Set(),
  };

  const infoServicesByType: Record<string, Set<string>> = {};

  requests.forEach((req) => {
    const rels = req.relationships;
    if (rels.field_applicant?.data?.id)
      idsMap.applicant.add(rels.field_applicant.data.id);
    if (rels.field_distributor_data?.data?.id)
      idsMap.distributor.add(rels.field_distributor_data.data.id);
    if (rels.field_subservice?.data?.id)
      idsMap.subservice.add(rels.field_subservice.data.id);
    if (rels.field_application_statuses?.data?.id)
      idsMap.status.add(rels.field_application_statuses.data.id);
    if (rels.field_payment_status?.data?.id)
      idsMap.paymentStatus.add(rels.field_payment_status.data.id);

    const info = rels.field_info_service?.data;
    if (info) {
      if (!infoServicesByType[info.type])
        infoServicesByType[info.type] = new Set();
      infoServicesByType[info.type].add(info.id);
    }
  });

  const allInclusions: any[] = [];

  // Fetch standard entities
  const baseFetches = [
    fetchRelatedEntities(
      "node--profile",
      idsMap.applicant,
      "/api/node/profile",
      "field_type_document"
    ),
    fetchRelatedEntities(
      "node--distributor",
      idsMap.distributor,
      "/api/node/distributor"
    ),
    fetchRelatedEntities(
      "taxonomy_term--category",
      idsMap.subservice,
      "/api/taxonomy_term/category"
    ),
    fetchRelatedEntities(
      "taxonomy_term--application_statuses",
      idsMap.status,
      "/api/taxonomy_term/application_statuses"
    ),
    fetchRelatedEntities(
      "taxonomy_term--payment_status",
      idsMap.paymentStatus,
      "/api/taxonomy_term/payment_status"
    ),
  ];

  // Fetch info services
  const infoServiceConfig: Record<
    string,
    { endpoint: string; includes?: string }
  > = {
    "node--marriage_certificate_request": {
      endpoint: "/api/node/marriage_certificate_request",
      includes:
        "field_marriage_case,field_marriage_registry,field_marriage_type",
    },
    "node--request_medication": { endpoint: "/api/node/request_medication" },
    "node--civil_registry_request": {
      endpoint: "/api/node/civil_registry_request",
    },
    "node--death_certificate_request": {
      endpoint: "/api/node/death_certificate_request",
    },
  };

  const infoFetches = Object.entries(infoServicesByType).map(([type, ids]) => {
    const config = infoServiceConfig[type];
    return config
      ? fetchRelatedEntities(type, ids, config.endpoint, config.includes)
      : Promise.resolve({ data: [], included: [] });
  });

  const results = await Promise.all([...baseFetches, ...infoFetches]);
  results.forEach((res) => {
    allInclusions.push(...res.data, ...res.included);
  });

  return allInclusions;
};

// --- Main Service Logic ---

export const fetchCompleteRequests = async (
  filters: CompleteRequestFilters = {}
): Promise<CompleteRequestsApiResponse> => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      subservice,
      assignedDistributor,
      requestNumber,
      applicantName,
    } = filters;
    const offset = (page - 1) * limit;

    const params: Record<string, string | number> = {
      include:
        "field_applicant,field_applicant.field_type_document,field_application_statuses,field_distributor_data,field_info_service,field_info_service.field_marriage_case,field_info_service.field_marriage_registry,field_info_service.field_marriage_type,field_payment_status,field_subservice",
      sort: "created",
      "page[limit]": limit,
      "page[offset]": offset,
      "filter[field_info_service][condition][path]": "field_info_service.id",
      "filter[field_info_service][condition][operator]": "IS NOT NULL",
    };

    if (status && status !== "all")
      params["filter[field_application_statuses.name]"] = status;
    else params["filter[status]"] = "1";

    if (subservice && subservice !== "all")
      params["filter[field_subservice.id]"] = subservice;
    if (assignedDistributor && assignedDistributor !== "all")
      params["filter[field_distributor_data.id]"] = assignedDistributor;

    if (requestNumber) {
      params["filter[field_application_number][condition][path]"] =
        "field_application_number";
      params["filter[field_application_number][condition][operator]"] =
        "CONTAINS";
      params["filter[field_application_number][condition][value]"] =
        requestNumber;
    }

    if (applicantName) {
      params["filter[field_applicant.field_full_name][condition][path]"] =
        "field_applicant.field_full_name";
      params["filter[field_applicant.field_full_name][condition][operator]"] =
        "CONTAINS";
      params["filter[field_applicant.field_full_name][condition][value]"] =
        applicantName;
    }

    const response = await api.get<RequestsApiResponse>("/api/node/request", {
      params,
    });

    if (
      response.data.data &&
      (!response.data.included || response.data.included.length === 0)
    ) {
      response.data.included = await fetchMissingInclusions(response.data.data);
    }

    const payments: Record<string, PaymentDTO | null> = {};
    if (response.data.data?.length) {
      const results = await Promise.all(
        response.data.data.map(async (req) => ({
          id: req.id,
          payment: await fetchPaymentByRequest(req.id).catch(() => null),
        }))
      );
      results.forEach((res) => (payments[res.id] = res.payment));
    }

    const totalCount = response.data.meta?.count || 0;
    return {
      ...response.data,
      payments,
      meta: {
        count: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    } as CompleteRequestsApiResponse;
  } catch (error) {
    console.error("Error fetching complete requests:", error);
    throw error;
  }
};

export const transformCompleteRequests = (
  response: RequestsApiResponse
): { data: CompleteRequest[]; meta: any } => {
  if (!response?.data) return { data: [], meta: {} };

  const { data, included = [], meta } = response;
  const payments = (response as CompleteRequestsApiResponse).payments || {};

  const getEntity = (id: string | undefined, type: string) =>
    id
      ? included.find((item) => item.id === id && item.type === type)
      : undefined;

  const getAttr = (id: string | undefined, type: string, attr: string) =>
    getEntity(id, type)?.attributes?.[attr] as string | undefined;

  const transformedData = data.map((request) => {
    const rels = request.relationships;
    const attrs = request.attributes;

    // Resolve Relationships
    const applicant = getEntity(
      rels.field_applicant?.data?.id,
      "node--profile"
    );
    const docTypeId = applicant?.relationships?.field_type_document?.data?.id;

    const infoServiceEntity = getEntity(
      rels.field_info_service?.data?.id,
      rels.field_info_service?.data?.type || ""
    );
    const infoAttrs = infoServiceEntity?.attributes as any;
    const infoRels = infoServiceEntity?.relationships as any;

    let infoServiceData: InfoService | undefined;
    if (infoServiceEntity) {
      const baseInfo = {
        id: infoServiceEntity.id,
        title: infoAttrs?.title,
        priority: infoAttrs?.field_priority,
      };
      const type = infoServiceEntity.type;

      if (type === "node--request_medication") {
        infoServiceData = {
          ...baseInfo,
          type,
          eps: infoAttrs.field_eps,
          drugstore: infoAttrs.field_drugstore,
          address: infoAttrs.field_address,
          phoneContact: infoAttrs.field_phone_contact,
          files: infoAttrs.field_path || [],
          observations: infoAttrs.field_observations,
        };
      } else if (type === "node--civil_registry_request") {
        infoServiceData = {
          ...baseInfo,
          type,
          hasRegistrationNumber: infoAttrs.field_has_registration_number,
          registrantFullName: infoAttrs.field_registrant_full_name,
          registrantRegistrationCode:
            infoAttrs.field_registrant_registration_co,
          registryFolioNumber: infoAttrs.field_registry_folio_number,
          registryInscriptionDate: infoAttrs.field_registry_inscription_date,
          registryNotaryNumber: infoAttrs.field_registry_notary_number,
          registryTomeNumber: infoAttrs.field_registry_tome_number,
          registrySerialNumber: infoAttrs.field_registry_serial_number,
          files: infoAttrs.field_path || [],
        };
      } else if (type === "node--death_certificate_request") {
        infoServiceData = {
          ...baseInfo,
          type,
          documentNumber: infoAttrs.field_document_number,
          hasOriginalDeathCertificate:
            infoAttrs.field_has_original_death_certifi,
          registrantFullName: infoAttrs.field_registrant_full_name,
          registrySerialNumber: infoAttrs.field_registry_serial_number,
          signedAuthorization: infoAttrs.field_signed_authorization,
        };
      } else if (type === "node--marriage_certificate_request") {
        infoServiceData = {
          ...baseInfo,
          type,
          applicantIdCopy: infoAttrs.field_applicant_id_copy || [],
          marriageCertificate: infoAttrs.field_marriage_certificate,
          signedAuthorization: infoAttrs.field_signed_authorization,
          marriageCase: getAttr(
            infoRels?.field_marriage_case?.data?.id,
            "taxonomy_term--marriage_case",
            "name"
          ),
          marriageRegistry: getAttr(
            infoRels?.field_marriage_registry?.data?.id,
            "taxonomy_term--marriage_registration_status",
            "name"
          ),
          marriageType: getAttr(
            infoRels?.field_marriage_type?.data?.id,
            "taxonomy_term--marriage_certificate_type",
            "name"
          ),
        };
      } else {
        infoServiceData = { ...baseInfo, type: type || "unknown" };
      }
    }

    return {
      id: request.id,
      drupal_internal__nid: attrs.drupal_internal__nid as number,
      title: attrs.title as string,
      created: attrs.created as string,
      field_application_number: attrs.field_application_number as string,
      field_application_score: attrs.field_application_score as number,
      field_entry_date: attrs.field_entry_date as string,
      field_estimated_application_hour:
        attrs.field_estimated_application_hour as number,
      field_estimated_prioritized_hour:
        attrs.field_estimated_prioritized_hour as number,
      field_is_recurring: attrs.field_is_recurring as boolean,
      field_logistics_costs: attrs.field_logistics_costs as number,
      field_prioritized_value: (attrs.field_prioritized_value as number) || 0,
      field_service_value: attrs.field_prioritized_value as number,
      field_observations: attrs.field_observations as string,
      field_info_service: rels.field_info_service?.data
        ? {
            type: rels.field_info_service.data.type as ServiceType,
            id: rels.field_info_service.data.id,
          }
        : undefined,
      applicant: applicant
        ? {
            id: applicant.id,
            name: (applicant.attributes.field_full_name ||
              applicant.attributes.title ||
              "Unknown") as string,
            documentNumber: applicant.attributes
              .field_document_number as string,
            phoneNumber: applicant.attributes.field_phone_number as string,
            address: applicant.attributes.field_address as string,
            documentType: docTypeId
              ? {
                  id: docTypeId,
                  name:
                    getAttr(
                      docTypeId,
                      "taxonomy_term--document_type",
                      "name"
                    ) || "Unknown",
                }
              : undefined,
          }
        : undefined,
      applicationStatus: rels.field_application_statuses?.data?.id
        ? {
            id: rels.field_application_statuses.data.id,
            name:
              getAttr(
                rels.field_application_statuses.data.id,
                "taxonomy_term--application_statuses",
                "name"
              ) || "Unknown",
          }
        : undefined,
      distributor: rels.field_distributor_data?.data?.id
        ? {
            id: rels.field_distributor_data.data.id,
            name:
              getAttr(
                rels.field_distributor_data.data.id,
                "node--distributor",
                "title"
              ) ||
              getAttr(
                rels.field_distributor_data.data.id,
                "node--distributor",
                "name"
              ) ||
              "Unknown",
          }
        : undefined,
      paymentStatus: rels.field_payment_status?.data?.id
        ? {
            id: rels.field_payment_status.data.id,
            name:
              getAttr(
                rels.field_payment_status.data.id,
                "taxonomy_term--payment_status",
                "name"
              ) || "Unknown",
          }
        : undefined,
      subservice: rels.field_subservice?.data?.id
        ? {
            id: rels.field_subservice.data.id,
            name:
              getAttr(
                rels.field_subservice.data.id,
                "taxonomy_term--category",
                "name"
              ) || "Unknown",
          }
        : undefined,
      infoService: infoServiceData,
      paymentInfo: payments[request.id] || null,
    };
  });

  return { data: transformedData, meta: meta || {} };
};

export const useCompleteRequests = (filters: CompleteRequestFilters = {}) => {
  return useQuery({
    queryKey: ["complete-requests", filters],
    queryFn: () => fetchCompleteRequests(filters),
    select: transformCompleteRequests,
  });
};
