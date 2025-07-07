import { toast } from "sonner";
import type { AxiosError } from "axios";
import { useState, useTransition } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteCategory,
  fetchCategories,
} from "@/features/config/utils/category";
import type { Category } from "@/features/config/types";
import { AlertModal } from "@/components/common/alert-modal";
import { SearchInput } from "@/components/common/search-input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORY_QUERY_KEY } from "@/features/config/constants/query-keys";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { CategoryDialog } from "@/features/config/components/categories/category-dialog";
import { CategoriesTable } from "@/features/config/components/categories/categories-table";
import { Paginator } from "@/components/common/paginator";

export function CategoriesTab() {
  const queryClient = useQueryClient();

  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading: isLoadingCategories } = useQuery({
    queryKey: [CATEGORY_QUERY_KEY, searchTerm, currentPage, pageSize],
    queryFn: () => fetchCategories(searchTerm, currentPage, pageSize),
    staleTime: 5 * 60 * 1000,
  });

  const categories = data?.categories ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleEdit = (categoria: Category) => {
    setEditingCategory(categoria);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteCategory(categoryToDelete!);

        toast.success("Categoría eliminada", {
          description: "La categría fue eliminada correctamente.",
        });

        queryClient.invalidateQueries({ queryKey: [CATEGORY_QUERY_KEY] });
        setIsAlertOpen(false);
        setCategoryToDelete(null);
      } catch (error) {
        const err = error as AxiosError<{ message: string }>;
        toast.error("Error al eliminar la categoria", {
          description:
            err.response?.data?.message ??
            "Ocurrió un error inesperado al eliminar la categoria.",
        });
        console.error("Error al eliminar la categoria:", err);
      } finally {
        setCategoryToDelete(null);
        setIsAlertOpen(false);
      }
    });
  };

  return (
    <>
      <AlertModal
        description="Esta acción no se puede deshacer. Se eliminará permanentemente la categoría seleccionada."
        isSubmitting={isPending}
        open={isAlertOpen}
        onSubmit={handleDelete}
        onOpenChange={(open) => {
          setCategoryToDelete(null);
          setIsAlertOpen(open);
        }}
      />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Gestión de Categorías
            </CardTitle>
            <CardDescription className="text-base">
              Administra las categorías que agrupan los distintos servicios
              ofrecidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-y-2">
              <SearchInput
                placeholder="Buscar categorías..."
                value={searchTerm}
                onValueChange={(value) => setSearchTerm(value)}
              />
              <CategoryDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open && editingCategory) {
                    setEditingCategory(null);
                  }
                }}
                setIsDialogOpen={setIsDialogOpen}
                editingCategory={editingCategory}
                setEditingCategory={setEditingCategory}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Categorías</CardTitle>
            <CardDescription>
              {categories.length} categoría(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCategories ? (
              <TableSkeleton />
            ) : (
              <>
                <CategoriesTable
                  categories={categories}
                  onEdit={handleEdit}
                  onDelete={(id) => {
                    setCategoryToDelete(id);
                    setIsAlertOpen(true);
                  }}
                  isLoading={isLoadingCategories}
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
    </>
  );
}
