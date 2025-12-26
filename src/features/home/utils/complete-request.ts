import api from "@/api";
import { useQuery } from "@tanstack/react-query";
import type { RequestsApiResponse } from "../types/request";
import type { ServiceType } from "@/types/global";

// Interfaz extendida para respuesta con paginación
interface CompleteRequestsApiResponse extends RequestsApiResponse {
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

  // Resolved relationships
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
  // Reformed Info Service with Union Type
  infoService?: InfoService;
}

// Specific Info Service Interfaces

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

// Interfaces for specific types
interface ApiEntity {
  id: string;
  type: string;
  attributes: {
    [key: string]: unknown;
  };
  relationships?: {
    [key: string]: {
      data?: {
        id: string;
        type: string;
      };
    };
  };
}

interface ProfileEntity extends ApiEntity {
  type: "node--profile";
  attributes: {
    field_full_name?: string;
    title?: string;
  };
}

interface DistributorEntity extends ApiEntity {
  type: "node--distributor";
  attributes: {
    title?: string;
    name?: string;
  };
}

interface TaxonomyEntity extends ApiEntity {
  attributes: {
    name?: string;
    title?: string;
  };
}

export const fetchCompleteRequests = async (
  filters: CompleteRequestFilters = {}
): Promise<CompleteRequestsApiResponse> => {
  try {
    const {
      status,
      subservice,
      assignedDistributor,
      requestNumber,
      applicantName,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;
    const params: Record<string, string | number> = {
      include:
        "field_applicant,field_applicant.field_type_document,field_application_statuses,field_distributor_data,field_info_service,field_info_service.field_marriage_case,field_info_service.field_marriage_registry,field_info_service.field_marriage_type,field_payment_status,field_subservice",
      sort: "created", // Oldest to newest
      "page[limit]": limit,
      "page[offset]": offset,
      "filter[field_info_service][condition][path]": "field_info_service.id",
      "filter[field_info_service][condition][operator]": "IS NOT NULL",
    };

    // Apply filters
    if (status && status !== "all") {
      params["filter[field_application_statuses.name]"] = status;
    } else {
      // Default filter if no specific status is requested, or keep it if "all" implies no filter
      // The original code had "filter[status]": "1" which likely meant published status.
      params["filter[status]"] = "1";
    }

    if (subservice && subservice !== "all") {
      params["filter[field_subservice.id]"] = subservice;
    }

    if (assignedDistributor && assignedDistributor !== "all") {
      params["filter[field_distributor_data.id]"] = assignedDistributor;
    }

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

    // Fetch related entities if they are not included
    if (
      response.data.data &&
      (!response.data.included || response.data.included.length === 0)
    ) {
      const requests = response.data.data;
      const allIncluded: ApiEntity[] = [];

      const applicantIds = new Set<string>();
      const distributorIds = new Set<string>();
      const subserviceIds = new Set<string>();
      const statusIds = new Set<string>();
      const paymentStatusIds = new Set<string>();

      requests.forEach((request) => {
        if (request.relationships.field_applicant?.data?.id) {
          applicantIds.add(request.relationships.field_applicant.data.id);
        }
        if (request.relationships.field_distributor_data?.data?.id) {
          distributorIds.add(
            request.relationships.field_distributor_data.data.id
          );
        }
        if (request.relationships.field_subservice?.data?.id) {
          subserviceIds.add(request.relationships.field_subservice.data.id);
        }
        if (request.relationships.field_application_statuses?.data?.id) {
          statusIds.add(
            request.relationships.field_application_statuses.data.id
          );
        }
        if (request.relationships.field_payment_status?.data?.id) {
          paymentStatusIds.add(
            request.relationships.field_payment_status.data.id
          );
        }
      });

      // Group by type to fetch specific info services
      const infoServicesByType: Record<string, Set<string>> = {};
      requests.forEach((r) => {
        const d = r.relationships.field_info_service?.data;
        if (d) {
          if (!infoServicesByType[d.type])
            infoServicesByType[d.type] = new Set();
          infoServicesByType[d.type].add(d.id);
        }
      });

      // Fetch each type
      for (const [type, ids] of Object.entries(infoServicesByType)) {
        // Map type to endpoint
        let endpoint = "";
        let includes = "";
        if (type === "node--marriage_certificate_request") {
          endpoint = "/api/node/marriage_certificate_request";
          includes =
            "field_marriage_case,field_marriage_registry,field_marriage_type";
        } else if (type === "node--request_medication") {
          endpoint = "/api/node/request_medication";
        } else if (type === "node--civil_registry_request") {
          endpoint = "/api/node/civil_registry_request";
        } else if (type === "node--death_certificate_request") {
          endpoint = "/api/node/death_certificate_request";
        }

        if (endpoint && ids.size > 0) {
          const isRes = await api.get(endpoint, {
            params: {
              "filter[id][condition][path]": "id",
              "filter[id][condition][operator]": "IN",
              "filter[id][condition][value]": Array.from(ids).join(","),
              include: includes,
              "page[limit]": 100,
            },
          });
          if (isRes.data?.data) {
            isRes.data.data.forEach((item: any) => {
              allIncluded.push(item);
              // And their includes
              if (isRes.data.included) {
                isRes.data.included.forEach((inc: any) => {
                  if (!allIncluded.find((i) => i.id === inc.id)) {
                    allIncluded.push(inc);
                  }
                });
              }
            });
          }
        }
      }

      try {
        // Fetch Applicants
        if (applicantIds.size > 0) {
          const applicantsResponse = await api.get("/api/node/profile", {
            params: {
              "filter[id][condition][path]": "id",
              "filter[id][condition][operator]": "IN",
              "filter[id][condition][value]":
                Array.from(applicantIds).join(","),
              include: "field_type_document", // We need document type for complete request
              "page[limit]": 100,
            },
          });

          if (applicantsResponse.data?.data) {
            applicantsResponse.data.data.forEach((item: ProfileEntity) => {
              allIncluded.push(item);
              // Also add included document types if any
              if (applicantsResponse.data.included) {
                applicantsResponse.data.included.forEach((inc: ApiEntity) => {
                  if (!allIncluded.find((i) => i.id === inc.id)) {
                    allIncluded.push(inc);
                  }
                });
              }
            });
          }
        }

        // Fetch Distributors
        if (distributorIds.size > 0) {
          const distributorsResponse = await api.get("/api/node/distributor", {
            params: {
              "filter[id][condition][path]": "id",
              "filter[id][condition][operator]": "IN",
              "filter[id][condition][value]":
                Array.from(distributorIds).join(","),
              "page[limit]": 100,
            },
          });

          if (distributorsResponse.data?.data) {
            distributorsResponse.data.data.forEach(
              (item: DistributorEntity) => {
                allIncluded.push({
                  id: item.id,
                  type: "node--distributor",
                  attributes: item.attributes,
                });
              }
            );
          }
        }

        // Fetch Subservices
        if (subserviceIds.size > 0) {
          const subservicesResponse = await api.get(
            "/api/taxonomy_term/category",
            {
              params: {
                "filter[id][condition][path]": "id",
                "filter[id][condition][operator]": "IN",
                "filter[id][condition][value]":
                  Array.from(subserviceIds).join(","),
                "page[limit]": 100,
              },
            }
          );

          if (subservicesResponse.data?.data) {
            subservicesResponse.data.data.forEach((item: TaxonomyEntity) => {
              allIncluded.push({
                id: item.id,
                type: "taxonomy_term--category",
                attributes: item.attributes,
              });
            });
          }
        }

        // Fetch Statuses
        if (statusIds.size > 0) {
          const statusResponse = await api.get(
            "/api/taxonomy_term/application_statuses",
            {
              params: {
                "filter[id][condition][path]": "id",
                "filter[id][condition][operator]": "IN",
                "filter[id][condition][value]": Array.from(statusIds).join(","),
                "page[limit]": 100,
              },
            }
          );

          if (statusResponse.data?.data) {
            statusResponse.data.data.forEach((item: TaxonomyEntity) => {
              allIncluded.push({
                id: item.id,
                type: "taxonomy_term--application_statuses",
                attributes: item.attributes,
              });
            });
          }
        }

        // Fetch Payment Statuses
        if (paymentStatusIds.size > 0) {
          const paymentStatusResponse = await api.get(
            "/api/taxonomy_term/payment_status",
            {
              params: {
                "filter[id][condition][path]": "id",
                "filter[id][condition][operator]": "IN",
                "filter[id][condition][value]":
                  Array.from(paymentStatusIds).join(","),
                "page[limit]": 100,
              },
            }
          );

          if (paymentStatusResponse.data?.data) {
            paymentStatusResponse.data.data.forEach((item: TaxonomyEntity) => {
              allIncluded.push({
                id: item.id,
                type: "taxonomy_term--payment_status",
                attributes: item.attributes,
              });
            });
          }
        }

        response.data.included = allIncluded;
      } catch (error) {
        console.warn("Error fetching related entities:", error);
      }
    }

    // Add pagination info to response
    const totalCount = response.data.meta?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      ...response.data,
      meta: {
        count: totalCount,
        page,
        limit,
        totalPages,
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

  const getIncludedAttribute = (
    id: string | undefined,
    type: string,
    attribute: string
  ) => {
    if (!id) return undefined;
    const entity = included.find(
      (item) => item.id === id && item.type === type
    );
    return entity?.attributes?.[attribute] as string | undefined;
  };

  const getIncludedEntity = (id: string | undefined, type: string) => {
    if (!id) return undefined;
    return included.find((item) => item.id === id && item.type === type);
  };

  const transformedData = data.map((request) => {
    const rels = request.relationships;
    const attrs = request.attributes;

    // Resolve Applicant
    const applicantId = rels.field_applicant?.data?.id;
    const applicantEntity = getIncludedEntity(applicantId, "node--profile");

    let applicantData = undefined;
    if (applicantId && applicantEntity) {
      const applicantAttrs = applicantEntity.attributes;
      const docTypeId =
        applicantEntity.relationships?.field_type_document?.data?.id;
      const docTypeName = getIncludedAttribute(
        docTypeId,
        "taxonomy_term--document_type",
        "name"
      );

      applicantData = {
        id: applicantId,
        name:
          (applicantAttrs?.field_full_name as string) ||
          (applicantAttrs?.title as string) ||
          "Unknown",
        documentNumber: applicantAttrs?.field_document_number as string,
        phoneNumber: applicantAttrs?.field_phone_number as string,
        address: applicantAttrs?.field_address as string,
        documentType: docTypeId
          ? { id: docTypeId, name: docTypeName || "Unknown" }
          : undefined,
      };
    }

    // Resolve Application Status
    const statusId = rels.field_application_statuses?.data?.id;
    const statusName = getIncludedAttribute(
      statusId,
      "taxonomy_term--application_statuses",
      "name"
    );

    // Resolve Distributor
    const distributorId = rels.field_distributor_data?.data?.id;
    const distributorName =
      getIncludedAttribute(distributorId, "node--distributor", "title") ||
      getIncludedAttribute(distributorId, "node--distributor", "name");

    // Resolve Payment Status
    const paymentStatusId = rels.field_payment_status?.data?.id;
    const paymentStatusName = getIncludedAttribute(
      paymentStatusId,
      "taxonomy_term--payment_status",
      "name"
    );

    // Resolve Subservice
    const subserviceId = rels.field_subservice?.data?.id;
    const subserviceName = getIncludedAttribute(
      subserviceId,
      "taxonomy_term--category",
      "name"
    );

    // Resolve Info Service
    const infoServiceId = rels.field_info_service?.data?.id;
    const infoServiceType = rels.field_info_service?.data?.type;
    const infoServiceEntity = getIncludedEntity(
      infoServiceId,
      infoServiceType || ""
    );

    let infoServiceData: InfoService | undefined = undefined;
    if (infoServiceId && infoServiceEntity) {
      const infoAttrs = infoServiceEntity.attributes;
      const infoRels = infoServiceEntity.relationships;

      const baseInfo = {
        id: infoServiceId,
        title: infoAttrs?.title as string,
        priority: infoAttrs?.field_priority as string,
      };

      switch (infoServiceType) {
        case "node--request_medication":
          infoServiceData = {
            ...baseInfo,
            type: "node--request_medication",
            eps: infoAttrs?.field_eps as string,
            drugstore: infoAttrs?.field_drugstore as string,
            address: infoAttrs?.field_address as string,
            phoneContact: infoAttrs?.field_phone_contact as string,
            files: (infoAttrs?.field_path as any[]) || [],
            observations: infoAttrs?.field_observations as string,
          };
          break;

        case "node--civil_registry_request":
          infoServiceData = {
            ...baseInfo,
            type: "node--civil_registry_request",
            hasRegistrationNumber:
              infoAttrs?.field_has_registration_number as boolean,
            registrantFullName: infoAttrs?.field_registrant_full_name as string,
            registrantRegistrationCode:
              infoAttrs?.field_registrant_registration_co as string,
            registryFolioNumber:
              infoAttrs?.field_registry_folio_number as string,
            registryInscriptionDate:
              infoAttrs?.field_registry_inscription_date as string,
            registryNotaryNumber:
              infoAttrs?.field_registry_notary_number as string,
            registryTomeNumber: infoAttrs?.field_registry_tome_number as string,
            registrySerialNumber:
              infoAttrs?.field_registry_serial_number as string,
            files: (infoAttrs?.field_path as any[]) || [],
          };
          break;

        case "node--death_certificate_request":
          infoServiceData = {
            ...baseInfo,
            type: "node--death_certificate_request",
            documentNumber: infoAttrs?.field_document_number as string,
            hasOriginalDeathCertificate:
              infoAttrs?.field_has_original_death_certifi as boolean,
            registrantFullName: infoAttrs?.field_registrant_full_name as string,
            registrySerialNumber:
              infoAttrs?.field_registry_serial_number as string,
            signedAuthorization: infoAttrs?.field_signed_authorization as any,
          };
          break;

        case "node--marriage_certificate_request":
          // Resolve Marriage Relationships
          const marriageCaseId = infoRels?.field_marriage_case?.data?.id;
          const marriageCaseName = getIncludedAttribute(
            marriageCaseId,
            "taxonomy_term--marriage_case",
            "name"
          );

          const marriageRegistryId =
            infoRels?.field_marriage_registry?.data?.id;
          const marriageRegistryName = getIncludedAttribute(
            marriageRegistryId,
            "taxonomy_term--marriage_registration_status",
            "name"
          );

          const marriageTypeId = infoRels?.field_marriage_type?.data?.id;
          const marriageTypeName = getIncludedAttribute(
            marriageTypeId,
            "taxonomy_term--marriage_certificate_type",
            "name"
          );

          infoServiceData = {
            ...baseInfo,
            type: "node--marriage_certificate_request",
            applicantIdCopy:
              (infoAttrs?.field_applicant_id_copy as any[]) || [],
            marriageCertificate: infoAttrs?.field_marriage_certificate as any,
            signedAuthorization: infoAttrs?.field_signed_authorization as any,
            marriageCase: marriageCaseName,
            marriageRegistry: marriageRegistryName,
            marriageType: marriageTypeName,
          };
          break;

        default:
          infoServiceData = {
            ...baseInfo,
            type: infoServiceType || "unknown",
          };
      }
    }

    return {
      id: request.id,
      drupal_internal__nid: attrs.drupal_internal__nid,
      title: attrs.title,
      created: attrs.created,
      field_application_number: attrs.field_application_number,
      field_application_score: attrs.field_application_score,
      field_entry_date: attrs.field_entry_date,
      field_estimated_application_hour: attrs.field_estimated_application_hour,
      field_estimated_prioritized_hour: attrs.field_estimated_prioritized_hour,
      field_is_recurring: attrs.field_is_recurring,
      field_logistics_costs: attrs.field_logistics_costs,
      field_prioritized_value: attrs.field_prioritized_value || 0,
      field_service_value: attrs.field_prioritized_value,
      field_observations: attrs.field_observations as string | undefined, // Mapping observation
      field_info_service: rels.field_info_service?.data
        ? {
            type: rels.field_info_service.data.type,
            id: rels.field_info_service.data.id,
          }
        : undefined,

      applicant: applicantData,
      applicationStatus: statusId
        ? { id: statusId, name: statusName || "Unknown" }
        : undefined,
      distributor: distributorId
        ? { id: distributorId, name: distributorName || "Unknown" }
        : undefined,
      paymentStatus: paymentStatusId
        ? { id: paymentStatusId, name: paymentStatusName || "Unknown" }
        : undefined,
      subservice: subserviceId
        ? { id: subserviceId, name: subserviceName || "Unknown" }
        : undefined,
      infoService: infoServiceData,
    };
  });

  return {
    data: transformedData,
    meta: meta || {},
  };
};

export const useCompleteRequests = (filters: CompleteRequestFilters = {}) => {
  return useQuery({
    queryKey: ["complete-requests", filters],
    queryFn: () => fetchCompleteRequests(filters),
    select: transformCompleteRequests,
  });
};
