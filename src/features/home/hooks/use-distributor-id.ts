import { useQuery } from "@tanstack/react-query";
import api from "@/api";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useDistributorId() {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ["distributor-id", authUser?.name],
    queryFn: async () => {
      if (!authUser?.name) return null;

      // Intentamos buscar al repartidor por su correo (que asumimos es el 'name' del usuario logueado en este contexto)
      const response = await api.get("/api/node/distributor", {
        params: {
          "filter[field_mail]": authUser.name,
        },
      });

      const data = response.data?.data;
      if (data && data.length > 0) {
        return data[0].id as string;
      }

      return null;
    },
    enabled: !!authUser?.name && authUser.roles.includes("distributor"),
    staleTime: Infinity, // El ID del repartidor no suele cambiar
  });
}
