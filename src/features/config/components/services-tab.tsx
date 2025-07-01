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

const servicioSchema = z.object({
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  descripcion: z.string().max(500, "Máximo 500 caracteres").optional(),
  estado: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

type ServicioFormValues = z.infer<typeof servicioSchema>;

interface Servicio {
  id: number;
  categoriaId: number;
  categoriaNombre: string;
  nombre: string;
  descripcion?: string;
  estado: "activo" | "inactivo";
  fechaCreacion: string;
}

const categoriasDisponibles = [
  { id: 1, nombre: "Servicios Públicos" },
  { id: 2, nombre: "Documentación" },
  { id: 3, nombre: "Atención Ciudadana" },
];

const serviciosIniciales: Servicio[] = [
  {
    id: 1,
    categoriaId: 1,
    categoriaNombre: "Servicios Públicos",
    nombre: "Registro Civil",
    descripcion: "Servicios relacionados con el registro civil de personas",
    estado: "activo",
    fechaCreacion: "2024-01-15",
  },
  {
    id: 2,
    categoriaId: 2,
    categoriaNombre: "Documentación",
    nombre: "Certificados",
    descripcion: "Emisión de certificados oficiales",
    estado: "activo",
    fechaCreacion: "2024-01-16",
  },
  {
    id: 3,
    categoriaId: 1,
    categoriaNombre: "Servicios Públicos",
    nombre: "Licencias",
    descripcion: "Tramitación de licencias y permisos",
    estado: "inactivo",
    fechaCreacion: "2024-01-17",
  },
];

export function ServicesTab() {
  const [servicios, setServicios] = useState<Servicio[]>(serviciosIniciales);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);

  const form = useForm<ServicioFormValues>({
    resolver: zodResolver(servicioSchema),
    defaultValues: {
      categoriaId: "",
      nombre: "",
      descripcion: "",
      estado: "activo",
    },
  });

  const filteredServicios = servicios.filter(
    (servicio) =>
      servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.categoriaNombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = (data: ServicioFormValues) => {
    const categoria = categoriasDisponibles.find(
      (c) => c.id === Number.parseInt(data.categoriaId)
    );

    if (editingServicio) {
      setServicios((prev) =>
        prev.map((serv) =>
          serv.id === editingServicio.id
            ? {
                ...serv,
                ...data,
                categoriaId: Number.parseInt(data.categoriaId),
                categoriaNombre: categoria?.nombre || "",
              }
            : serv
        )
      );
    } else {
      const newServicio: Servicio = {
        id: Math.max(...servicios.map((s) => s.id)) + 1,
        categoriaId: Number.parseInt(data.categoriaId),
        categoriaNombre: categoria?.nombre || "",
        nombre: data.nombre,
        descripcion: data.descripcion,
        estado: data.estado,
        fechaCreacion: new Date().toISOString().split("T")[0],
      };
      setServicios((prev) => [...prev, newServicio]);
    }

    setIsDialogOpen(false);
    setEditingServicio(null);
    form.reset();
  };

  const handleEdit = (servicio: Servicio) => {
    setEditingServicio(servicio);
    form.reset({
      categoriaId: servicio.categoriaId.toString(),
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || "",
      estado: servicio.estado,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setServicios((prev) => prev.filter((serv) => serv.id !== id));
  };

  const handleNewServicio = () => {
    setEditingServicio(null);
    form.reset({
      categoriaId: "",
      nombre: "",
      descripcion: "",
      estado: "activo",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Gestión de Servicios
        </h2>
        <p className="text-muted-foreground">
          Mantén un catálogo actualizado de tipos de servicio y facilita la
          identificación y procesamiento eficiente.
        </p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Servicios</CardTitle>
            <CardDescription>
              Mantén un catálogo actualizado de tipos de servicio y sus códigos
              únicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-y-2">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar servicios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewServicio}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Servicio
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingServicio ? "Editar Servicio" : "Nuevo Servicio"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingServicio
                        ? "Modifica los datos del servicio existente."
                        : "Completa los datos para crear un nuevo servicio."}
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
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del servicio</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ingrese el nombre del servicio"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Nombre que identifica el tipo de servicio.
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
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descripción detallada del servicio"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Descripción detallada del servicio (si aplica).
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
                              Permite activar o inactivar el tipo de servicio
                              sin eliminarlo.
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
                          {editingServicio ? "Actualizar" : "Crear"}
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
            <CardTitle>Lista de Servicios</CardTitle>
            <CardDescription>
              {filteredServicios.length} servicio(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicios.map((servicio) => (
                  <TableRow key={servicio.id}>
                    <TableCell className="font-medium">
                      {servicio.nombre}
                    </TableCell>
                    <TableCell>{servicio.categoriaNombre}</TableCell>
                    <TableCell>{servicio.descripcion || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          servicio.estado === "activo" ? "default" : "secondary"
                        }
                      >
                        {servicio.estado === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{servicio.fechaCreacion}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(servicio)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(servicio.id)}
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
