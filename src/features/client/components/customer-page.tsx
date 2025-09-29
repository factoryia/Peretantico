"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type Customer, type FormMode } from "../types";
import { fetchProfiles } from "../utils/customer";
import { CustomerTable } from "./customer-table";
import { CustomerFormDialog } from "./customer-dialog";
import { Paginator } from "@/components/common/paginator";
import { Plus } from "lucide-react";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { PROFILE_QUERY_KEY } from "../constants";

/**
 * Página principal para la gestión de clientes.
 * Permite:
 * - Listar clientes con paginación
 * - Filtrar por nombre (y luego departamento/municipio si se habilita)
 * - Crear, ver y editar clientes mediante un modal
 */
export default function CustomerManagementPage() {
  // --- Estados locales ---
  const [isModalOpen, setIsModalOpen] = useState(false); // controla la apertura del modal
  const [currentCustomer, setCurrentCustomer] = useState<Customer | undefined>(undefined); // cliente en edición o visualización
  const [formMode, setFormMode] = useState<FormMode>("create"); // modo actual del formulario (create | edit | view)
  const [filterName, setFilterName] = useState(""); // filtro por nombre
  const [currentPage, setCurrentPage] = useState(1); // página actual
  const [pageSize, setPageSize] = useState(10); // tamaño de página

  // --- Carga de clientes desde el backend con React Query ---
  const { data, isLoading: isLoadingCustomers } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, filterName, currentPage, pageSize],
    queryFn: () => fetchProfiles(filterName, "", "", currentPage, pageSize),
    staleTime: 0 // cache por 5 minutos
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.totalPages ?? 1;

  // --- Acciones de la tabla/modal ---
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

  return (
    <>
      <div className="space-y-4">
        {/* --- Filtros --- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Gestión de Clientes
              </CardTitle>
              <Button className="flex justify-center items-center" onClick={handleCreateClick}>
                <Plus /> Crear Cliente
              </Button>
            </div>
            <CardDescription className="text-base">
              Filtrar los clientes por nombre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterName">Nombre completo</Label>
                <Input
                  id="filterName"
                  placeholder="Filtrar por nombre"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Listado con tabla y paginación --- */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Clientes</CardTitle>
            <CardDescription>
              {isLoadingCustomers
                ? "Cargando clientes..."
                : `${customers.length} cliente(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCustomers ? (
              <TableSkeleton />
            ) : (
              <>
                <CustomerTable
                  customers={customers}
                  onView={handleViewClick}
                  onEdit={handleEditClick}
                />
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
              </>
            )}
          </CardContent>
        </Card>
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
