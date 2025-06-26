import React from "react";
import { Package, Sparkles } from "lucide-react";
import { useLocation } from "react-router";
import { cn } from "@/lib/utils";

interface FormWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormWrapper({
  title,
  description,
  children,
}: FormWrapperProps) {
  const { pathname } = useLocation();

  return (
    <div className="bg-white rounded-xl overflow-hidden sm:w-md">
      <div className="px-2 sm:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-8">
            {/* Logo */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Package className="size-5 text-blue-600" />
              </div>
              <span className="text-xl font-semibold">Pere Tantico</span>
            </div>

            {/* Welcome badge */}
            <div
              className={cn(
                "inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2 rounded-full border border-blue-100 mt-3",
                pathname !== "/iniciar-sesion" && "hidden"
              )}
            >
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">
                Bienvenido de vuelta
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          {description && (
            <p className="text-xl text-gray-600">{description}</p>
          )}
        </div>

        {/* children form */}
        {children}
      </div>
    </div>
  );
}
