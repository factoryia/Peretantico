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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Customer, type FormMode } from "../types";
import { fetchProfiles } from "../utils/customer";
import { CustomerTable } from "./customer-table";
import { CustomerFormDialog } from "./customer-dialog";
import { Paginator } from "@/components/common/paginator";
import { Plus } from "lucide-react";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { PROFILE_QUERY_KEY } from "../constants";
import { departamento } from "../constants/colombia";

export default function CustomerManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | undefined>(
    undefined
  );
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [filterName, setFilterName] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("Todos");
  const [filterMunicipality, setFilterMunicipality] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
        filterDepartment === "Todos" ? "" : filterDepartment,
        filterMunicipality === "Todos" ? "" : filterMunicipality,
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

  const filteredMunicipalities =
    filterDepartment === "Todos"
      ? []
      : departamento.find((d) => d.departamento === filterDepartment)
          ?.ciudades || [];

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
              <div className="space-y-2">
                <Label htmlFor="filterDepartment">Departamento</Label>
                <Select
                  onValueChange={(value) => {
                    setFilterDepartment(value);
                    setFilterMunicipality("Todos");
                  }}
                  value={filterDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {departamento.map((d) => (
                      <SelectItem key={d.id} value={d.departamento}>
                        {d.departamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterMunicipality">Municipio</Label>
                <Select
                  onValueChange={(value) => setFilterMunicipality(value)}
                  value={filterMunicipality}
                  disabled={filterDepartment === "Todos"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los municipios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {filteredMunicipalities.map((municipio) => (
                      <SelectItem key={municipio} value={municipio}>
                        {municipio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
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
