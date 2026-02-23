"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Search, Filter, Users } from "lucide-react";
import { type Customer, type FormMode } from "../types";
import { fetchProfiles } from "../utils/customer";
import { CustomerCard } from "./customer-card";
import { CustomerFormDialog } from "./customer-dialog";
import { Paginator } from "@/components/common/paginator";
import { CustomerCardSkeleton } from "./skeletons/customer-card-skeleton";
// import { fetchTaxonomyTerms } from "@/utils/global";
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

  // --- Carga de taxonomías ---
  // Eliminado: traducción del tipo de documento por nombre para evitar inconsistencias de valor

  // --- Carga de clientes desde el backend ---
  const { data, isLoading: isLoadingCustomers } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, filterName, currentPage, pageSize],
    queryFn: () => fetchProfiles(filterName, "", "", currentPage, pageSize),
    staleTime: 0,
  });

  const customers = useMemo(() => data?.customers ?? [], [data]);

  const totalPages = data?.totalPages ?? 1;

  console.log("CLIENTS: ", customers);

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
      <div className="space-y-6 font-['Poppins',sans-serif]">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border relative overflow-hidden border-l-4 border-l-blue-600">
          {/* <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" /> */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Clientes
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                {isLoadingCustomers
                  ? "Cargando..."
                  : `${data?.totalCount ?? 0} cliente(s) gestionados`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {filterName && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-10 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 px-4 rounded-lg font-semibold"
              >
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
            <Button
              onClick={handleCreateClick}
              size="sm"
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 rounded-lg font-semibold w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-6 rounded-3xl border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Filtrar Búsqueda
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 ml-1">
                NOMBRE COMPLETO
              </Label>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Ej: Juan Pérez..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="pl-10 h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- Listado --- */}
        <div className="space-y-6">
          {isLoadingCustomers ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {Array.from({ length: pageSize }).map((_, index) => (
                <CustomerCardSkeleton key={index} />
              ))}
            </div>
          ) : customers.length > 0 ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {customers.map((customer, index) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    index={index}
                    onView={handleViewClick}
                    onEdit={handleEditClick}
                  />
                ))}
              </div>
              <div className="bg-white p-6 border rounded-3xl">
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
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
              <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                <Search className="h-12 w-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                No se encontraron clientes
              </h3>
              <p className="text-gray-500 max-w-xs mx-auto mt-2">
                No hay clientes registrados que coincidan con los criterios de
                búsqueda actuales.
              </p>
              {filterName && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="mt-4 text-blue-600 font-bold"
                >
                  Limpiar todos los filtros
                </Button>
              )}
            </div>
          )}
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
