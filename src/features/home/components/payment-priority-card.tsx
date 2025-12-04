import { DollarSign } from "lucide-react";
import { DataPoint } from "./data-point";
import { cn } from "@/lib/utils";

interface PaymentPriorityCardProps {
  priority: "normal" | "prioritario" | "urgente";
  paymentMethod: string;
}

export function PaymentPriorityCard({
  priority,
  paymentMethod,
}: PaymentPriorityCardProps) {
  const priorityStyles = {
    normal: "bg-gray-200 text-gray-800",
    prioritario: "bg-yellow-400 text-gray-900",
    urgente: "bg-red-500 text-white",
  };

  const priorityLabels = {
    normal: "Normal",
    prioritario: "Prioritario",
    urgente: "Urgente",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 text-lg font-semibold flex items-center gap-2.5">
        <DollarSign className="w-5 h-5 text-blue-600" />
        Pago y Prioridad
      </div>
      <div className="p-5">
        <div className="flex justify-between gap-5 mb-3">
          <div className="flex-1">
            <DataPoint
              label="Prioridad del Servicio"
              value={
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded-xl text-sm",
                    priorityStyles[priority]
                  )}
                >
                  {priorityLabels[priority]}
                </span>
              }
            />
          </div>
          <div className="flex-1">
            <DataPoint
              label="Método de Pago Preferido"
              value={paymentMethod}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
