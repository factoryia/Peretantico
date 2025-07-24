// app/customer-management/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query"; // Assuming @tanstack/react-query is installed
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

export default function CustomerManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | undefined>(
    undefined
  );
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [filterName, setFilterName] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch profiles using useQuery
  const { data, isLoading: isLoadingCustomers } = useQuery({
    queryKey: [
      PROFILE_QUERY_KEY,
      filterName,
      filterDepartment,
      filterMunicipality,
      currentPage,
      pageSize,
    ],
    queryFn: () =>
      fetchProfiles(
        filterName,
        filterDepartment,
        filterMunicipality,
        currentPage,
        pageSize
      ),
    staleTime: 5 * 60 * 1000,
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.totalPages ?? 1;

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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Gestión de Clientes
              </CardTitle>
              <Button
                className="flex justify-center items-center"
                onClick={handleCreateClick}
              >
                <Plus />
                Crear Cliente
              </Button>
            </div>
            <CardDescription className="text-base">
              Filtrar los clientes por nombre, departamento o municipio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterName">Nombre completo</Label>
                <Input
                  id="filterName"
                  placeholder="Filtrar por nombre"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterDepartment">Departamento</Label>
                <Input
                  id="filterDepartment"
                  placeholder="Filtrar por departamento"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterMunicipality">Municipio</Label>
                <Input
                  id="filterMunicipality"
                  placeholder="Filtrar por municipio"
                  value={filterMunicipality}
                  onChange={(e) => setFilterMunicipality(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle> Listado de Clientes</CardTitle>
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
