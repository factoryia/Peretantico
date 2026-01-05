"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Eye, Edit, Phone, MapPin, CreditCard } from "lucide-react";
import type { Customer } from "../types";

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onView: (customer: Customer) => void;
  index?: number;
}

export function CustomerCard({
  customer,
  onEdit,
  onView,
  index = 0,
}: CustomerCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-gray-100 bg-white h-full flex flex-col">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl group-hover:bg-blue-100/50 transition-colors" />

        <CardHeader className="pb-4 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-white shadow-md ring-1 ring-gray-100">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${customer.fullName}&backgroundColor=3b82f6,6366f1,8b5cf6&fontFamily=Poppins`}
                  />
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                    {getInitials(customer.fullName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {customer.fullName}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-gray-500 truncate">
                    {customer.email}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 relative flex-1 flex flex-col">
          {/* Main Info Groups */}
          <div className="grid grid-cols-1 gap-3 flex-1">
            {/* Contact & Location Group */}
            <div className="rounded-xl bg-gray-50/50 p-3 space-y-2 border border-gray-100/50">
              <div className="flex items-center text-xs text-gray-600">
                <div className="p-1.5 bg-white rounded-lg shadow-2xs mr-2 text-blue-500">
                  <MapPin className="h-3 w-3" />
                </div>
                <span className="truncate flex-1 font-medium">
                  {customer.municipality}, {customer.department}
                </span>
              </div>
            </div>

            {/* Document Group */}
            <div className="rounded-xl border border-gray-100 p-2.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  <CreditCard className="mr-1.5 h-3 w-3 text-indigo-500" />
                  {customer.documentType}
                </div>
                <span className="text-xs font-black text-gray-900">
                  {customer.documentNumber}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                <div className="flex items-center text-[10px] uppercase tracking-wider font-bold text-gray-400">
                  <Phone className="mr-1.5 h-3 w-3 text-indigo-500" />
                  Teléfono
                </div>
                <span className="text-xs font-bold text-gray-700">
                  {customer.phoneNumber
                    ? formatPhone(customer.phoneNumber)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1 h-9 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 border-none rounded-lg transition-colors font-semibold text-xs"
              onClick={() => onView(customer)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Detalle
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-600 border-none rounded-lg transition-colors"
              onClick={() => onEdit(customer)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
