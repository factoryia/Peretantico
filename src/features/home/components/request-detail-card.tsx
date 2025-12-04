import { ClipboardList } from "lucide-react";
import { DataPoint } from "./data-point";

interface RequestDetailCardProps {
  serviceType: string;
  eps: string;
  drugstore?: string;
  observations?: string;
}

export function RequestDetailCard({
  serviceType,
  eps,
  drugstore,
  observations,
}: RequestDetailCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 text-lg font-semibold flex items-center gap-2.5">
        <ClipboardList className="w-5 h-5 text-blue-600" />
        Detalle de la Solicitud
      </div>
      <div className="p-5">
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
      </div>
    </div>
  );
}
