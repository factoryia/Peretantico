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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Car, FileText, Clock } from "lucide-react";
import type { Distributor } from "@/features/distributors/types/distributors";

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDaysWorking = (entryDate: string) => {
    const entry = new Date(entryDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - entry.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {getInitials(distributor.title)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{distributor.title}</h2>
              <Badge
                variant={
                  distributor.currentAvailability ? "default" : "secondary"
                }
                className={`mt-1 ${
                  distributor.currentAvailability
                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                    : "bg-red-100 text-red-800 hover:bg-red-100"
                }`}
              >
                {distributor.currentAvailability
                  ? "Disponible"
                  : "No Disponible"}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Información completa del repartidor
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Tipo de Documento
                </label>
                <p className="text-sm">{distributor.documentType.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Número de Documento
                </label>
                <p className="text-sm font-mono">
                  {distributor.documentNumber}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p className="text-sm">{distributor.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Teléfono
                </label>
                <p className="text-sm">{distributor.phoneNumber}</p>
              </div>
            </CardContent>
          </Card>

          {/* Información Laboral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Información Laboral
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Fecha de Ingreso
                </label>
                <p className="text-sm">{formatDate(distributor.entryDate)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Días Trabajando
                </label>
                <p className="text-sm font-semibold text-blue-600">
                  {calculateDaysWorking(distributor.entryDate)} días
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Zona de Cobertura
                </label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{distributor.coverageArea.name}</p>
                </div>
                {distributor.coverageArea.name && (
                  <p className="text-xs text-muted-foreground">
                    {distributor.coverageArea.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Estado Actual
                </label>
                <Badge
                  variant={
                    distributor.currentAvailability ? "default" : "secondary"
                  }
                  className={`${
                    distributor.currentAvailability
                      ? "bg-green-100 text-green-800 hover:bg-green-100 block mt-2"
                      : "bg-red-100 text-red-800 hover:bg-red-100 block mt-2"
                  }`}
                >
                  {distributor.currentAvailability
                    ? "Disponible para entregas"
                    : "No disponible"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Información del Vehículo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="h-5 w-5" />
                Información del Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Tipo de Transporte
                </label>
                <p className="text-sm">{distributor.transportationType.name}</p>
                {distributor.transportationType.name && (
                  <p className="text-xs text-muted-foreground">
                    {distributor.transportationType.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  ID del Vehículo
                </label>
                <p className="text-sm font-mono font-semibold">
                  {distributor.vehicleId}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Observaciones */}
          {distributor.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">
                    {distributor.observations}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
