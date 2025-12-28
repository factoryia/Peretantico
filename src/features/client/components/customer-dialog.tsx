// components/customer-dialog.tsx
"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          mode === "view" ? "sm:max-w-[700px]" : "sm:max-w-[800px]"
        } max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle
            className={mode === "view" ? "text-slate-500 font-normal" : ""}
          >
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && customer ? (
          <CustomerDetailView customer={customer} onClose={handleCancel} />
        ) : (
          <CustomerForm
            customer={customer}
            mode={mode}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
