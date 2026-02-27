import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, fetchUserById, createUser, updateUser, deleteUser } from "../utils/users";
import { USERS_QUERY_KEY } from "../constants/query-keys";
import type { CreateUserDto, UpdateUserDto } from "../types";
import { toast } from "sonner";

export const useUsersQuery = () => {
  return useQuery({
    queryKey: [USERS_QUERY_KEY],
    queryFn: fetchUsers,
  });
};

export const useUserQuery = (id: string) => {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, id],
    queryFn: () => fetchUserById(id),
    enabled: !!id,
  });
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (user: CreateUserDto) => createUser(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast.success("Usuario creado correctamente");
    },
    onError: () => {
      toast.error("Error al crear el usuario");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, user }: { id: string; user: UpdateUserDto }) => updateUser(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast.success("Usuario actualizado correctamente");
    },
    onError: () => {
      toast.error("Error al actualizar el usuario");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
      toast.success("Usuario eliminado correctamente");
    },
    onError: () => {
      toast.error("Error al eliminar el usuario");
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
