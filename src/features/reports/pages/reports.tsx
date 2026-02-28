import { useState, useMemo } from "react";
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
  Eye,
  Edit,
  CreditCard,
  History,
  DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDistributorsQuery, fetchDistributors } from "../hooks/use-distributors";
import { usePaymentsQuery } from "@/features/costs/hooks/use-payments";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Paginator } from "@/components/common/paginator";
import { RequestDetailViewModal } from "@/features/home/components/request-detail-view";
import { EditRequestModal } from "@/features/home/components/edit-request-modal";
import { 
  fetchCompleteRequests, 
  type CompleteRequest,
  useCompleteRequests
} from "@/features/home/utils/complete-request";
import { exportToExcel } from "@/utils/excel";
import { 
  assignDistributorToRequest, 
  updateRequest 
} from "@/features/home/utils/request";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const statusStyles: Record<string, string> = {
  "En análisis": "bg-orange-50 text-orange-600 border-orange-100",
  "En trámite": "bg-blue-50 text-blue-600 border-blue-100",
  EnProceso: "bg-blue-50 text-blue-600 border-blue-100",
  Finalizada: "bg-green-50 text-green-600 border-green-100",
  Atendida: "bg-indigo-50 text-indigo-600 border-indigo-100",
  Incompleta: "bg-rose-50 text-rose-600 border-rose-100",
  Rechazada: "bg-slate-50 text-slate-600 border-slate-100",
};

export function Reports() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    period: "Este Mes",
    service: "all",
    billing: "all",
    search: "",
    paymentStatus: "all",
  });

  const [distFilters, setDistFilters] = useState({
    page: 0,
    limit: 10,
    search: "",
    payment_status: "all",
  });

  const [paymentFilters, setPaymentFilters] = useState({
    page: 0,
    limit: 10,
  });

  const [selectedFullRequest, setSelectedFullRequest] = useState<CompleteRequest | null>(null);
  const [isLoadingFullRequest, setIsLoadingFullRequest] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: statsData, isLoading: isLoadingStats } = useStatsQuery();

  const handleFetchFullRequest = async (requestId: string) => {
     setIsLoadingFullRequest(true);
     try {
       // Extraer el ID real si viene con prefijo (ej: "Solicitud #APP-001")
       const cleanId = requestId.includes("#") ? requestId.split("#").pop() || requestId : requestId;
       
       // Usar fetchCompleteRequests con filtro de número de solicitud
       const response = await fetchCompleteRequests({ requestNumber: cleanId });
       if (response.data && response.data.length > 0) {
         setSelectedFullRequest(response.data[0]);
       } else {
         toast.error("No se pudo encontrar el detalle de la solicitud");
       }
     } catch (error) {
       console.error("Error fetching full request:", error);
       toast.error("Error al cargar los detalles de la solicitud");
     } finally {
       setIsLoadingFullRequest(false);
     }
   };

  const handleAssignDistributor = async (distributorId: string) => {
    if (!selectedFullRequest) return;
    try {
      await assignDistributorToRequest(selectedFullRequest.id, distributorId);
      await handleFetchFullRequest(selectedFullRequest.field_application_number);
      queryClient.invalidateQueries({ queryKey: ["complete-requests"] });
      toast.success("Repartidor asignado correctamente");
    } catch (error) {
      console.error("Error assigning distributor:", error);
      toast.error("Error al asignar el repartidor");
    }
  };

  const handleUpdateRequest = async (requestId: string, data: any) => {
    try {
      await updateRequest(requestId, data);
      await handleFetchFullRequest(selectedFullRequest?.field_application_number || "");
      queryClient.invalidateQueries({ queryKey: ["complete-requests"] });
      toast.success("Solicitud actualizada correctamente");
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Error al actualizar la solicitud");
    }
  };
  const { data: coverageAreas } = useCoverageAreasQuery();

  const reportFilters = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      periodo: filters.period !== "all" ? filters.period : undefined,
      zonaId: filters.service !== "all" ? filters.service : undefined,
      isPrioritized: filters.billing === "priority" ? true : filters.billing === "normal" ? false : undefined,
      paymentStatus: filters.paymentStatus !== "all" ? filters.paymentStatus : undefined,
      search: filters.search || undefined,
    }),
    [filters]
  );

  const { data: reportsData, isLoading: isLoadingReports } =
    useCompleteRequests(reportFilters);

  // Filter requests to show only those with complete service info
  const filteredRequests = reportsData?.data || [];

  const distFiltersMemo = useMemo(
    () => ({
      page: distFilters.page,
      limit: distFilters.limit,
      search: distFilters.search,
      paymentStatus:
        distFilters.payment_status !== "all"
          ? distFilters.payment_status
          : undefined,
    }),
    [
      distFilters.page,
      distFilters.limit,
      distFilters.search,
      distFilters.payment_status,
    ]
  );

  const { data: distributorsData, isLoading: isLoadingDistributors } =
    useDistributorsQuery(distFiltersMemo);

  const { data: paymentsData, isLoading: isLoadingPayments } = usePaymentsQuery({
    page: paymentFilters.page + 1,
    limit: paymentFilters.limit,
  });

  const paymentsList = useMemo(() => {
    if (Array.isArray(paymentsData)) return paymentsData;
    if (paymentsData && typeof paymentsData === 'object' && Array.isArray((paymentsData as any).data)) {
      return (paymentsData as any).data;
    }
    return [];
  }, [paymentsData]);

  const paymentsTotalPages = useMemo(() => {
    if (paymentsData && typeof paymentsData === 'object') {
      const total = (paymentsData as any).total ?? (paymentsData as any).count ?? (paymentsData as any).meta?.total ?? (paymentsData as any).meta?.count;
      if (typeof total === 'number') return Math.ceil(total / paymentFilters.limit);
      
      const lastPage = (paymentsData as any).lastPage ?? (paymentsData as any).totalPages ?? (paymentsData as any).meta?.lastPage ?? (paymentsData as any).meta?.totalPages;
      if (typeof lastPage === 'number') return lastPage;
    }
    return 0;
  }, [paymentsData, paymentFilters.limit]);

  const distTotalPages = useMemo(() => {
    if (distributorsData && typeof distributorsData === 'object') {
      const total = (distributorsData as any).total ?? (distributorsData as any).count ?? (distributorsData as any).meta?.total ?? (distributorsData as any).meta?.count;
      
      if (typeof total === 'number') {
        return Math.ceil(total / distFilters.limit);
      }

      const lastPage = (distributorsData as any).lastPage ?? (distributorsData as any).totalPages ?? (distributorsData as any).meta?.lastPage ?? (distributorsData as any).meta?.totalPages;
      if (typeof lastPage === 'number') return lastPage;
    }
    
    if (Array.isArray(distributorsData)) {
      return Math.ceil(distributorsData.length / distFilters.limit);
    }
    return 0;
  }, [distributorsData, distFilters.limit]);

  const paidDistributorIds = useMemo(() => {
    return new Set(paymentsList.map((p: any) => p.distributorId).filter(Boolean));
  }, [paymentsList]);

  const distributorDeliveryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredRequests.forEach(req => {
      const dId = req.distributor?.id;
      if (dId) {
        stats[dId] = (stats[dId] || 0) + 1;
      }
    });
    return stats;
  }, [filteredRequests]);

  const totalRequests = statsData?.totalRequests ?? 0;
  const successRequests = statsData?.requestsByStatus?.Atendida ?? 0;
  const inProgressRequests = statsData?.requestsByStatus?.EnProceso ?? 0;
  const finishedRequests = statsData?.requestsByStatus?.Finalizada ?? 0;
  const incompleteRequests = statsData?.requestsByStatus?.Incompleta ?? 0;

  const distributorsList = useMemo(() => {
    if (Array.isArray(distributorsData)) return distributorsData;
    if (distributorsData && typeof distributorsData === 'object') {
      const data = (distributorsData as any).data ?? (distributorsData as any).items ?? (distributorsData as any).distributors;
      if (Array.isArray(data)) return data;
    }
    return [];
  }, [distributorsData]);

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
    {
      title: "Incompletas",
      value: incompleteRequests,
      description: "Solicitudes incompletas",
      icon: <FileText className="h-5 w-5 text-rose-600" />,
      color: "rose",
      bg: "bg-rose-50/50",
      iconBg: "bg-rose-100",
      border: "border-rose-200",
    },
  ];

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(numValue || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("es-CO").format(value || 0);
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
  };

  const handleExportRequests = async () => {
    try {
      toast.loading("Generando reporte de solicitudes...", { id: "export-requests" });
      const { data } = await fetchCompleteRequests({
        ...reportFilters,
        limit: 10000, // Fetch all (or a large enough number)
        page: 1,
      });

      const exportData = data.map((req) => ({
        "ID Solicitud": req.field_application_number,
        "Fecha Creación": new Date(req.created).toLocaleDateString("es-CO"),
        "Título": req.title,
        "Servicio": req.subservice?.name || "N/A",
        "Estado": req.requestStatus,
        "Solicitante": req.applicant?.name || "N/A",
        "Documento Solicitante": req.applicant?.documentNumber || "N/A",
        "Repartidor Asignado": req.distributor?.name || "Sin asignar",
        "Valor Servicio": req.field_service_value,
        "Valor Prioridad": req.field_prioritized_value,
        "Costo Logístico": req.field_logistics_costs,
        "Prioritaria": req.isPrioritized ? "Sí" : "No",
        "Observaciones": req.field_observations,
      }));

      exportToExcel(exportData, `Reporte_Solicitudes_${new Date().toISOString().split("T")[0]}`);
      toast.success("Reporte descargado correctamente", { id: "export-requests" });
    } catch (error) {
      console.error("Error exporting requests:", error);
      toast.error("Error al exportar el reporte", { id: "export-requests" });
    }
  };

  const handleExportDistributors = async () => {
    try {
      toast.loading("Generando reporte de repartidores...", { id: "export-distributors" });
      const { data } = await fetchDistributors({
        ...distFiltersMemo,
        limit: 10000, // Fetch all
        page: 0,
      });

      const exportData = data.map((dist) => ({
        "Nombre": dist.distributorName || dist.title || dist.name || "N/A",
        "Tipo Transporte": dist.deliveryType || dist.transportationType?.name || "N/A",
        "Estado Pago": dist.paymentStatus || "Pendiente",
        "Solicitudes Entregadas": distributorDeliveryStats[dist.id] || 0,
        "Email": dist.email || "N/A",
        "Teléfono": dist.phone || "N/A",
      }));

      exportToExcel(exportData, `Reporte_Repartidores_${new Date().toISOString().split("T")[0]}`);
      toast.success("Reporte descargado correctamente", { id: "export-distributors" });
    } catch (error) {
      console.error("Error exporting distributors:", error);
      toast.error("Error al exportar el reporte", { id: "export-distributors" });
    }
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 bg-white rounded-lg p-6">
          {isLoadingStats
            ? Array.from({ length: 5 }).map((_, i) => (
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
                            {formatNumber(stat.value)}
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
                  Gestión de solicitudes
                </h3>
              </div>
              <Button
                variant="outline"
                className="h-10 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold transition-all cursor-pointer min-w-[180px]"
                onClick={handleExportRequests}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar a Excel
              </Button>
            </div>

            {/* Filter Controls */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">
                    Periodo
                  </label>
                  <Select
                    value={filters.period}
                    onValueChange={(v) =>
                      setFilters((f) => ({ ...f, period: v, page: 1 }))
                    }
                  >
                    <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500">
                      <SelectValue placeholder="Seleccionar periodo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Hoy">Hoy</SelectItem>
                      <SelectItem value="Esta Semana">Esta Semana</SelectItem>
                      <SelectItem value="Este Mes">Este Mes</SelectItem>
                      <SelectItem value="Mes Pasado">Mes Pasado</SelectItem>
                      <SelectItem value="Todo el tiempo">Todo el tiempo</SelectItem>
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
                      setFilters((f) => ({ ...f, service: v, page: 1 }))
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
                      setFilters((f) => ({ ...f, billing: v, page: 1 }))
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

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-1">
                    Estado Pago
                  </label>
                  <Select
                    value={filters.paymentStatus}
                    onValueChange={(v) =>
                      setFilters((f) => ({ ...f, paymentStatus: v, page: 1 }))
                    }
                  >
                    <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="pagado">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">
                  Buscar solicitud
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Nombre solicitante, repartidor, título o radicado..."
                    className="h-11 pl-10 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-indigo-500"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        search: e.target.value,
                        page: 1,
                      }))
                    }
                  />
                </div>
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
                    <TableHead className="py-4 font-bold text-slate-500 uppercase text-xs text-center">
                      Acciones
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
                          <TableCell>
                            <Skeleton className="h-4 w-12 mx-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    : filteredRequests.map((request) => (
                        <TableRow
                          key={request.id}
                          className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="pl-8 py-5 font-bold text-slate-900">
                            {request.field_application_number}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]">
                            {request.subservice?.name || request.title}
                          </TableCell>
                          <TableCell className="text-slate-900 font-bold">
                            {formatCurrency((request.field_service_value || 0) + (request.field_prioritized_value || 0))}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-3 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider border",
                                request.requestStatus
                                  ? statusStyles[request.requestStatus] ||
                                      "bg-slate-50 text-slate-600 border-slate-100"
                                  : "bg-slate-50 text-slate-400 border-slate-100"
                              )}
                            >
                              {request.requestStatus || "Sin estado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setSelectedFullRequest(request);
                                  setIsDetailOpen(true);
                                }}
                                title="Ver detalle"
                                disabled={isLoadingReports || isLoadingFullRequest}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                                onClick={() => {
                                  setSelectedFullRequest(request);
                                  setIsEditOpen(true);
                                }}
                                title="Editar"
                                disabled={isLoadingReports || isLoadingFullRequest}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoadingReports && filteredRequests.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
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
            {reportsData && reportsData.meta.totalPages && reportsData.meta.totalPages > 1 && (
              <div className="px-6 py-6 border-t border-slate-100">
                <Paginator
                  currentPage={filters.page}
                  totalPages={reportsData.meta.totalPages}
                  onPageChange={(page) =>
                    setFilters((f) => ({ ...f, page: page }))
                  }
                  pageSize={filters.limit}
                  onPageSizeChange={(size) =>
                    setFilters((f) => ({ ...f, limit: size, page: 1 }))
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
                className="h-10 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold transition-all cursor-pointer min-w-[180px]"
                onClick={handleExportDistributors}
              >
                <Download className="mr-2 h-4 w-4" /> Exportar a Excel
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
                      SOLICITUDES ASIGNADAS
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
                    : distributorsList.map((item, idx) => (
                        <TableRow
                          key={idx}
                          className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="pl-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 uppercase">
                                {getInitials(item.distributorName || item.title || item.name || "S/N")}
                              </div>
                              <span className="font-semibold text-slate-700">
                                {item.distributorName || item.title || item.name || "Sin nombre"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-600">
                            {distributorDeliveryStats[item.id] || 0}
                          </TableCell>
                          <TableCell className="text-center">
                            {(item.deliveryType || item.transportationType?.name) === "Prioritaria" ? (
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
                                {item.deliveryType || item.transportationType?.name || "Normal"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {item.paymentStatus?.toLowerCase() === "pagado" ||
                              item.paymentStatus?.toLowerCase() === "paid" ||
                              item.status === "Pagado" ||
                              paidDistributorIds.has(item.id) ? (
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
                  {!isLoadingDistributors && distributorsList.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-32 text-center text-slate-400 font-medium"
                      >
                        No se encontraron repartidores registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {distTotalPages > 1 && (
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
            )}
          </CardContent>
        </Card>

        {/* Generated Payments Card */}
        <Card className="border-none shadow-sm overflow-hidden bg-white mt-8">
          <CardContent className="p-0">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  Pagos Generados (Módulo Costos)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <History className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-slate-600">Historial de Pagos</span>
              </div>
            </div>

            {/* Table */}
            <div className="border-t border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider pl-8">
                      REPARTIDOR / TÍTULO
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      VALOR BASE
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      ADICIONALES
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      DESCUENTOS
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      TOTAL PAGADO
                    </TableHead>
                    <TableHead className="py-4 font-bold text-slate-400 uppercase text-[11px] tracking-wider text-center">
                      FECHA
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPayments
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-8 py-5">
                            <Skeleton className="h-4 w-40 rounded-lg" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20 mx-auto" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20 mx-auto" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20 mx-auto" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24 mx-auto" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24 mx-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    : paymentsList.map((payment: any, idx: number) => (
                        <TableRow
                          key={payment.id || idx}
                          className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="pl-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">
                                {payment.title || "Pago sin título"}
                              </span>
                              {payment.distributor && (
                                <span className="text-xs text-slate-400 font-medium">
                                  {payment.distributor.title || payment.distributor.name}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-slate-600 font-medium">
                            {formatCurrency(payment.baseValue || 0)}
                          </TableCell>
                          <TableCell className="text-center text-indigo-600 font-bold">
                            + {formatCurrency(payment.additionalAmount || 0)}
                          </TableCell>
                          <TableCell className="text-center text-rose-500 font-bold">
                            - {formatCurrency(payment.discountAmount || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-sm border border-emerald-100">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(payment.totalAmount || 0)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-slate-400 text-xs font-medium">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoadingPayments && paymentsList.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-slate-400 font-medium"
                      >
                        No hay pagos generados recientemente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {paymentsTotalPages > 1 && (
              <div className="px-6 py-6 border-t border-slate-100">
                <Paginator
                  currentPage={paymentFilters.page + 1}
                  totalPages={paymentsTotalPages}
                  onPageChange={(page) =>
                    setPaymentFilters((f) => ({ ...f, page: page - 1 }))
                  }
                  pageSize={paymentFilters.limit}
                  onPageSizeChange={(size) =>
                    setPaymentFilters((f) => ({ ...f, limit: size, page: 0 }))
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <RequestDetailViewModal
        isOpen={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) setSelectedFullRequest(null);
        }}
        request={selectedFullRequest}
        onAssignDistributor={handleAssignDistributor}
        onUpdateRequest={handleUpdateRequest}
      />
      <EditRequestModal
        isOpen={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setSelectedFullRequest(null);
        }}
        request={selectedFullRequest}
      />
    </div>
  );
}
