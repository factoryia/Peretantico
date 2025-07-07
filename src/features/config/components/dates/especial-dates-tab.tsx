import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Eye, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SearchInput } from "@/components/common/search-input";

const fechaEspecialSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(200, "Máximo 200 caracteres")
    .regex(/^[a-zA-Z0-9\s]+$/, "Solo se permiten caracteres alfanuméricos"),
  descripcion: z.string().max(250, "Máximo 250 caracteres").optional(),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  repetirAnual: z.enum(["si", "no"], {
    required_error: "Debe seleccionar una opción",
  }),
  estado: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

type FechaEspecialFormValues = z.infer<typeof fechaEspecialSchema>;

interface FechaEspecial {
  id: number;
  nombre: string;
  descripcion?: string;
  fecha: string;
  repetirAnual: "si" | "no";
  estado: "activo" | "inactivo";
  fechaCreacion: string;
}

const fechasEspecialesIniciales: FechaEspecial[] = [
  {
    id: 1,
    nombre: "Día de la Independencia",
    descripcion: "Celebración del día de la independencia nacional",
    fecha: "2024-07-20",
    repetirAnual: "si",
    estado: "activo",
    fechaCreacion: "2024-01-15",
  },
  {
    id: 2,
    nombre: "Navidad",
    descripcion: "Celebración navideña",
    fecha: "2024-12-25",
    repetirAnual: "si",
    estado: "activo",
    fechaCreacion: "2024-01-16",
  },
  {
    id: 3,
    nombre: "Evento Especial Empresa",
    descripcion: "Evento corporativo anual de la empresa",
    fecha: "2024-09-15",
    repetirAnual: "no",
    estado: "inactivo",
    fechaCreacion: "2024-01-17",
  },
];

export function SpecialDatesTab() {
  const [fechasEspeciales, setFechasEspeciales] = useState<FechaEspecial[]>(
    fechasEspecialesIniciales
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingFecha, setEditingFecha] = useState<FechaEspecial | null>(null);
  const [viewingFecha, setViewingFecha] = useState<FechaEspecial | null>(null);

  const form = useForm<FechaEspecialFormValues>({
    resolver: zodResolver(fechaEspecialSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      fecha: "",
      repetirAnual: "no",
      estado: "activo",
    },
  });

  const filteredFechas = fechasEspeciales.filter((fecha) =>
    fecha.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const onSubmit = (data: FechaEspecialFormValues) => {
    if (editingFecha) {
      setFechasEspeciales((prev) =>
        prev.map((fecha) =>
          fecha.id === editingFecha.id ? { ...fecha, ...data } : fecha
        )
      );
    } else {
      const newFecha: FechaEspecial = {
        id: Math.max(...fechasEspeciales.map((f) => f.id)) + 1,
        ...data,
        fechaCreacion: new Date().toISOString().split("T")[0],
      };
      setFechasEspeciales((prev) => [...prev, newFecha]);
    }

    setIsDialogOpen(false);
    setEditingFecha(null);
    form.reset();
  };

  const handleEdit = (fecha: FechaEspecial) => {
    setEditingFecha(fecha);
    form.reset({
      nombre: fecha.nombre,
      descripcion: fecha.descripcion || "",
      fecha: fecha.fecha,
      repetirAnual: fecha.repetirAnual,
      estado: fecha.estado,
    });
    setIsDialogOpen(true);
  };

  const handleViewDetail = (fecha: FechaEspecial) => {
    setViewingFecha(fecha);
    setIsDetailDialogOpen(true);
  };

  const handleNewFecha = () => {
    setEditingFecha(null);
    form.reset({
      nombre: "",
      descripcion: "",
      fecha: "",
      repetirAnual: "no",
      estado: "activo",
    });
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Fechas Especiales
            </CardTitle>
            <CardDescription className="text-base">
              Gestiona fechas especiales para el sistema de notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-y-2">
              <div className="flex items-center space-x-2">
                <SearchInput
                  placeholder="Buscar fechas especiales..."
                  value={searchTerm}
                  onValueChange={(value) => setSearchTerm(value)}
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewFecha}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Fecha
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingFecha
                        ? "Editar Fecha Especial"
                        : "Nueva Fecha Especial"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingFecha
                        ? "Modifica los datos de la fecha especial existente."
                        : "Completa los datos para crear una nueva fecha especial."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la fecha especial</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: Día de la Independencia"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Nombre identificador de la fecha especial
                              (alfanumérico).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="descripcion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción de fecha especial</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descripción opcional de la fecha especial"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Descripción más detallada de la fecha especial, si
                              se requiere.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fecha"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              Selecciona la fecha especial (formato DD/MM/AAAA).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="repetirAnual"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repetir cada año</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione una opción" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="no">No</SelectItem>
                                <SelectItem value="si">Sí</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Presentará por defecto la opción No.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="inactivo">
                                  Inactivo
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Define si la fecha está disponible o no para las
                              notificaciones.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingFecha ? "Actualizar" : "Crear"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Fechas Especiales</CardTitle>
            <CardDescription>
              {filteredFechas.length} fecha(s) especial(es) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Repetir</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFechas.map((fecha) => (
                  <TableRow key={fecha.id}>
                    <TableCell className="font-medium">
                      {fecha.nombre}
                    </TableCell>
                    <TableCell>{formatDate(fecha.fecha)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          fecha.repetirAnual === "si" ? "default" : "outline"
                        }
                      >
                        {fecha.repetirAnual === "si" ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          fecha.estado === "activo" ? "default" : "secondary"
                        }
                      >
                        {fecha.estado === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(fecha)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(fecha)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Ver Detalle */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalle de Fecha Especial
            </DialogTitle>
            <DialogDescription>
              Información completa de la fecha especial seleccionada.
            </DialogDescription>
          </DialogHeader>
          {viewingFecha && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nombre de la fecha especial
                </label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {viewingFecha.nombre}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <div className="p-2 bg-muted rounded-md text-sm min-h-[60px]">
                  {viewingFecha.descripcion || "Sin descripción"}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {formatDate(viewingFecha.fecha)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Repetir cada año
                  </label>
                  <div className="p-2 bg-muted rounded-md text-sm">
                    <Badge
                      variant={
                        viewingFecha.repetirAnual === "si"
                          ? "default"
                          : "outline"
                      }
                    >
                      {viewingFecha.repetirAnual === "si" ? "Sí" : "No"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <div className="p-2 bg-muted rounded-md text-sm">
                    <Badge
                      variant={
                        viewingFecha.estado === "activo"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {viewingFecha.estado === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de creación</label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {formatDate(viewingFecha.fechaCreacion)}
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailDialogOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
