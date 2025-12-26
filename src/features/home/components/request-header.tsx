import { Church, FilePlus, FileText, FileUser } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/types/global";

interface RequestHeaderProps {
  requestId: string;
  createdDate: string;
  status: string;
  statusVariant?: "nuevo" | "en-proceso" | "completado" | "cancelado";
  type: ServiceType;
}

export function RequestHeader({
  requestId,
  createdDate,
  status,
  statusVariant = "nuevo",
  type,
}: RequestHeaderProps) {
  const statusStyles = {
    nuevo: "bg-green-100 text-green-900",
    "en-proceso": "bg-yellow-100 text-yellow-900",
    completado: "bg-gray-200 text-gray-800",
    cancelado: "bg-red-100 text-red-900",
  };

  const renderTitle = () => {
    switch (type) {
      case "node--civil_registry_request":
        return "Solicitud Registro Civil";
      case "node--death_certificate_request":
        return "Partida de Defunción";
      case "node--marriage_certificate_request":
        return "Solicitud Partida Matrimonio";
      // case "node--civil_registry_request":
      //   return "Solicitud Registro Civil";
      case "node--request_medication":
        return `Solicitud #${requestId}`;
      default:
        return "Solicitud";
    }
  };

  const renderSubtitle = () => {
    if (type === "node--request_medication") {
      return `Creada el: ${createdDate}`;
    } else {
      return `ID Solicitud: #${requestId}`;
    }
  };

  const renderIcon = () => {
    switch (type) {
      case "node--civil_registry_request":
        return <FileUser className="size-6" />;
      case "node--death_certificate_request":
        return <FileText className="size-6" />;
      case "node--marriage_certificate_request":
        return <Church className="size-6" />;
      case "node--request_medication":
        return <FilePlus className="size-6" />;
      default:
        return <FileText className="size-6" />;
    }
  };

  return (
    <div className="bg-white p-5 pt-10 flex flex-col items-center justify-center flex-wrap gap-3 border-b">
      <div>
        <h1 className="text-xl text-center font-semibold text-blue-600 flex items-center justify-center gap-2">
          {/* <FileText className="w-6 h-6" /> */}
          {renderIcon()}
          {/* Solicitud #{requestId} */}
          {renderTitle()}
        </h1>
        <p className="text-[13.6px] text-gray-500 mb-0 ml-8 mt-1.5 text-center">
          {/* Creada el: {createdDate} */}
          {renderSubtitle()}
        </p>
      </div>
      <span
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium",
          statusStyles[statusVariant]
        )}
      >
        Estado: {status}
      </span>
    </div>
    // <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex flex-col items-center justify-center flex-wrap gap-3">
    //   <div>
    //     <h1 className="text-xl font-semibold text-blue-600 flex items-center gap-2 m-0">
    //       {/* <FileText className="w-6 h-6" /> */}
    //       {renderIcon()}
    //       {/* Solicitud #{requestId} */}
    //       {renderTitle()}
    //     </h1>
    //     <p className="text-[13.6px] text-gray-500 mb-0 ml-8 mt-1.5 text-center">
    //       {/* Creada el: {createdDate} */}
    //       {renderSubtitle()}
    //     </p>
    //   </div>
    //   <span
    //     className={cn(
    //       "px-3 py-1.5 rounded-full text-xs font-medium",
    //       statusStyles[statusVariant]
    //     )}
    //   >
    //     Estado: {status}
    //   </span>
    // </div>
  );
}
