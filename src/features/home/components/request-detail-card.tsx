import { ClipboardList, File, FileUser, Info } from "lucide-react";
import { DataPoint } from "./data-point";
import type { ServiceType } from "@/types/global";
import type { CompleteRequest } from "../utils/complete-request";
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
      default:
        return <ClipboardList className="w-5 h-5 text-blue-600" />;
    }
  };

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
      </div>
    </div>
  );
}
