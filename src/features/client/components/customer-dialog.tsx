// components/customer-dialog.tsx
"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit } from "lucide-react";
import { CustomerDetailView } from "./customer-detail-view";
import { CustomerForm } from "./customer-form";
import type { Customer, FormMode } from "../types";

interface CustomerFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  mode: FormMode;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function CustomerFormDialog({
  isOpen,
  onOpenChange,
  customer,
  mode,
  onCancel,
  onSuccess,
}: CustomerFormDialogProps) {
  const getTitle = () => {
    switch (mode) {
      case "create":
        return "Crear Nuevo Cliente";
      case "edit":
        return "Editar Cliente";
      case "view":
        return "Detalle del Cliente";
      default:
        return "Cliente";
    }
  };
  const getDescription = () => {
    switch (mode) {
      case "create":
        return "Complete los campos para registrar un nuevo cliente.";
      case "edit":
        return "Modifique la información del cliente y guarde los cambios.";
      case "view":
        return "Información detallada del cliente.";
      default:
        return "";
    }
  };

  // Función que combina onCancel y onSuccess
  const handleCancel = () => {
    onCancel();
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          mode === "view" ? "sm:max-w-[700px]" : "sm:max-w-[550px]"
        } max-h-[90vh] overflow-y-auto p-0 border-none bg-white`}
      >
        {mode !== "view" && (
          <DialogHeader className="p-6 bg-white border-b border-gray-100 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  mode === "create"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {mode === "create" ? (
                  <Plus className="h-5 w-5" />
                ) : (
                  <Edit className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {getTitle()}
                </DialogTitle>
                <p className="text-xs text-gray-500 font-medium">
                  {getDescription()}
                </p>
              </div>
            </div>
          </DialogHeader>
        )}

        <div className="p-6">
          {mode === "view" && customer ? (
            <CustomerDetailView customer={customer} onClose={handleCancel} />
          ) : (
            <CustomerForm
              customer={customer}
              mode={mode}
              onCancel={handleCancel}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
