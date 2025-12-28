"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, MapPin, Car, FileText, Mail, BadgeCheck } from "lucide-react";
import type { Distributor } from "@/features/distributors/types/distributors";
import { DataPoint } from "@/features/home/components/data-point";
import { FaWhatsapp } from "react-icons/fa";

interface DistributorDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distributor: Distributor | null;
}

export function DistributorDetailDialog({
  open,
  onOpenChange,
  distributor,
}: DistributorDetailDialogProps) {
  if (!distributor) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateDaysWorking = (entryDate: string) => {
    const entry = new Date(entryDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - entry.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatValue = (
    value: string | null | undefined,
    fallback: string = "No proporcionado"
  ) => {
    if (!value || value.trim() === "")
      return (
        <span className="text-slate-400 italic font-normal">{fallback}</span>
      );
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
        <div className="bg-white">
          <DialogHeader className="flex flex-row items-center gap-4 p-6 border-b bg-slate-50/50 space-y-0">
            <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-linear-to-br from-blue-600 to-indigo-700 text-white font-bold text-xl">
                {getInitials(distributor.title)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                {distributor.title || "Sin nombre"}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    distributor.currentAvailability ? "default" : "secondary"
                  }
                  className={`border-none text-[10px] uppercase font-bold py-0 h-5 px-2 ${
                    distributor.currentAvailability
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      distributor.currentAvailability
                        ? "bg-green-500 animate-pulse"
                        : "bg-red-500"
                    }`}
                  />
                  {distributor.currentAvailability
                    ? "Disponible"
                    : "No disponible"}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold py-0 h-5 px-2 border-blue-200 text-blue-600"
                >
                  <BadgeCheck className="w-3 h-3 mr-1" /> Repartidor
                </Badge>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Información detallada del repartidor
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            {/* Personal Section */}
            <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pb-6">
              <User className="size-5 text-blue-600" />
              Información del Repartidor
            </div>

            <DataPoint
              label="Nombre Completo"
              value={formatValue(distributor.title)}
            />

            <div className="grid grid-cols-2 gap-4">
              <DataPoint
                label="Tipo de Documento"
                value={formatValue(distributor.documentType?.name)}
              />
              <DataPoint
                label="Número de Documento"
                value={formatValue(distributor.documentNumber)}
              />
            </div>

            <DataPoint
              label="Teléfono / WhatsApp"
              value={
                distributor.phoneNumber ? (
                  <span className="flex items-center gap-2">
                    <FaWhatsapp className="text-green-600" />{" "}
                    {distributor.phoneNumber}
                  </span>
                ) : (
                  formatValue(null, "Sin registro")
                )
              }
            />

            <DataPoint
              label="Correo Electrónico"
              value={
                distributor.email ? (
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />{" "}
                    {distributor.email}
                  </span>
                ) : (
                  formatValue(null, "Sin registro")
                )
              }
            />

            {/* Operative Section */}
            <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 pt-6 pb-6">
              <Car className="size-5 text-blue-600" />
              Información Operativa
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DataPoint
                label="Vehículo / Transporte"
                value={formatValue(distributor.transportationType?.name)}
              />
              <DataPoint
                label="ID / Placa Vehículo"
                value={formatValue(distributor.vehicleId, "Sin placa")}
              />
            </div>

            <DataPoint
              label="Zona de Cobertura"
              value={
                distributor.coverageArea?.name ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span>{distributor.coverageArea.name}</span>
                  </div>
                ) : (
                  formatValue(null, "Sin zona")
                )
              }
            />

            <DataPoint
              label="Tiempo en el equipo"
              value={`${calculateDaysWorking(distributor.entryDate)} días`}
              highlight
            />

            {/* Observations */}
            {distributor.observations && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-[#6B7280] text-[12.8px] uppercase font-semibold flex items-center gap-2.5 mb-4">
                  <FileText className="size-5 text-blue-600" />
                  Observaciones
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    "{distributor.observations}"
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-8">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50"
              >
                Cerrar
              </Button>
              <Button
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest px-8 shadow-lg shadow-slate-200 transition-all"
                onClick={() => onOpenChange(false)}
              >
                Entendido
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
