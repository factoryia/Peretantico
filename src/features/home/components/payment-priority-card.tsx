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
    <div className="bg-white overflow-hidden h-full px-6 py-7 border-b">
      <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-4">
        <DollarSign className="w-5 h-5 text-blue-600" />
        Pago y Prioridad
      </div>
      <div>
        <div className="flex justify-between gap-5">
          <div className="flex-1">
            <DataPoint
              noBorder
              label="Tipo de Servicio"
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
            <DataPoint noBorder label="Método de Pago" value={paymentMethod} />
          </div>
        </div>
      </div>
    </div>
  );
}
