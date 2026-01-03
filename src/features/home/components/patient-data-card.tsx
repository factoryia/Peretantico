import { User, UserCircle, UserPen } from "lucide-react";
import { DataPoint } from "./data-point";
import type { ServiceType } from "@/types/global";
import { FaWhatsapp } from "react-icons/fa";

interface PatientDataCardProps {
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  address: string;
  municipality: string;
  type: ServiceType;
}

export function PatientDataCard({
  fullName,
  documentType,
  documentNumber,
  phone,
  address,
  // municipality,
  type,
}: PatientDataCardProps) {
  const renderTitle = () => {
    if (type === "node--request_medication") {
      return "Datos del Paciente";
    } else if (type === "node--medical_bills") {
      return "DATOS REMITENTE";
    } else if (type === "node--property_unbundling_request") {
      return "Datos del cliente";
    } else {
      return "Datos del Solicitante";
    }
  };

  const renderIcon = () => {
    switch (type) {
      case "node--civil_registry_request":
        return <UserPen className="size-5 text-blue-600" />;
      case "node--death_certificate_request":
        return <UserCircle className="size-5 text-blue-600" />;
      case "node--marriage_certificate_request":
        return <User className="size-5 text-blue-600" />;
      case "node--request_medication":
        return <UserCircle className="size-5 text-blue-600" />;
      default:
        return <UserCircle className="size-5 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white overflow-hidden h-full px-6 py-7 border-b">
      <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
        {renderIcon()}
        {renderTitle()}
      </div>
      <div>
        <DataPoint
          label={
            type === "node--civil_registry_request"
              ? "Nombre del Contacto (WhatsApp)"
              : type === "node--property_unbundling_request"
              ? "Razón Social / Nombre"
              : "Nombre Completo"
          }
          value={fullName}
        />

        {type === "node--request_medication" && (
          <div className="flex gap-5">
            <div className="flex-1">
              <DataPoint label="Tipo de Documento" value={documentType} />
            </div>
            <div className="flex-1">
              <DataPoint label="Número de Documento" value={documentNumber} />
            </div>
          </div>
        )}

        <DataPoint
          // label="Teléfono de Contacto"
          label={
            type === "node--marriage_certificate_request"
              ? "Teléfono / WhatsApp"
              : type === "node--property_unbundling_request"
              ? "Contacto"
              : type === "node--medical_bills"
              ? "Teléfono"
              : "Teléfono de Contacto"
          }
          value={
            <span className="flex items-center gap-1">
              <FaWhatsapp /> {phone}
            </span>
          }
        />

        {type !== "node--property_unbundling_request" && (
          <DataPoint
            // label="Dirección de Entrega"
            label={
              type === "node--marriage_certificate_request"
                ? "Dirección Indicada"
                : type === "node--death_certificate_request"
                ? "Dirección"
                : type === "node--civil_registry_request"
                ? "Dirección de Entrega"
                : type === "node--medical_bills"
                ? "Dirección Recolección"
                : "Dirección de Entrega y Municipio"
            }
            value={`${address}`}
            // value={`${address}, ${municipality}`}
            noBorder
          />
        )}
      </div>
    </div>
    // <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
    //   <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 text-lg font-semibold flex items-center gap-2.5">
    //     {renderIcon()}
    //     {renderTitle()}
    //   </div>
    //   <div className="p-5">
    //     <DataPoint
    //       label={
    //         type === "node--civil_registry_request"
    //           ? "Nombre del Contacto (WhatsApp)"
    //           : "Nombre Completo"
    //       }
    //       value={fullName}
    //     />

    //     {type === "node--request_medication" && (
    //       <div className="flex gap-5">
    //         <div className="flex-1">
    //           <DataPoint label="Tipo de Documento" value={documentType} />
    //         </div>
    //         <div className="flex-1">
    //           <DataPoint label="Número de Documento" value={documentNumber} />
    //         </div>
    //       </div>
    //     )}

    //     <DataPoint
    //       // label="Teléfono de Contacto"
    //       label={
    //         type === "node--marriage_certificate_request"
    //           ? "Teléfono / WhatsApp"
    //           : "Teléfono de Contacto"
    //       }
    //       value={
    //         <span className="flex items-center gap-1">
    //           <FaWhatsapp /> {phone}
    //         </span>
    //       }
    //     />

    //     <DataPoint
    //       // label="Dirección de Entrega"
    //       label={
    //         type === "node--marriage_certificate_request"
    //           ? "Dirección Indicada"
    //           : type === "node--death_certificate_request"
    //           ? "Dirección"
    //           : type === "node--civil_registry_request"
    //           ? "Dirección de Entrega"
    //           : "Dirección de Entrega y Municipio"
    //       }
    //       value={`${address}, ${municipality}`}
    //       noBorder
    //     />
    //   </div>
    // </div>
  );
}
