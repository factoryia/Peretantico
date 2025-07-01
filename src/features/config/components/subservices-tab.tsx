"use client";

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
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const subservicioSchema = z.object({
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
  servicioId: z.string().min(1, "Debe seleccionar un servicio"),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  descripcion: z.string().max(250, "Máximo 250 caracteres").optional(),
  codigo: z
    .string()
    .min(1, "El código es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  valor: z
    .string()
    .min(1, "El valor es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  valorPrioridad: z
    .string()
    .min(1, "El valor prioridad es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  estado: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

type SubservicioFormValues = z.infer<typeof subservicioSchema>;

interface Subservicio {
  id: number;
  categoriaId: number;
  categoriaNombre: string;
  servicioId: number;
  servicioNombre: string;
  nombre: string;
  descripcion?: string;
  codigo: string;
  valor: string;
  valorPrioridad: string;
  estado: "activo" | "inactivo";
  fechaCreacion: string;
}

const categoriasDisponibles = [
  { id: 1, nombre: "Servicios Públicos" },
  { id: 2, nombre: "Documentación" },
  { id: 3, nombre: "Atención Ciudadana" },
];

const serviciosDisponibles = [
  { id: 1, nombre: "Registro Civil", categoriaId: 1 },
  { id: 2, nombre: "Certificados", categoriaId: 2 },
  { id: 3, nombre: "Licencias", categoriaId: 1 },
];

const subserviciosIniciales: Subservicio[] = [
  {
    id: 1,
    categoriaId: 1,
    categoriaNombre: "Servicios Públicos",
    servicioId: 1,
    servicioNombre: "Registro Civil",
    nombre: "Certificado de Nacimiento",
    descripcion: "Emisión de certificado de nacimiento",
    codigo: "RC001",
    valor: "15000",
    valorPrioridad: "25000",
    estado: "activo",
    fechaCreacion: "2024-01-15",
  },
  {
    id: 2,
    categoriaId: 2,
    categoriaNombre: "Documentación",
    servicioId: 2,
    servicioNombre: "Certificados",
    nombre: "Certificado de Estudios",
    descripcion: "Certificado oficial de estudios realizados",
    codigo: "CERT001",
    valor: "12000",
    valorPrioridad: "20000",
    estado: "activo",
    fechaCreacion: "2024-01-16",
  },
];

export function SubservicesTab() {
  const [subservicios, setSubservicios] = useState<Subservicio[]>(
    subserviciosIniciales
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubservicio, setEditingSubservicio] =
    useState<Subservicio | null>(null);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>("");

  const form = useForm<SubservicioFormValues>({
    resolver: zodResolver(subservicioSchema),
    defaultValues: {
      categoriaId: "",
      servicioId: "",
      nombre: "",
      descripcion: "",
      codigo: "",
      valor: "",
      valorPrioridad: "",
      estado: "activo",
    },
  });

  const watchedCategoriaId = form.watch("categoriaId");

  const serviciosFiltrados = serviciosDisponibles.filter(
    (servicio) =>
      servicio.categoriaId === Number.parseInt(watchedCategoriaId || "0")
  );

  const filteredSubservicios = subservicios.filter(
    (subservicio) =>
      subservicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subservicio.servicioNombre
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      subservicio.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = (data: SubservicioFormValues) => {
    const categoria = categoriasDisponibles.find(
      (c) => c.id === Number.parseInt(data.categoriaId)
    );
    const servicio = serviciosDisponibles.find(
      (s) => s.id === Number.parseInt(data.servicioId)
    );

    if (editingSubservicio) {
      setSubservicios((prev) =>
        prev.map((sub) =>
          sub.id === editingSubservicio.id
            ? {
                ...sub,
                ...data,
                categoriaId: Number.parseInt(data.categoriaId),
                categoriaNombre: categoria?.nombre || "",
                servicioId: Number.parseInt(data.servicioId),
                servicioNombre: servicio?.nombre || "",
              }
            : sub
        )
      );
    } else {
      const newSubservicio: Subservicio = {
        id: Math.max(...subservicios.map((s) => s.id)) + 1,
        categoriaId: Number.parseInt(data.categoriaId),
        categoriaNombre: categoria?.nombre || "",
        servicioId: Number.parseInt(data.servicioId),
        servicioNombre: servicio?.nombre || "",
        nombre: data.nombre,
        descripcion: data.descripcion,
        codigo: data.codigo,
        valor: data.valor,
        valorPrioridad: data.valorPrioridad,
        estado: data.estado,
        fechaCreacion: new Date().toISOString().split("T")[0],
      };
      setSubservicios((prev) => [...prev, newSubservicio]);
    }

    setIsDialogOpen(false);
    setEditingSubservicio(null);
    form.reset();
  };

  const handleEdit = (subservicio: Subservicio) => {
    setEditingSubservicio(subservicio);
    form.reset({
      categoriaId: subservicio.categoriaId.toString(),
      servicioId: subservicio.servicioId.toString(),
      nombre: subservicio.nombre,
      descripcion: subservicio.descripcion || "",
      codigo: subservicio.codigo,
      valor: subservicio.valor,
      valorPrioridad: subservicio.valorPrioridad,
      estado: subservicio.estado,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setSubservicios((prev) => prev.filter((sub) => sub.id !== id));
  };

  const handleNewSubservicio = () => {
    setEditingSubservicio(null);
    form.reset({
      categoriaId: "",
      servicioId: "",
      nombre: "",
      descripcion: "",
      codigo: "",
      valor: "",
      valorPrioridad: "",
      estado: "activo",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Gestión de Subservicios
        </h2>
        <p className="text-muted-foreground">
          Asocia subservicios a cada tipo de servicio principal para definir con
          mayor precisión los requerimientos del usuario.
        </p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Subservicios</CardTitle>
            <CardDescription>
              Asocia subservicios a cada tipo de servicio principal para definir
              con mayor precisión los requerimientos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-y-2">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar subservicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewSubservicio}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Subservicio
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSubservicio
                        ? "Editar Subservicio"
                        : "Nuevo Subservicio"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingSubservicio
                        ? "Modifica los datos del subservicio existente."
                        : "Completa los datos para crear un nuevo subservicio."}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="categoriaId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione una categoría" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categoriasDisponibles.map((categoria) => (
                                  <SelectItem
                                    key={categoria.id}
                                    value={categoria.id.toString()}
                                  >
                                    {categoria.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Listado de categorías activas en el sistema.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="servicioId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de servicio</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un servicio" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviciosFiltrados.map((servicio) => (
                                  <SelectItem
                                    key={servicio.id}
                                    value={servicio.id.toString()}
                                  >
                                    {servicio.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Selecciona el tipo de servicio al que se asociará
                              el subservicio.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Subservicio</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: Solicitud registros civiles"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Título o nombre identificador del subservicio.
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
                            <FormLabel>Descripción del Subservicio</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descripción más detallada del subservicio"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Descripción más detallada del subservicio, si se
                              requiere.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="codigo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: RC001" {...field} />
                              </FormControl>
                              <FormDescription>
                                Define el código por subservicio.
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
                                Define si el subservicio está disponible o no.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="valor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="15000"
                                  type="number"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Valor por subservicio.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="valorPrioridad"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Prioridad</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="25000"
                                  type="number"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Valor por subservicio priorizado.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingSubservicio ? "Actualizar" : "Crear"}
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
            <CardTitle>Lista de Subservicios</CardTitle>
            <CardDescription>
              {filteredSubservicios.length} subservicio(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Valor Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubservicios.map((subservicio) => (
                  <TableRow key={subservicio.id}>
                    <TableCell className="font-medium">
                      {subservicio.nombre}
                    </TableCell>
                    <TableCell>{subservicio.servicioNombre}</TableCell>
                    <TableCell>{subservicio.codigo}</TableCell>
                    <TableCell>
                      ${Number.parseInt(subservicio.valor).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      $
                      {Number.parseInt(
                        subservicio.valorPrioridad
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          subservicio.estado === "activo"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {subservicio.estado === "activo"
                          ? "Activo"
                          : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subservicio)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subservicio.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
