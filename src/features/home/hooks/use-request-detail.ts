import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { CompleteRequest } from "../utils/complete-request";
import { adaptRequestFlowState } from "../utils/request-flow-adapter";

export const useRequestDetail = (requestId: string | null | undefined) => {
  const request = useQuery(api.requests.get, 
    requestId ? { id: requestId as Id<"requests"> } : "skip"
  );

  const transformedRequest = useMemo<CompleteRequest | null>(() => {
    if (!request) return null;

    return {
      id: request._id,
      drupal_internal__nid: 0,
      title: request.title || "",
      created: new Date(request._creationTime).toISOString(),
      field_application_number: request.applicationNumber || "",
      field_entry_date: request.entryDate ? new Date(request.entryDate).toISOString() : "",
      field_application_score: request.applicationScore || 0,
      field_estimated_application_hour: request.estimatedApplicationHour || 0,
      field_estimated_prioritized_hour: request.estimatedPrioritizedHour || 0,
      field_priority_estimated_hours: request.estimatedPrioritizedHour || 0,
      field_is_recurring: request.isRecurring || false,
      field_logistics_costs: Number(request.logisticsCosts) || 0,
      field_service_value: Number(request.serviceValue) || 0,
      field_prioritized_value: Number(request.prioritizedValue) || 0,
      field_priority_value: Number(request.prioritizedValue) || 0,
      field_observations: request.observations || "",
      paymentMethod: request.paymentMethod ?? null,
      paymentFlowStatus: request.paymentStatus ?? null,
      isPrioritized: request.isPrioritized ?? false,
      requestStatus: (request.requestStatus as any) ?? "EnProceso",
      flowStatus: request.flowStatus ?? undefined,
      adminValidationStatus: request.adminValidationStatus ?? undefined,
      adminValidationReason: request.adminValidationReason ?? undefined,
      adminValidationAt: request.adminValidationAt ?? undefined,
      status: request.status,
      promote: request.promote,
      sticky: request.sticky,
      
      // Relations
      applicant: request.applicant ? {
        id: request.applicant._id,
        name: request.applicant.fullName || "Sin nombre",
        documentNumber: request.applicant.documentNumber,
        phoneNumber: request.applicant.phoneNumber,
        address: request.applicant.address,
        documentType: request.applicant.documentType ? { 
          id: request.applicant.documentType, 
          name: request.applicant.documentType 
        } : undefined,
      } : undefined,

      distributor: request.distributor ? {
        id: request.distributor._id,
        name: request.distributor.title || "Sin nombre",
      } : undefined,

      subservice: request.service ? {
        id: request.service._id,
        name: request.service.name || "Sin nombre",
      } : undefined,

      // Attachments
      evidenceStorageId: request.evidenceStorageId,
      evidenceUrl: request.evidenceUrl,
      evidenceImage: request.evidenceStorageId || request.evidenceUrl 
        ? {
            id: request.evidenceStorageId || "legacy",
            uri: request.evidenceUrl || "",
            alt: "Evidencia de entrega"
          }
        : request.attachments && request.attachments.length > 0
        ? {
            id: request.attachments[0]._id,
            uri: request.attachments[0].url,
            alt: request.attachments[0].fileName,
          }
        : undefined,

      // Request Data (Fields)
      data: request.data ? request.data.map((item: any) => ({
        id: item._id,
        fieldId: item.fieldId,
        value: item.value,
        field: item.field ? {
          id: item.field._id,
          name: item.field.name,
          code: item.field.code ?? null,
          description: item.field.description ?? null,
          type: item.field.type as any,
          required: !!item.field.required,
          multiple: !!item.field.multiple,
          order: item.field.order,
          options: item.field.options ?? null,
          status: !!item.field.status,
          settings: item.field.settings ?? null,
        } : undefined,
      })) : [],

      // InfoService mapping for compatibility with UI components
      infoService: {
          id: request.service?._id || "",
          type: "node--request" as any, // Generic type or map from service code
          title: request.title,
          priority: request.isPrioritized ? "Alta" : "Normal",
          // Add specific fields if needed by mapping from request.data
      } as any,
      ...adaptRequestFlowState(request),
    };
  }, [request]);

  if (!request) {
    return { data: null, isLoading: !!requestId };
  }

  return { data: transformedRequest, isLoading: false };
};
