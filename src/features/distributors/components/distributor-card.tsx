"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import {
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
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
  index?: number;
}

export function DistributorCard({
  distributor,
  onEdit,
  onViewDetail,
  onDelete,
  index = 0,
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
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      const mobile = cleaned.slice(-10);
      return `(${mobile.slice(0, 3)}) ${mobile.slice(3, 6)}-${mobile.slice(6)}`;
    }
    return phone;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.05, 0.5),
        ease: "easeOut",
      }}
      className="h-full"
    >
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white h-full flex flex-col">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition-colors" />

        <CardHeader className="pb-4 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-gray-100">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${distributor.title}&backgroundColor=3b82f6,6366f1,8b5cf6&fontFamily=Poppins`}
                  />
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                    {getInitials(distributor.title)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                    distributor.currentAvailability
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {distributor.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-gray-500">
                    {distributor.coverageArea.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 relative">
          {/* Main Info Groups */}
          <div className="grid grid-cols-1 gap-3">
            {/* Contact Group */}
            <div className="rounded-xl bg-gray-50/50 p-3 space-y-2 border border-gray-100/50">
              <div className="flex items-center text-xs text-gray-600">
                <div className="p-1.5 bg-white rounded-lg shadow-2xs mr-2 text-blue-500">
                  <Phone className="h-3 w-3" />
                </div>
                <span className="font-medium">
                  {formatPhone(distributor.phoneNumber)}
                </span>
              </div>
              <div className="flex items-center text-xs text-gray-600">
                <div className="p-1.5 bg-white rounded-lg shadow-2xs mr-2 text-blue-500">
                  <Mail className="h-3 w-3" />
                </div>
                <span className="truncate flex-1 font-medium">
                  {distributor.email}
                </span>
              </div>
            </div>

            {/* Logistics Group */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-gray-100 p-2.5 flex flex-col gap-1">
                <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  <Car className="mr-1.5 h-3 w-3 text-indigo-500" />
                  Vehículo
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800">
                    {distributor.transportationType.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    ID: {distributor.vehicleId}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-2.5 flex flex-col gap-1">
                <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  <User className="mr-1.5 h-3 w-3 text-indigo-500" />
                  Documento
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800">
                    {distributor.documentType.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    {distributor.documentNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Meta */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center text-[10px] font-medium text-gray-400">
              <Calendar className="mr-1.5 h-3 w-3" />
              Ingreso: {formatDate(distributor.entryDate)}
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] rounded-full border-none px-2 py-0.5 font-bold shadow-none ${
                distributor.currentAvailability
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {distributor.currentAvailability ? "DISPONIBLE" : "NO DISPONIBLE"}
            </Badge>
          </div>

          {/* Action Buttons - Modern Floating Style */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1 h-9 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 border-none rounded-lg transition-colors font-semibold text-xs"
              onClick={() => onViewDetail(distributor)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Detalle
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-600 border-none rounded-lg transition-colors"
              onClick={() => onEdit(distributor)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0 bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-600 border-none rounded-lg transition-colors"
              onClick={() => onDelete(distributor)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
