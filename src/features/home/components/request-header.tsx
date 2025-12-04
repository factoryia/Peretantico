import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestHeaderProps {
  requestId: string;
  createdDate: string;
  status: string;
  statusVariant?: "nuevo" | "en-proceso" | "completado";
}

export function RequestHeader({
  requestId,
  createdDate,
  status,
  statusVariant = "nuevo",
}: RequestHeaderProps) {
  const statusStyles = {
    nuevo: "bg-green-100 text-green-900",
    "en-proceso": "bg-yellow-100 text-yellow-900",
    completado: "bg-gray-200 text-gray-800",
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm mb-6 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-blue-600 flex items-center gap-2 m-0">
          <FileText className="w-6 h-6" />
          Solicitud #{requestId}
        </h1>
        <p className="text-gray-500 mb-0 ml-8 mt-1.5">
          Creada el: {createdDate}
        </p>
      </div>
      <span
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium",
          statusStyles[statusVariant]
        )}
      >
        Estado: {status}
      </span>
    </div>
  );
}
