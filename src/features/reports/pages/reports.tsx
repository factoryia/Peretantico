import { useState } from "react";
import {
  Download,
  BarChart2,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Bike,
  Zap,
  Package as PackageIcon,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDistributorsQuery } from "../hooks/use-distributors";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { useCoverageAreasQuery } from "@/features/distributors/hooks/taxonomies";
import { type TaxonomyTerm } from "@/types/global";
import { useStatsQuery } from "../hooks/use-stats";
import { useReportsQuery } from "../hooks/use-reports";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE_URL } from "@/features/auth/constants";
import { Paginator } from "@/components/common/paginator";

const statusStyles: Record<string, string> = {
  "En análisis": "bg-orange-50 text-orange-600 border-orange-100",
  "En trámite": "bg-blue-50 text-blue-600 border-blue-100",
  Finalizada: "bg-green-50 text-green-600 border-green-100",
  Atendidas: "bg-indigo-50 text-indigo-600 border-indigo-100",
  Incompleta: "bg-rose-50 text-rose-600 border-rose-100",
  Rechazada: "bg-slate-50 text-slate-600 border-slate-100",
};

export function Reports() {
  const [filters, setFilters] = useState({
    page: 0,
    limit: 10,
    period: "this_month",
    service: "all",
    billing: "all",
  });

  const [distFilters, setDistFilters] = useState({
    page: 0,
    limit: 10,
    search: "",
    payment_status: "all",
  });

  const { data: statsData, isLoading: isLoadingStats } = useStatsQuery();
  const { data: coverageAreas } = useCoverageAreasQuery();

  const { data: reportsData, isLoading: isLoadingReports } = useReportsQuery({
    page: filters.page,
    limit: filters.limit,
    period: filters.period !== "all" ? [filters.period] : undefined,
    service: filters.service !== "all" ? filters.service : undefined,
    billing: filters.billing !== "all" ? filters.billing : undefined,
  });

  const { data: distributorsData, isLoading: isLoadingDistributors } =
    useDistributorsQuery({
      page: distFilters.page,
      limit: distFilters.limit,
      search: distFilters.search,
      payment_status: distFilters.payment_status,
    });

  const distTotalPages = distributorsData
    ? Math.ceil(distributorsData.meta.total_count / distFilters.limit)
    : 0;

  // Filter requests to show only those with complete service info
  const filteredRequests =
    reportsData?.data.filter(
      (request) => request.service && request.service.type_label
    ) || [];

  const getStatCount = (key: string) => {
    return statsData?.find((s) => s.key === key)?.count || 0;
  };

  const totalRequests =
    statsData?.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const successRequests = getStatCount("atendidas");
  const inProgressRequests = getStatCount("en_proceso");
  const finishedRequests = getStatCount("finalizada");

  const statCards = [
    {
      title: "Total Solicitudes",
      value: totalRequests,
      description: "Acumulado total",
      icon: <BarChart2 className="h-5 w-5 text-indigo-600" />,
      color: "indigo",
      bg: "bg-indigo-50/50",
      iconBg: "bg-indigo-100",
      border: "border-indigo-200",
    },
    {
      title: "Atendidas",
      value: successRequests,
      description: "Recibidas por el sistema",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      color: "emerald",
      bg: "bg-emerald-50/50",
      iconBg: "bg-emerald-100",
      border: "border-emerald-200",
    },
    {
      title: "En Proceso",
      value: inProgressRequests,
      description: "Actualmente en gestión",
      icon: <Clock className="h-5 w-5 text-blue-600" />,
      color: "blue",
      bg: "bg-blue-50/50",
      iconBg: "bg-blue-100",
      border: "border-blue-200",
    },
    {
      title: "Finalizadas",
      value: finishedRequests,
      description: "Gestión terminada",
      icon: <CheckCircle2 className="h-5 w-5 text-indigo-600" />,
      color: "indigo",
      bg: "bg-indigo-50/50",
      iconBg: "bg-indigo-100",
      border: "border-indigo-200",
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const extractId = (idString: string) => {
    const match = idString.match(/#([A-Z0-9-]+)/);
    return match ? `#${match[1].split("-").pop()}` : idString;
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="overflow-y-auto h-full bg-slate-50/50 pb-10">
      <SidebarHeader title="Panel de Control" />

      <div className="flex flex-1 flex-col gap-8 p-6 lg:p-8">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Panel de Control
          </h2>
          <p className="text-slate-500 font-medium">
            Gestión de facturación y operación logística
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 bg-white rounded-lg p-6">
          {isLoadingStats
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-none">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                      <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : statCards.map((stat, index) => (
                <Card
                  key={index}
                  className={cn(
                    "border-2 shadow-none transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                    stat.bg,
                    stat.border
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 mb-1">
                          {stat.title}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-3xl font-bold text-slate-900">
                            {stat.value}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          {stat.description}
                        </p>
                      </div>
                      <div className={cn("p-2.5 rounded-xl", stat.iconBg)}>
                        {stat.icon}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Filters and Table Section */}
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardContent className="p-0">
            {/* Filter Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Reporte Solicitudes
                </h3>
              </div>
              <Button
                variant="outline"
                className="h-10 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold transition-all cursor-pointer min-w-[180px]"
                onClick={() => {
                  if (reportsData?.meta.export_url) {
                    const url = reportsData.meta.export_url.startsWith("http")
                      ? reportsData.meta.export_url
                      : `${API_BASE_URL}${reportsData.meta.export_url}`;
                    window.open(url, "_blank");
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar a Excel
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">
                  Periodo
                </label>
                <Select
                  value={filters.period}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, period: v, page: 0 }))
                  }
                >
                  <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500">
                    <SelectValue placeholder="Seleccionar periodo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="this_week">Esta Semana</SelectItem>
                    <SelectItem value="this_month">Este Mes</SelectItem>
                    <SelectItem value="last_month">Mes Pasado</SelectItem>
                    <SelectItem value="all">Todo el tiempo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">
                  Zona de Cobertura
                </label>
                <Select
                  value={filters.service}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, service: v, page: 0 }))
                  }
                >
                  <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500">
                    <SelectValue placeholder="Todas las zonas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todas las zonas</SelectItem>
                    {coverageAreas?.map((area: TaxonomyTerm) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">
                  Facturación
                </label>
                <Select
                  value={filters.billing}
                  onValueChange={(v) =>
                    setFilters((f) => ({ ...f, billing: v, page: 0 }))
                  }
                >
                  <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500">
                    <SelectValue placeholder="Todo Precio" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todo Precio</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="priority">Prioritaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Table */}
            <div className="border-t border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="py-4 font-bold text-slate-500 uppercase text-xs pl-8">
                      ID
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-500 uppercase text-xs">
                      Servicio
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-500 uppercase text-xs">
                      Facturación
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-500 uppercase text-xs text-center">
                      Estado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingReports
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow
                          key={i}
                          className="border-b border-slate-50 hover:bg-transparent"
                        >
                          <TableCell className="pl-8 py-5">
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell className="flex justify-center">
                            <Skeleton className="h-7 w-24 rounded-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : filteredRequests.map((request) => (
                        <TableRow
                          key={request.nid}
                          className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="pl-8 py-5 font-bold text-slate-900">
                            {extractId(request.id)}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]">
                            {request.service.type_label}
                          </TableCell>
                          <TableCell className="text-slate-900 font-bold">
                            {formatCurrency(request.billing_value)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-3 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider border",
                                request.status
                                  ? statusStyles[request.status.name] ||
                                      "bg-slate-50 text-slate-600 border-slate-100"
                                  : "bg-slate-50 text-slate-400 border-slate-100"
                              )}
                            >
                              {request.status?.name || "Sin estado"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoadingReports && filteredRequests.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-32 text-center text-slate-400 font-medium"
                      >
                        No se encontraron resultados para los filtros
                        seleccionados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {reportsData && reportsData.meta.total_pages > 1 && (
              <div className="px-6 py-6 border-t border-slate-100">
                <Paginator
                  currentPage={filters.page + 1}
                  totalPages={reportsData.meta.total_pages}
                  onPageChange={(page) =>
                    setFilters((f) => ({ ...f, page: page - 1 }))
                  }
                  pageSize={filters.limit}
                  onPageSizeChange={(size) =>
                    setFilters((f) => ({ ...f, limit: size, page: 0 }))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distributor Management Card */}
        <Card className="border-none shadow-sm overflow-hidden bg-white mt-8">
          <CardContent className="p-0">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Bike className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Gestión Repartidores
                </h3>
              </div>
              <Button
                variant="outline"
                className="h-10 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold transition-all cursor-pointer min-w-[120px]"
                onClick={() => {
                  if (distributorsData?.meta.export_url) {
                    const url = distributorsData.meta.export_url.startsWith(
                      "http"
                    )
                      ? distributorsData.meta.export_url
                      : `${API_BASE_URL}${distributorsData.meta.export_url}`;
                    window.open(url, "_blank");
                  }
                }}
              >
                <FileText className="mr-2 h-4 w-4" /> Excel
              </Button>
            </div>

            {/* Filters */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">
                  Estado Pago (Finalizadas)
                </label>
                <Select
                  value={distFilters.payment_status}
                  onValueChange={(v) =>
                    setDistFilters((f) => ({
                      ...f,
                      payment_status: v,
                      page: 0,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Recibido">Recibido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">
                  Buscar Repartidor
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Nombre..."
                    className="h-11 pl-10 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500"
                    value={distFilters.search}
                    onChange={(e) =>
                      setDistFilters((f) => ({
                        ...f,
                        search: e.target.value,
                        page: 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mt-4 border-t border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider pl-8">
                      REPARTIDOR
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      ENTREGAS
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      TIPO ENTREGA
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      ESTADO PAGO
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDistributors
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-8 py-5">
                            <Skeleton className="h-10 w-40 rounded-lg" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-12 mx-auto" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-24 mx-auto rounded-full" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20 mx-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    : distributorsData?.data.map((item, idx) => (
                        <TableRow
                          key={idx}
                          className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="pl-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 uppercase">
                                {getInitials(item.distributor.title)}
                              </div>
                              <span className="font-semibold text-slate-700">
                                {item.distributor.title}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-600">
                            {item.deliveries_count}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.delivery_type === "Prioritaria" ? (
                              <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold px-3 py-1 hover:bg-indigo-50">
                                <Zap className="h-3 w-3 mr-1.5 fill-indigo-600" />
                                Prioritaria
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-600 border-slate-200 font-bold px-3 py-1 hover:bg-slate-50"
                              >
                                <PackageIcon className="h-3 w-3 mr-1.5" />
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {item.payment_status === "Pagado" ||
                              item.payment_status === "paid" ? (
                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase">
                                  <Check className="h-3.5 w-3.5" />
                                  Pagado
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs uppercase">
                                  <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Pendiente
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {/* {distributorsData && distTotalPages > 1 && ( */}
            <div className="px-6 py-6 border-t border-slate-100">
              <Paginator
                currentPage={distFilters.page + 1}
                totalPages={distTotalPages}
                onPageChange={(page) =>
                  setDistFilters((f) => ({ ...f, page: page - 1 }))
                }
                pageSize={distFilters.limit}
                onPageSizeChange={(size) =>
                  setDistFilters((f) => ({ ...f, limit: size, page: 0 }))
                }
              />
            </div>
            {/* )} */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
