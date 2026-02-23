import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestHeader } from "./request-header";
import { PatientDataCard } from "./patient-data-card";
import { RequestDetailCard } from "./request-detail-card";
import { PaymentPriorityCard } from "./payment-priority-card";
import {
  RequestManagementCard,
  type Distributor,
} from "./request-management-card";
import { WaterSampleFridgeInfo } from "./water-sample-info";
import type {
  CompleteRequest,
  MedicalBillsInfoService,
  WaterSampleFridgeInfoService,
  PropertyCertificationInfoService,
  PropertyUnbundlingInfoService,
} from "../utils/complete-request";
import { useEffect, useState } from "react";
import api from "@/api";
import { toast } from "sonner";
import { mapToDistributor } from "@/features/distributors/utils/distributors";
import { API_BASE_URL } from "@/features/auth/constants";

interface RequestDetailViewModalProps {
  isOpen: boolean;
  request: CompleteRequest | null;
  onOpenChange: (open: boolean) => void;
  onAssignDistributor: (distributorId: string) => Promise<void>;
  onUpdateRequest?: (requestId: string, data: any) => Promise<void>;
  isDistributor?: boolean;
}

export function RequestDetailViewModal({
  isOpen,
  onOpenChange,
  request,
  onAssignDistributor,
  onUpdateRequest,
  isDistributor = false,
}: RequestDetailViewModalProps) {
  const [distributorsList, setDistributorsList] = useState<Distributor[]>([]);

  useEffect(() => {
    const fetchDistributorsForSelect = async () => {
      try {
        const response = await api.get("/distributors", {
          params: {
            limit: 100,
          },
        });

        const raw = response.data;

        const items =
          Array.isArray(raw) && raw.length > 0
            ? raw
            : raw &&
              typeof raw === "object" &&
              Array.isArray((raw as { data?: unknown }).data)
            ? (raw as { data: unknown[] }).data
            : [];

        const distributors = items
          .filter((item) => item && typeof item === "object")
          .map((item) => mapToDistributor(item as Record<string, unknown>))
          .map((dist) => ({
            id: dist.id,
            name: dist.title || "Sin nombre",
          }));

        setDistributorsList(distributors);
      } catch (error) {
        console.error("Error fetching distributors:", error);
        setDistributorsList([]);
      }
    };

    if (isOpen) {
      fetchDistributorsForSelect();
    }
  }, [isOpen]);

  // Datos de ejemplo para adjuntos (placeholder)

  const handleSave = async (data: {
    serviceValue: number;
    logisticsCost: number;
    distributorId: string;
  }) => {
    try {
      await onAssignDistributor(data.distributorId);

      if (onUpdateRequest && request) {
        await onUpdateRequest(request.id, {
          data: {
            type: "node--request",
            id: request.id,
            attributes: {
              title: request.title,
              field_prioritized_value: data.serviceValue,
              field_logistics_costs: data.logisticsCost,
            },
          },
        });
      }

      toast.success("Solicitud actualizada correctamente.");
    } catch (error) {
      console.error("Error al actualizar la solicitud desde el detalle:", error);
      toast.error("Error al actualizar la solicitud");
    }
  };

  if (!request) return null;

  // Formatear fecha de creación
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha no disponible";
    }
  };

  // Determinar variante del estado
  const getStatusVariant = (
    statusName: string
  ): "nuevo" | "en-proceso" | "completado" | "cancelado" => {
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus.includes("rechaz") || lowerStatus.includes("cancel"))
      return "cancelado";
    if (lowerStatus.includes("nuevo")) return "nuevo";
    if (
      lowerStatus.includes("proceso") ||
      lowerStatus.includes("asignado") ||
      lowerStatus.includes("camino")
    )
      return "en-proceso";
    if (lowerStatus.includes("completado") || lowerStatus.includes("entregado"))
      return "completado";
    return "nuevo";
  };

  const getEps = (): string => {
    const info = request.infoService as any;
    if (info?.type === "node--request_medication") {
      return info.eps || "N/A";
    }
    return "N/A";
  };

  const getDrugstore = (): string => {
    const info = request.infoService as any;
    if (info?.type === "node--request_medication") {
      return info.drugstore || "N/A";
    }
    return "N/A";
  };

  // Se elimina el manejo de adjuntos para este flujo

  const getFullName = () => {
    if (request.infoService?.type === "node--water_sample_fridge") {
      return (
        (request.infoService as WaterSampleFridgeInfoService).senderFullName ||
        "Sin nombre"
      );
    } else if (request.infoService?.type === "node--medical_bills") {
      return (
        (request.infoService as MedicalBillsInfoService).senderFullName ||
        "Sin nombre"
      );
    } else if (request.infoService?.type === "node--property_certification") {
      return (
        (request.infoService as PropertyCertificationInfoService).ownerName ||
        "Sin nombre"
      );
    } else if (
      request.infoService?.type === "node--property_unbundling_request"
    ) {
      return (
        (request.infoService as PropertyUnbundlingInfoService).fullName ||
        "Sin nombre"
      );
    }
    return request.applicant?.name || "Sin nombre";
  };

  const getPhoneNumber = () => {
    if (request.infoService?.type === "node--water_sample_fridge") {
      return (
        (request.infoService as WaterSampleFridgeInfoService)
          .senderContactPhone || "Sin teléfono"
      );
    } else if (request.infoService?.type === "node--medical_bills") {
      return (
        (request.infoService as MedicalBillsInfoService).senderContactPhone ||
        "Sin teléfono"
      );
    } else if (
      request.infoService?.type === "node--property_unbundling_request"
    ) {
      return (
        (request.infoService as PropertyUnbundlingInfoService).phoneNumber ||
        "Sin teléfono"
      );
    }
    return request.applicant?.phoneNumber || "Sin teléfono";
  };

  const getAddress = () => {
    if (request.infoService?.type === "node--water_sample_fridge") {
      return (
        (request.infoService as WaterSampleFridgeInfoService).senderAddress ||
        "Sin dirección"
      );
    } else if (request.infoService?.type === "node--medical_bills") {
      return (
        (request.infoService as MedicalBillsInfoService).senderAddress ||
        "Sin dirección"
      );
    }
    return request.applicant?.address || "Sin dirección";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalle de Solicitud</DialogTitle>
        </DialogHeader>

        <div className="bg-white min-h-screen p-0 font-['Poppins',sans-serif]">
          <RequestHeader
            type={request.infoService?.type || "Sin tipo"}
            requestId={request.field_application_number || "Sin número"}
            createdDate={formatDate(request.created)}
            status={request.applicationStatus?.name || "Sin estado"}
            statusVariant={getStatusVariant(
              request.applicationStatus?.name || ""
            )}
          />

          {/* Primera fila de tarjetas */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))]">
            {request.infoService?.type !== "node--property_certification" && (
              <PatientDataCard
                type={request.infoService?.type || "Sin tipo"}
                fullName={getFullName()}
                documentType={
                  request.applicant?.documentType?.name || "Sin tipo"
                }
                documentNumber={
                  request.applicant?.documentNumber || "Sin documento"
                }
                phone={getPhoneNumber()}
                address={getAddress()}
                municipality={"Sin municipio"} // CompleteRequest doesn't have municipality yet, keep placeholder or add if needed
              />
            )}

            {request.infoService?.type === "node--water_sample_fridge" && (
              <WaterSampleFridgeInfo request={request} />
            )}

            <RequestDetailCard
              type={request.infoService?.type || "Sin tipo"}
              request={request}
              serviceType={request.subservice?.name || "Sin subservicio"}
              eps={getEps()}
              drugstore={getDrugstore()}
              observations={
                request.field_observations ||
                (request.infoService?.type === "node--request_medication"
                  ? request.infoService.observations
                  : request.infoService?.type === "node--water_sample_fridge"
                  ? (request.infoService as WaterSampleFridgeInfoService)
                      .observations
                  : request.infoService?.type === "node--property_certification"
                  ? (request.infoService as any).observations
                  : undefined) ||
                "Sin observaciones"
              }
            />

            {/* Datos del Servicio (solo visualización) */}
            {Array.isArray(request.data) && request.data.length > 0 && (
              <div className="p-4">
                <h4 className="font-semibold mb-2">
                  {request.subservice?.name ||
                    request.infoService?.type ||
                    "Datos del Servicio"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {request.data
                    .sort(
                      (a, b) => (a.field?.order ?? 0) - (b.field?.order ?? 0)
                    )
                    .map((d) => {
                      const field = d.field as any;
                      const optionsRaw = field?.options || {};
                      const items: { label: string; value: string }[] =
                        Array.isArray(optionsRaw.items) ? optionsRaw.items : [];
                      let displayValue: string = "";

                      if (field?.type === "Select" && items.length > 0) {
                        const match = items.find(
                          (opt) => opt.value === d.value
                        );
                        displayValue = match
                          ? match.label
                          : (d.value as string) ?? "";
                      } else if (typeof d.value === "boolean") {
                        displayValue = d.value ? "Sí" : "No";
                      } else if (Array.isArray(d.value)) {
                        displayValue = d.value.join(", ");
                      } else if (
                        d.value === null ||
                        d.value === undefined
                      ) {
                        displayValue = "";
                      } else if (typeof d.value === "object") {
                        displayValue = JSON.stringify(d.value);
                      } else {
                        displayValue = String(d.value);
                      }

                      const rawUrl =
                        typeof d.value === "string" ? d.value : undefined;
                      const href =
                        rawUrl && rawUrl.startsWith("http")
                          ? rawUrl
                          : rawUrl
                          ? `${API_BASE_URL}${rawUrl}`
                          : "";

                      const isFileField = field?.type === "File";

                      return (
                        <div
                          key={d.id}
                          className="border rounded-lg p-3 bg-gray-50"
                        >
                          <div className="text-xs text-gray-500">
                            {field?.name || "Campo"}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {isFileField && href ? (
                              <button
                                type="button"
                                className="text-blue-600 underline"
                                onClick={() => {
                                  window.open(href, "_blank");
                                }}
                              >
                                Ver archivo
                              </button>
                            ) : (
                              displayValue
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Segunda fila de tarjetas */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))]">
            <PaymentPriorityCard
              priority={
                request.infoService?.priority ? "prioritario" : "normal"
              }
              paymentMethod={
                request.paymentInfo ? "Pago registrado" : "Sin método de pago"
              }
            />

            {!isDistributor && (
              <RequestManagementCard
                serviceValue={request.field_service_value || 0}
                logisticsCost={request.field_logistics_costs || 0}
                assignedDistributor={request.distributor?.id || ""}
                distributors={distributorsList}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
