import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Image, XCircle, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { useRequestDetail } from "../hooks/use-request-detail";
import { useMutation, useQuery } from "convex/react";
import { api as convexApi } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AttachmentsCard } from "./attachments-card";
import { downloadRequestPdfFromCompleteRequest } from "../utils/request-pdf";
import { DistributorDeliveryForm } from "./distributor-delivery-form";
import { ImageModal } from "./image-modal";
import { useState } from "react";
import { useDistributorId } from "../hooks/use-distributor-id";

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
  request: initialRequest,
  // onAssignDistributor,
  // onUpdateRequest,
  isDistributor = false,
}: RequestDetailViewModalProps) {
  const [previewImage, setPreviewImage] = useState<{ url: string; caption: string } | null>(null);
  const { data: myDistributorId } = useDistributorId();

  // Fetch complete request details when modal is open and we have an ID
  const { data: detailedRequest, isLoading: isDetailLoading } = useRequestDetail(
    isOpen && initialRequest?.id ? initialRequest.id : null
  );

  const updateRequestMutation = useMutation(convexApi.requests.update);
  const assignDistributorMutation = useMutation(convexApi.requests.assignDistributor);
  const setAdminValidationMutation = useMutation(convexApi.requests.setAdminValidation);
  
  // Fetch distributors directly from Convex
  const distributorsData = useQuery(convexApi.distributors.listAll, {});

  // Use detailed request if available, otherwise fallback to initial
  const request = detailedRequest || initialRequest;
  const isDeliveryClosed =
    request?.requestStatus === "Atendida" || request?.requestStatus === "Finalizada";
  const isAssignedDistributor =
    Boolean(myDistributorId) && request?.distributor?.id === String(myDistributorId);
  const canRegisterDelivery =
    Boolean(request) && !isDeliveryClosed && (isDistributor || isAssignedDistributor);

  // Transform data to match our interface with safety checks
  const distributorsList: Distributor[] = Array.isArray(distributorsData)
    ? (distributorsData as any[]).map((item: any) => ({
        id: item._id as string,
        name: (item.title as string) || (item.name as string) || "Sin nombre",
      }))
    : [];

  // Add current distributor if not in list
  if (
    request?.distributor?.id &&
    !distributorsList.find((d) => d.id === request.distributor?.id)
  ) {
    distributorsList.push({
      id: request.distributor.id,
      name:
        (request.distributor as any).title ||
        (request.distributor as any).name ||
        "Repartidor Actual",
    });
  }

  // Datos de ejemplo para adjuntos (placeholder)

  const handleSave = async (data: {
    serviceValue: number;
    logisticsCost: number;
    distributorId: string;
  }) => {
    if (!request) return;

    try {
      if (data.distributorId) {
        // Use Convex mutation for assignment if possible, or fallback to prop if logic is complex
        // The prop onAssignDistributor might handle legacy logic or refetching
        // Let's try to use the Convex mutation directly for consistency
        await assignDistributorMutation({ 
            id: request.id as Id<"requests">, 
            distributorId: data.distributorId as Id<"distributors"> 
        });
        
        // Also call the prop to notify parent if needed (e.g. for table refresh)
        // But onAssignDistributor expects a promise void.
        // If we use convex mutation, we might not need to call onAssignDistributor if we invalidate queries via Convex
        // But let's keep calling it for now to maintain behavior
        // actually, let's skip onAssignDistributor prop if we are fully convex
      }

      await updateRequestMutation({
        id: request.id as Id<"requests">,
        serviceValue: data.serviceValue,
        logisticsCosts: data.logisticsCost,
        // We might want to update prioritizedValue too if it's mapped to serviceValue in UI
        prioritizedValue: data.serviceValue, 
      });

      toast.success("Solicitud actualizada correctamente.");
      onOpenChange(false);
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
  ): "nuevo" | "en-proceso" | "completado" | "cancelado" | "sin-estado" => {
    const lowerStatus = statusName.toLowerCase();
    if (lowerStatus.includes("sin estado") || lowerStatus === "")
      return "sin-estado";
    if (
      lowerStatus.includes("rechaz") ||
      lowerStatus.includes("cancel") ||
      lowerStatus.includes("incompleta")
    )
      return "cancelado";
    if (lowerStatus.includes("nuevo")) return "nuevo";
    if (
      lowerStatus.includes("proceso") ||
      lowerStatus.includes("asignado") ||
      lowerStatus.includes("camino")
    )
      return "en-proceso";
    if (
      lowerStatus.includes("completado") ||
      lowerStatus.includes("entregado") ||
      lowerStatus.includes("atendida") ||
      lowerStatus.includes("finalizada")
    )
      return "completado";
    return "sin-estado";
  };

  const mapRequestStatusToLabel = (status?: string | null) => {
    switch (status) {
      case "Finalizada":
        return "Finalizada";
      case "Atendida":
        return "Finalizada";
      case "EnProceso":
        return "En proceso";
      case "Incompleta":
        return "Incompleta";
      default:
        return "Sin estado";
    }
  };

  const normalizePaymentMethod = (value?: string | null) => {
    const normalized = String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    if (!normalized) return "";
    if (normalized === "transferencia") return "transfer";
    if (normalized === "efectivo") return "cash";
    if (normalized === "tarjeta") return "card";
    if (normalized === "contraentrega") return "contraentrega";
    if (normalized === "delivery") return "contraentrega";
    return normalized;
  };

  const statusLabel = mapRequestStatusToLabel(request.requestStatus);
  const adminValidationStatusLabel =
    request.adminValidationStatus === "approved"
      ? "Aprobado"
      : request.adminValidationStatus === "rejected"
        ? "Rechazado"
        : request.adminValidationStatus === "pending"
          ? "Pendiente"
          : "No requerida";
  const paymentMethodKey = normalizePaymentMethod(request.paymentMethod);
  const paymentMethodLabel =
    paymentMethodKey === "transfer"
      ? "Transferencia"
      : paymentMethodKey === "cash"
        ? "Efectivo"
        : paymentMethodKey === "card"
          ? "Tarjeta"
          : paymentMethodKey === "contraentrega"
            ? "Contraentrega"
            : paymentMethodKey
              ? request.paymentMethod ?? paymentMethodKey
              : "Sin método de pago";

  const handleAdminValidation = async (status: "approved" | "rejected") => {
    if (!request?.id) return;

    const reason =
      status === "rejected"
        ? window.prompt("Motivo del rechazo del comprobante", request.adminValidationReason ?? "")?.trim()
        : undefined;

    if (status === "rejected" && !reason) {
      toast.error("Para rechazar el comprobante debes indicar un motivo.");
      return;
    }

    try {
      await setAdminValidationMutation({
        id: request.id as Id<"requests">,
        status,
        reason,
      });
      toast.success(status === "approved" ? "Comprobante aprobado" : "Comprobante rechazado");
    } catch (error) {
      console.error("Error validando comprobante:", error);
      toast.error("No se pudo actualizar la validación administrativa");
    }
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
            status={statusLabel}
            statusVariant={getStatusVariant(statusLabel)}
          />

          <div className="flex justify-center border-b bg-slate-50 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                try {
                  downloadRequestPdfFromCompleteRequest(request);
                  toast.success("PDF descargado");
                } catch (error) {
                  console.error(error);
                  toast.error("No se pudo generar el PDF");
                }
              }}
            >
              <FileDown className="h-4 w-4" />
              Descargar PDF para imprimir
            </Button>
          </div>

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
            {(Array.isArray(request.data) && request.data.length > 0) || (isDetailLoading && !request.data) ? (
              <div className="p-4">
                <h4 className="font-semibold mb-2">
                  {request.subservice?.name ||
                    request.infoService?.type ||
                    "Datos del Servicio"}
                </h4>
                {isDetailLoading && (!request.data || request.data.length === 0) ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-10 bg-gray-100 rounded w-full"></div>
                        <div className="h-10 bg-gray-100 rounded w-full"></div>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {request.data
                    ?.sort(
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
                      const href = rawUrl;

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
                )}
              </div>
            ) : null}
          </div>

            {(request.addressSnapshot || (request.attachmentGroups?.length ?? 0) > 0 || request.adminValidationStatus) && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] border-b">
                {request.addressSnapshot && (
                  <div className="bg-white overflow-hidden px-6 py-7 border-r">
                    <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold pb-4">
                      Dirección confirmada
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{request.addressSnapshot.raw}</p>
                      <p>
                        Fuente: {request.addressSnapshot.source === "user_edit" ? "Editada por el usuario" : "Perfil del cliente"}
                      </p>
                    </div>
                  </div>
                )}

                {(request.attachmentGroups?.length ?? 0) > 0 && (
                  <AttachmentsCard
                    type={request.infoService?.type || "node--request"}
                    groups={request.attachmentGroups?.map((group) => ({
                      key: group.key,
                      title: group.title,
                      items: group.items.map((item) => ({
                        id: item.id,
                        url: item.url,
                        label: item.label,
                        alt: item.label,
                        kind: item.kind,
                        fieldId: item.fieldId,
                        fieldName: item.fieldName,
                      })),
                    }))}
                  />
                )}

                {request.adminValidationStatus && (
                  <div className="bg-white overflow-hidden px-6 py-7">
                    <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold pb-4">
                      Validación administrativa
                    </div>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p><span className="font-semibold">Estado:</span> {adminValidationStatusLabel}</p>
                        <p><span className="font-semibold">Flujo:</span> {request.flowStatus || "Sin etapa"}</p>
                        <p><span className="font-semibold">Pago:</span> {request.paymentFlowStatus || paymentMethodLabel}</p>
                        {request.adminValidationReason && (
                          <p><span className="font-semibold">Motivo:</span> {request.adminValidationReason}</p>
                        )}
                      </div>

                      {!isDistributor && request.adminValidationStatus === "pending" && paymentMethodKey === "transfer" && (
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" onClick={() => handleAdminValidation("approved")}>
                            <CheckCircle2 className="h-4 w-4" /> Aprobar comprobante
                          </Button>
                          <Button type="button" variant="destructive" onClick={() => handleAdminValidation("rejected")}>
                            <XCircle className="h-4 w-4" /> Rechazar comprobante
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Evidencia de Entrega */}
            {request.evidenceUrl && (
            <div className="bg-white overflow-hidden px-6 py-7 border-b">
              <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
                <Image className="size-5 text-blue-600" />
                Evidencia de Entrega
              </div>
              <div className="rounded-lg border p-4 bg-gray-50 flex flex-col items-center gap-4">
                <img
                  src={request.evidenceUrl}
                  alt="Evidencia de entrega"
                  className="max-w-full h-auto rounded-md object-contain max-h-[400px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(request.evidenceUrl, "_blank")}
                >
                  Ver en tamaño completo
                </Button>
              </div>
            </div>
            )}

            {canRegisterDelivery ? (
              <div className="bg-white overflow-hidden px-6 py-7 border-b">
                <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold pb-4">
                  Registrar entrega con fotos
                </div>
                <DistributorDeliveryForm
                  requestId={request.id}
                  initialObservations={request.field_observations}
                  onPreviewImage={(url, caption) => setPreviewImage({ url, caption })}
                  onSuccess={() => onOpenChange(false)}
                />
              </div>
            ) : null}

            {!canRegisterDelivery && request?.distributor && !isDeliveryClosed ? (
              <div className="bg-white overflow-hidden px-6 py-7 border-b">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 space-y-2">
                  <p className="font-semibold">Fotos de radicado y evidencia</p>
                  <p>
                    Las fotos las sube el repartidor asignado ({request.distributor.name}) desde{" "}
                    <strong>Mis Entregas</strong> en el menú lateral, al marcar la solicitud como completada.
                  </p>
                  <p className="text-blue-800">
                    No están en Repartidores ni en Editar solicitud: son datos de la visita del repartidor.
                  </p>
                </div>
              </div>
            ) : null}

          {/* Segunda fila de tarjetas */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))]">
            <PaymentPriorityCard
              priority={
                request.infoService?.priority ? "prioritario" : "normal"
              }
              paymentMethod={paymentMethodLabel}
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

      <ImageModal
        isOpen={!!previewImage}
        imageUrl={previewImage?.url ?? ""}
        caption={previewImage?.caption ?? ""}
        onClose={() => setPreviewImage(null)}
      />
    </Dialog>
  );
}
