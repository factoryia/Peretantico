import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestHeader } from "./request-header";
import { PatientDataCard } from "./patient-data-card";
import { RequestDetailCard } from "./request-detail-card";
import { AttachmentsCard } from "./attachments-card";
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

  // Cargar lista de distribuidores
  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const response = await api.get("/api/node/distributor");
        const distributors = response.data.data.map(
          (dist: { id: string; attributes: { title: string } }) => ({
            id: dist.id,
            name: dist.attributes.title || "Sin nombre",
          })
        );
        setDistributorsList(distributors);
      } catch (error) {
        console.error("Error fetching distributors:", error);
        setDistributorsList([]);
      }
    };

    if (isOpen) {
      fetchDistributors();
    }
  }, [isOpen]);

  // Datos de ejemplo para adjuntos (placeholder)

  const handleSave = async (data: {
    serviceValue: number;
    logisticsCost: number;
    distributorId: string;
  }) => {
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

  const getEps = () => {
    if (request.infoService?.type === "node--request_medication") {
      return request.infoService.eps || "N/A";
    }
    return "N/A";
  };

  const getDrugstore = () => {
    if (request.infoService?.type === "node--request_medication") {
      return request.infoService.drugstore || "N/A";
    }
    return "N/A";
  };

  const getAttachments = () => {
    const info = request.infoService;
    if (!info) return [];

    const attachments: { url: string; label: string; alt: string }[] = [];

    if (
      info.type === "node--request_medication" ||
      info.type === "node--civil_registry_request"
    ) {
      info.files?.forEach((file: { uri: string; title: string }) => {
        attachments.push({
          url: file.uri,
          label: file.title || "Adjunto",
          alt: "Archivo adjunto",
        });
      });
    } else if (info.type === "node--death_certificate_request") {
      if (info.signedAuthorization) {
        attachments.push({
          url: info.signedAuthorization.uri,
          label: info.signedAuthorization.title || "Autorización",
          alt: "Autorización",
        });
      }
    } else if (info.type === "node--marriage_certificate_request") {
      info.applicantIdCopy?.forEach((file: { uri: any; title: any }) => {
        attachments.push({
          url: file.uri,
          label: file.title || "Copia Cédula",
          alt: "Copia Cédula",
        });
      });
      if (info.marriageCertificate) {
        attachments.push({
          url: info.marriageCertificate.uri,
          label: info.marriageCertificate.title || "Partida Matrimonio",
          alt: "Partida Matrimonio",
        });
      }
      if (info.signedAuthorization) {
        attachments.push({
          url: info.signedAuthorization.uri,
          label: info.signedAuthorization.title || "Autorización",
          alt: "Autorización",
        });
      }
    } else if (info.type === "node--water_sample_fridge") {
      info.files?.forEach((file: { uri: string; title: string }) => {
        attachments.push({
          url: file.uri,
          label: file.title || "Documento",
          alt: "Archivo adjunto",
        });
      });
    } else if (info.type === "node--property_certification") {
      // field_path documents
      info.files?.forEach((file: { uri: string; title: string }) => {
        attachments.push({
          url: file.uri,
          label: file.title || "Certificación",
          alt: "Certificación de propiedad",
        });
      });
      // Additional docs if needed (applicantIdCopy, propertyDeedCopy)
      info.applicantIdCopy?.forEach((file: { uri: string; title: string }) => {
        attachments.push({
          url: file.uri,
          label: file.title || "Copia Cédula",
          alt: "Copia Cédula",
        });
      });
      if (info.propertyDeedCopy) {
        attachments.push({
          url: info.propertyDeedCopy.uri,
          label: info.propertyDeedCopy.title || "Copia Escritura",
          alt: "Copia Escritura",
        });
      }
    } else if (info.type === "node--medical_bills") {
      info.files?.forEach((file: { uri: string; title: string }) => {
        attachments.push({
          url: file.uri,
          label: file.title || "Documento",
          alt: "Archivo adjunto",
        });
      });
    } else if (info.type === "node--property_unbundling_request") {
      const pInfo = info as PropertyUnbundlingInfoService;
      pInfo.applicantIdCopy?.forEach((file) => {
        attachments.push({
          url: file.uri,
          label: file.title || "ID Propietario",
          alt: "ID Propietario",
        });
      });
      if (pInfo.cadastralResolution) {
        attachments.push({
          url: pInfo.cadastralResolution.uri,
          label: pInfo.cadastralResolution.title || "Resolu. Catastro",
          alt: "Resolu. Catastro",
        });
      }
      if (pInfo.disengagementDeed) {
        attachments.push({
          url: pInfo.disengagementDeed.uri,
          label: pInfo.disengagementDeed.title || "Escritura Desenglobe",
          alt: "Escritura Desenglobe",
        });
      }
      if (pInfo.legalRepresentationCerti) {
        attachments.push({
          url: pInfo.legalRepresentationCerti.uri,
          label:
            pInfo.legalRepresentationCerti.title || "Cert. Cámara Comercio",
          alt: "Cert. Cámara Comercio",
        });
      }
      if (pInfo.neighboringProperties) {
        attachments.push({
          url: pInfo.neighboringProperties.uri,
          label: pInfo.neighboringProperties.title || "Predios Colindantes",
          alt: "Predios Colindantes",
        });
      }
      if (pInfo.notarialPower) {
        attachments.push({
          url: pInfo.notarialPower.uri,
          label: pInfo.notarialPower.title || "Poder Notarial",
          alt: "Poder Notarial",
        });
      }
      if (pInfo.propertyDeedCopy) {
        attachments.push({
          url: pInfo.propertyDeedCopy.uri,
          label: pInfo.propertyDeedCopy.title || "Copia Escritura",
          alt: "Copia Escritura",
        });
      }
      if (pInfo.propertyPlan) {
        attachments.push({
          url: pInfo.propertyPlan.uri,
          label: pInfo.propertyPlan.title || "Plano Predio",
          alt: "Plano Predio",
        });
      }
      if (pInfo.propertyTax) {
        attachments.push({
          url: pInfo.propertyTax.uri,
          label: pInfo.propertyTax.title || "Impuesto Predial",
          alt: "Impuesto Predial",
        });
      }
      if (pInfo.traditionCertificate) {
        attachments.push({
          url: pInfo.traditionCertificate.uri,
          label: pInfo.traditionCertificate.title || "Cert. Tradición",
          alt: "Cert. Tradición",
        });
      }
      pInfo.files?.forEach((file) => {
        attachments.push({
          url: file.uri,
          label: file.title || "Adjunto",
          alt: "Adjunto",
        });
      });
    }

    return attachments;
  };

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

            {/* <AttachmentsCard attachments={sampleAttachments} /> */}
            <AttachmentsCard
              type={request.infoService?.type || "Sin tipo"}
              attachments={getAttachments()}
            />
          </div>

          {/* Segunda fila de tarjetas */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))]">
            <PaymentPriorityCard
              priority={
                request.infoService?.priority ? "prioritario" : "normal"
              }
              paymentMethod={
                request.paymentInfo?.field_payment_method?.name ||
                "Sin método de pago"
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
