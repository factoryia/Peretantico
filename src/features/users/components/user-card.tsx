"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import {
  Edit,
  Trash2,
  Mail,
  Calendar,
  Key,
  User as UserIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { AuthUser } from "../types";

interface UserCardProps {
  user: AuthUser;
  onEdit: (user: AuthUser) => void;
  onDelete: (user: AuthUser) => void;
  onChangePassword: (user: AuthUser) => void;
  index?: number;
}

export function UserCard({
  user,
  onEdit,
  onDelete,
  onChangePassword,
  index = 0,
}: UserCardProps) {
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

  const getRoleBadge = (role?: string) => {
    if (role === "Administrador") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      );
    }
    if (role === "Repartidor") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <Truck className="w-3 h-3" />
          Repartidor
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <UserIcon className="w-3 h-3" />
        Usuario
      </span>
    );
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
                    src={user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=3b82f6,6366f1,8b5cf6&fontFamily=Poppins`}
                  />
                  <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {user.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {getRoleBadge(user.role)}
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    ID: {user.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 relative flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Contact Group */}
            <div className="rounded-xl bg-gray-50/50 p-3 space-y-2 border border-gray-100/50">
              <div className="flex items-center text-xs text-gray-600">
                <div className="p-1.5 bg-white rounded-lg shadow-2xs mr-2 text-blue-500">
                  <Mail className="h-3 w-3" />
                </div>
                <span className="truncate flex-1 font-medium">
                  {user.email}
                </span>
              </div>
            </div>

            <div className="flex items-center text-[10px] font-medium text-gray-400">
              <Calendar className="mr-1.5 h-3 w-3" />
              Creado: {formatDate(user.createdAt)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="secondary"
              className="flex-1 h-9 bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-600 border-none rounded-lg transition-colors font-semibold text-xs"
              onClick={() => onEdit(user)}
            >
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-600 border-none rounded-lg transition-colors"
              title="Cambiar Contraseña"
              onClick={() => onChangePassword(user)}
            >
              <Key className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="secondary"
              className="h-9 w-9 p-0 bg-gray-50 hover:bg-red-50 hover:text-red-500 text-gray-600 border-none rounded-lg transition-colors"
              onClick={() => onDelete(user)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
