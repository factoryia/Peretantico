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

const categorySchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  descripcion: z.string().max(300, "Máximo 300 caracteres").optional(),
  estado: z.enum(["activo", "inactivo"], {
    required_error: "Debe seleccionar un estado",
  }),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface Category {
  id: number;
  nombre: string;
  descripcion?: string;
  estado: "activo" | "inactivo";
  fechaCreacion: string;
}

const categoriasIniciales: Category[] = [
  {
    id: 1,
    nombre: "Servicios Públicos",
    descripcion:
      "Categoría para servicios relacionados con la administración pública",
    estado: "activo",
    fechaCreacion: "2024-01-15",
  },
  {
    id: 2,
    nombre: "Documentación",
    descripcion: "Servicios relacionados con trámites documentales",
    estado: "activo",
    fechaCreacion: "2024-01-16",
  },
  {
    id: 3,
    nombre: "Atención Ciudadana",
    descripcion: "Servicios de atención y soporte al ciudadano",
    estado: "inactivo",
    fechaCreacion: "2024-01-17",
  },
];

export function CategoriesTab() {
  const [categorias, setCategorias] = useState<Category[]>(categoriasIniciales);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Category | null>(
    null
  );

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      estado: "activo",
    },
  });

  const filteredCategorias = categorias.filter((categoria) =>
    categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = (data: CategoryFormValues) => {
    if (editingCategoria) {
      setCategorias((prev) =>
        prev.map((cat) =>
          cat.id === editingCategoria.id ? { ...cat, ...data } : cat
        )
      );
    } else {
      const newCategoria: Category = {
        id: Math.max(...categorias.map((c) => c.id)) + 1,
        ...data,
        fechaCreacion: new Date().toISOString().split("T")[0],
      };
      setCategorias((prev) => [...prev, newCategoria]);
    }

    setIsDialogOpen(false);
    setEditingCategoria(null);
    form.reset();
  };

  const handleEdit = (categoria: Category) => {
    setEditingCategoria(categoria);
    form.reset({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || "",
      estado: categoria.estado,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setCategorias((prev) => prev.filter((cat) => cat.id !== id));
  };

  const handleNewCategoria = () => {
    setEditingCategoria(null);
    form.reset({
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
          Gestión de Categorías
        </h2>
        <p className="text-muted-foreground">
          Administra las categorías que agrupan los distintos servicios
          ofrecidos en el sistema.
        </p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Categorías</CardTitle>
            <CardDescription>
              Administra las categorías que agrupan los distintos servicios
              ofrecidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-y-2">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar categorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewCategoria}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Categoría
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategoria
                        ? "Editar Categoría"
                        : "Nueva Categoría"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCategoria
                        ? "Modifica los datos de la categoría existente."
                        : "Completa los datos para crear una nueva categoría."}
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
                            <FormLabel>Nombre de la categoría</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ingrese el nombre"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Nombre identificador de la categoría (único).
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
                                placeholder="Descripción opcional"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Información adicional sobre el propósito o detalle
                              de la categoría.
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
                              Define si la categoría está disponible para ser
                              usada en servicios.
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
                          {editingCategoria ? "Actualizar" : "Crear"}
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
            <CardTitle>Lista de Categorías</CardTitle>
            <CardDescription>
              {filteredCategorias.length} categoría(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell className="font-medium">
                      {categoria.nombre}
                    </TableCell>
                    <TableCell>{categoria.descripcion || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          categoria.estado === "activo"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {categoria.estado === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoria.fechaCreacion}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(categoria)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(categoria.id)}
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
