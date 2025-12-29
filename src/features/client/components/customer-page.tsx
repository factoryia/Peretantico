"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Search, Filter } from "lucide-react";
import { type Customer, type FormMode } from "../types";
import { fetchProfiles } from "../utils/customer";
import { CustomerTable } from "./customer-table";
import { CustomerFormDialog } from "./customer-dialog";
import { Paginator } from "@/components/common/paginator";
import { CustomerTableSkeleton } from "./skeletons/customer-skeleton";
import { PROFILE_QUERY_KEY } from "../constants";

export default function CustomerManagementPage() {
  // --- Estados locales ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | undefined>(
    undefined
  );
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [filterName, setFilterName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --- Carga de clientes desde el backend ---
  const { data, isLoading: isLoadingCustomers } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, filterName, currentPage, pageSize],
    queryFn: () => fetchProfiles(filterName, "", "", currentPage, pageSize),
    staleTime: 0,
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.totalPages ?? 1;

  // --- Acciones ---
  const handleCreateClick = () => {
    setCurrentCustomer(undefined);
    setFormMode("create");
    setIsModalOpen(true);
  };

  const handleViewClick = (customer: Customer) => {
    setCurrentCustomer(customer);
    setFormMode("view");
    setIsModalOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setCurrentCustomer(customer);
    setFormMode("edit");
    setIsModalOpen(true);
  };

  const clearFilters = () => setFilterName("");

  return (
    <>
      <div className="space-y-4 font-['Poppins',sans-serif]">
        {/* --- Filtros --- */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-md">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                  Filtros
                </h2>
                <p className="text-sm text-muted-foreground">
                  busca y gestiona tus clientes
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {filterName && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              )}
              <Button
                onClick={handleCreateClick}
                size="sm"
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Cliente
              </Button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="filterName"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Nombre completo
                </Label>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    id="filterName"
                    placeholder="Filtrar por nombre..."
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="pl-9 pr-3 py-2.5 h-10 bg-gray-50/50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:bg-gray-50 shadow-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Listado --- */}
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-white">
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              Listado de Clientes
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoadingCustomers
                ? "Cargando clientes..."
                : `${customers.length} cliente(s) encontrado(s)`}
            </p>
          </div>

          <div className="p-0">
            {isLoadingCustomers ? (
              <CustomerTableSkeleton />
            ) : (
              <>
                <CustomerTable
                  customers={customers}
                  onView={handleViewClick}
                  onEdit={handleEditClick}
                />
                <div className="p-4 border-t">
                  <Paginator
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- Modal de formulario (crear, ver, editar) --- */}
      <CustomerFormDialog
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        customer={currentCustomer}
        mode={formMode}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  );
}
