import { Check, X, ClipboardList, File, FileUser, Info } from "lucide-react";
import { DataPoint } from "./data-point";
import type { ServiceType } from "@/types/global";
import { Badge } from "@/components/ui/badge";
import type {
  CompleteRequest,
  MedicalBillsInfoService,
  PropertyUnbundlingInfoService,
  WaterSampleFridgeInfoService,
} from "../utils/complete-request";
import { CivilRegistryInfo } from "./civil-registry-info";
import { DeathCertificateInfo } from "./death-certificate-info";
import { MarriageDepartureInfo } from "./marriage-departure-info";

interface RequestDetailCardProps {
  serviceType: string;
  eps: string;
  drugstore?: string;
  observations?: string;
  type: ServiceType;
  request: CompleteRequest | null;
}

export function RequestDetailCard({
  serviceType,
  eps,
  drugstore,
  observations,
  type,
  request,
}: RequestDetailCardProps) {
  const renderTitle = () => {
    switch (type) {
      case "node--request_medication":
        return "Detalle de la Solicitud";
      case "node--civil_registry_request":
        return "Datos del Registro Civil";
      case "node--death_certificate_request":
        return "Detalle del Requerimiento";
      case "node--marriage_certificate_request":
        return "Información del Trámite";
      case "node--water_sample_fridge":
        return "Datos del Servicio";
      case "node--property_certification":
        return "Detalles de la Propiedad";
      case "node--medical_bills":
        return "DATOS DESTINATARIO";
      case "node--property_unbundling_request":
        return "Detalles del Predio";
      default:
        return "Detalle de la Solicitud";
    }
  };

  const renderIcon = () => {
    switch (type) {
      case "node--request_medication":
        return <ClipboardList className="w-5 h-5 text-blue-600" />;
      case "node--civil_registry_request":
        return <FileUser className="w-5 h-5 text-blue-600" />;
      case "node--death_certificate_request":
        return <Info className="w-5 h-5 text-blue-600" />;
      case "node--marriage_certificate_request":
        return <File className="w-5 h-5 text-blue-600" />;
      case "node--water_sample_fridge":
        return <ClipboardList className="w-5 h-5 text-blue-600" />;
      case "node--property_certification":
        return <Info className="w-5 h-5 text-blue-600" />;
      case "node--medical_bills":
        return <ClipboardList className="w-5 h-5 text-blue-600" />;
      case "node--property_unbundling_request":
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <ClipboardList className="w-5 h-5 text-blue-600" />;
    }
  };

  const waterInfo = request?.infoService as
    | WaterSampleFridgeInfoService
    | undefined;

  return (
    <div className="bg-white overflow-hidden h-full px-6 py-7 border-b">
      <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
        {renderIcon()}
        {renderTitle()}
      </div>
      <div>
        {type === "node--request_medication" && (
          <>
            <DataPoint
              label="Tipo de Servicio Solicitado"
              value={serviceType}
              highlight
            />

            <DataPoint label="EPS" value={eps} />

            {drugstore && (
              <DataPoint
                label="Nombre de la Droguería (Opcional)"
                value={drugstore}
              />
            )}

            {observations && (
              <div className="mt-3 bg-gray-50 p-2.5 rounded-lg">
                <DataPoint
                  label="Observaciones / Mensaje del Usuario"
                  value={
                    <span className="text-sm italic">"{observations}"</span>
                  }
                  noBorder
                />
              </div>
            )}
          </>
        )}

        {type === "node--civil_registry_request" && (
          <CivilRegistryInfo request={request} />
        )}

        {type === "node--death_certificate_request" && (
          <DeathCertificateInfo request={request} />
        )}

        {type === "node--marriage_certificate_request" && (
          <MarriageDepartureInfo request={request} />
        )}

        {type === "node--water_sample_fridge" && waterInfo && (
          <>
            <DataPoint
              label="Modalidad de Entrega"
              value={waterInfo.waterService || "Sin especificar"}
              highlight
              className="uppercase"
            />
            <DataPoint
              label="¿Requiere Sello y Radicado?"
              value={waterInfo.requiresRadicado ? "Sí" : "No"}
            />
            {observations && (
              <div className="mt-3 bg-gray-50 p-2.5 rounded-lg">
                <DataPoint
                  label="Observaciones"
                  value={
                    <span className="text-sm italic">"{observations}"</span>
                  }
                  noBorder
                />
              </div>
            )}
          </>
        )}

        {type === "node--property_certification" && request?.infoService && (
          <>
            <DataPoint
              label="¿Tiene Matrícula?"
              value={
                (request.infoService as any).propertyRegistered ? "Sí" : "No"
              }
              highlight
            />
            <DataPoint
              label="Número Matrícula Inmobiliaria"
              value={
                (request.infoService as any).propertyNumber || "Sin número"
              }
            />
            <DataPoint
              label="Registro Catastral"
              value={
                (request.infoService as any).cadastralRegistration ||
                "Sin registro"
              }
            />
            {observations && (
              <div className="mt-3 bg-gray-50 p-2.5 rounded-lg">
                <DataPoint
                  label="Observaciones"
                  value={
                    <span className="text-sm italic">"{observations}"</span>
                  }
                  noBorder
                />
              </div>
            )}
          </>
        )}
        {type === "node--medical_bills" && request?.infoService && (
          <>
            <DataPoint
              label="Entidad"
              value={
                (request.infoService as MedicalBillsInfoService)
                  .recipientFullName || "Sin especificar"
              }
              highlight
            />
            <DataPoint
              label="Dirección Entrega"
              value={
                (request.infoService as MedicalBillsInfoService)
                  .recipientAddress || "Sin dirección"
              }
            />
            <DataPoint
              label="Contacto / Fecha Nac."
              value={`${
                (request.infoService as MedicalBillsInfoService)
                  .recipientContactPhone || "Sin contacto"
              } / ${
                (request.infoService as MedicalBillsInfoService).birthDate ||
                "Sin fecha"
              }`}
            />
            <DataPoint
              label="Contenido Paquete"
              value={
                (request.infoService as MedicalBillsInfoService)
                  .packageContentDescription || "Sin descripción"
              }
              noBorder
            />
          </>
        )}
        {type === "node--property_unbundling_request" &&
          request?.infoService && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="bg-[#F0F9FF] border border-[#bae6fd] text-[#0C4A6E] px-4 py-3 rounded-lg font-semibold text-lg">
                    <p className="text-[12.8px] text-[#0369A1] font-medium mb-1.5 uppercase">
                      Folio de Matrícula Inmobiliaria
                    </p>
                    {(request.infoService as PropertyUnbundlingInfoService)
                      .registrySerialNumber || "Sin folio"}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-start gap-10">
                <DataPoint
                  label="Ciudad"
                  value={
                    (request.infoService as PropertyUnbundlingInfoService)
                      .deedCity || "Sin datos (Pendiente)"
                  }
                  noBorder
                />

                <div className="flex flex-col items-end">
                  <p className="text-[12.8px] text-[#6B7280] font-medium mb-2 uppercase">
                    Aporta planos
                  </p>
                  <div className="flex items-center">
                    {(request.infoService as PropertyUnbundlingInfoService)
                      .hasPropertyPlan ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none flex items-center gap-1 font-bold text-xs px-3 py-1 uppercase h-auto">
                        <Check className="size-3.5" /> Aporta planos
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-600 border-red-100 flex items-center gap-1 font-bold text-xs px-3 py-1 uppercase h-auto"
                      >
                        <X className="size-3.5" /> No aporta planos
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {observations && (
                <div className="mt-3 bg-gray-50 p-2.5 rounded-lg">
                  <DataPoint
                    label="Observaciones"
                    value={
                      <span className="text-sm italic">"{observations}"</span>
                    }
                    noBorder
                  />
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
