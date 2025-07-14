"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Car,
  User,
} from "lucide-react";
import type { Distributor } from "@/features/distributors/types/distributors";

interface DistributorCardProps {
  distributor: Distributor;
  onEdit: (distributor: Distributor) => void;
  onViewDetail: (distributor: Distributor) => void;
  onDelete: (distributor: Distributor) => void;
}

export function DistributorCard({
  distributor,
  onEdit,
  onViewDetail,
  onDelete,
}: DistributorCardProps) {
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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatPhone = (phone: string) => {
    // Formato: +57 300 123 4567 -> (300) 123-4567
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      const mobile = cleaned.slice(-10);
      return `(${mobile.slice(0, 3)}) ${mobile.slice(3, 6)}-${mobile.slice(6)}`;
    }
    return phone;
  };

  return (
    <Card className="group transition-all duration-200 shadow-xs hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${distributor.title}`}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {getInitials(distributor.title)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate text-wrap">
                {distributor.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    distributor.currentAvailability ? "default" : "secondary"
                  }
                  className={`text-xs ${
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
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onViewDetail(distributor)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(distributor)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(distributor)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Información de contacto */}
        <div className="space-y-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <Phone className="mr-2 h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {formatPhone(distributor.phoneNumber)}
            </span>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Mail className="mr-2 h-3 w-3 flex-shrink-0" />
            <span className="truncate">{distributor.email}</span>
          </div>
        </div>

        {/* Información del documento */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center text-muted-foreground">
            <User className="mr-2 h-3 w-3 flex-shrink-0" />
            <span>{distributor.documentType.name}</span>
          </div>
          <span className="font-mono font-medium">
            {distributor.documentNumber}
          </span>
        </div>

        {/* Zona de cobertura */}
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="mr-2 h-3 w-3 flex-shrink-0" />
          <span className="truncate">{distributor.coverageArea.name}</span>
        </div>

        {/* Transporte */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center text-muted-foreground">
            <Car className="mr-2 h-3 w-3 flex-shrink-0" />
            <span>{distributor.transportationType.name}</span>
          </div>
          <span className="font-mono text-muted-foreground">
            {distributor.vehicleId}
          </span>
        </div>

        {/* Fecha de ingreso */}
        <div className="flex items-center text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="mr-2 h-3 w-3 flex-shrink-0" />
          <span>Ingreso: {formatDate(distributor.entryDate)}</span>
        </div>

        {/* Observaciones (si existen) */}
        {/* {distributor.observations && (
          <div className="bg-muted/50 rounded-md p-2 mt-3">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {distributor.observations}
            </p>
          </div>
        )} */}
      </CardContent>
    </Card>
  );
}
