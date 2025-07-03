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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCategory, deleteCategory, fetchActiveCategories, updateCategory } from "../utils/category";
import type { Category } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

const categorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
  description: z.string().max(300, "Máximo 300 caracteres").optional(),
  status: z.enum(["activo", "inactivo"], { required_error: "Debe seleccionar un estado" }),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Category | null>(null);

  // Modal de confirmación para eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ["categorias"],
    queryFn: fetchActiveCategories,
    staleTime: 5 * 60 * 1000,
  });

  const queryClient = useQueryClient();

  const mutationCreate = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      createCategory({
        nombre: values.name,
        descripcion: values.description,
        estado: values.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setIsDialogOpen(false);
      setEditingCategoria(null);
      form.reset();
    },
    onError: (err) => {
      alert("Error creando categoría");
      console.error(err);
    },
  });

  const mutationUpdate = useMutation({
    mutationFn: ({ uuid, values }: { uuid: string; values: CategoryFormValues }) =>
      updateCategory(uuid, {
        nombre: values.name,
        descripcion: values.description,
        estado: values.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setIsDialogOpen(false);
      setEditingCategoria(null);
      form.reset();
    },
    onError: (err) => {
      alert("Error actualizando categoría");
      console.error(err);
    },
  });

  const mutationDelete = useMutation({
    mutationFn: (uuid: string) => deleteCategory(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      alert("Error eliminando categoría");
      console.error("Error eliminando categoría:", error);
    },
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      status: "activo",
    },
  });

  const filteredCategorias = categorias
    .map((cat) => ({
      uuid: cat.uuid,
      name: cat.name,
      description: cat.description,
      status: cat.status ? "activo" : "inactivo",
      created: cat.created,
    }))
    .filter((categoria) => categoria.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const onSubmit = async (data: CategoryFormValues) => {
    if (editingCategoria) {
      mutationUpdate.mutate({ uuid: editingCategoria.uuid, values: data });
    } else {
      mutationCreate.mutate(data);
    }
  };

  const handleEdit = (categoria: Category) => {
    setEditingCategoria(categoria);
    form.reset({
      name: categoria.name,
      description: categoria.description || "",
      status: categoria.status ? "activo" : "inactivo",
    });
    setIsDialogOpen(true);
  };

  const handleNewCategoria = () => {
    setEditingCategoria(null);
    form.reset({
      name: "",
      description: "",
      status: "activo",
    });
    setIsDialogOpen(true);
  };

  // Eliminar
  const handleOpenDeleteDialog = (uuid: string) => {
    setCategoryToDelete(uuid);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      mutationDelete.mutate(categoryToDelete);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  if (isLoading) return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Gestión de Categorías</h2>
        <p className="text-muted-foreground">Administra las categorías que agrupan los distintos servicios ofrecidos en el sistema.</p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Lista de Categorías</CardTitle>
            <CardDescription>Cargando categorías...</CardDescription>
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
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
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

  return (
    <div className="space-y-6">
      {/* Modal de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar esta categoría? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={mutationDelete.isPending}
            >
              {mutationDelete.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Gestión de Categorías
        </h2>
        <p className="text-muted-foreground">
          Administra las categorías que agrupan los distintos servicios ofrecidos en el sistema.
        </p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Categorías</CardTitle>
            <CardDescription>
              Administra las categorías que agrupan los distintos servicios ofrecidos
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de la categoría</FormLabel>
                            <FormControl>
                              <Input placeholder="Ingrese el nombre" {...field} />
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
                        name="description"
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
                              Información adicional sobre el propósito o detalle de la categoría.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="inactivo">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Define si la categoría está disponible para ser usada en servicios.
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
                        <Button type="submit" disabled={mutationCreate.isPending || mutationUpdate.isPending}>
                          {editingCategoria
                            ? mutationUpdate.isPending
                              ? "Actualizando..."
                              : "Actualizar"
                            : mutationCreate.isPending
                              ? "Creando..."
                              : "Crear"}
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
                  <TableRow key={categoria.uuid}>
                    <TableCell className="font-medium">{categoria.name}</TableCell>
                    <TableCell>{categoria.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={categoria.status === "activo" ? "default" : "secondary"}>
                        {categoria.status === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoria.created}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleEdit({
                              ...categoria,
                              status: categoria.status === "activo",
                            })
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={"outline"}
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(categoria.uuid)}
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
