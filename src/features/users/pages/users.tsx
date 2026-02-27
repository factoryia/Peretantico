"use client";

import { Plus, Users as UsersIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useTransition } from "react";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { useUsersQuery, useUserMutations } from "../hooks/use-users";
import { UserCard } from "../components/user-card";
import { UserDialog } from "../components/user-dialog";
import { ChangePasswordDialog } from "../components/change-password-dialog";
import { UserSkeleton } from "../components/user-skeleton";
import type { AuthUser } from "../types";
import { AlertModal } from "@/components/common/alert-modal";

export function UsersPage() {
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);

  const { data: users, isLoading } = useUsersQuery();
  const { deleteMutation } = useUserMutations();

  const handleEdit = (user: AuthUser) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleChangePassword = (user: AuthUser) => {
    setSelectedUser(user);
    setIsPasswordDialogOpen(true);
  };

  const handleDeleteClick = (user: AuthUser) => {
    setUserIdToDelete(user.id);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userIdToDelete) {
      startTransition(async () => {
        await deleteMutation.mutateAsync(userIdToDelete);
        setIsAlertOpen(false);
        setUserIdToDelete(null);
      });
    }
  };

  const filteredUsers = users?.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <AlertModal
        description="Esta acción no se puede deshacer. Se eliminará permanentemente el usuario seleccionado y todo su contenido asociado."
        isSubmitting={isPending}
        open={isAlertOpen}
        onSubmit={handleDeleteConfirm}
        onOpenChange={(open) => {
          setIsAlertOpen(open);
          if (!open) setUserIdToDelete(null);
        }}
      />

      <div className="h-dvh flex flex-col">
        <SidebarHeader title="Configuración" />
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="space-y-6 font-['Poppins',sans-serif] p-4 md:p-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border relative overflow-hidden border-l-4 border-l-blue-600">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    Gestión de Usuarios
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {isLoading
                      ? "Cargando..."
                      : `${users?.length || 0} usuario(s) registrado(s)`}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  setSelectedUser(null);
                  setIsDialogOpen(true);
                }}
                size="sm"
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 rounded-lg font-semibold w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </div>

            {/* Search Section */}
            <div className="bg-white p-6 rounded-3xl border space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-widest">
                  Buscar Usuario
                </Label>
                <div className="relative group max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 bg-gray-50/50 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Section */}
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <UserSkeleton key={index} />
                ))}
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredUsers.map((user, index) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    onChangePassword={handleChangePassword}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                  <UsersIcon className="h-12 w-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  No se encontraron usuarios
                </h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">
                  {searchTerm
                    ? "No hay usuarios que coincidan con tu búsqueda."
                    : "Aún no hay usuarios registrados en el sistema."}
                </p>
                {searchTerm && (
                  <Button
                    variant="link"
                    onClick={() => setSearchTerm("")}
                    className="mt-4 text-blue-600 font-bold"
                  >
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <UserDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </>
  );
}
