import { useQuery } from "@tanstack/react-query";
import api from "@/api";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useDistributorId() {
  const { authUser } = useAuthStore();

  return useQuery({
    queryKey: ["distributor-id", authUser?.name],
    queryFn: async () => {
      if (!authUser?.name) return null;

      const response = await api.get("/distributors", {
        params: {
          email: authUser.name,
          limit: 1,
        },
      });

      const raw = response.data;

      if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        if (first && typeof first.id === "string") {
          return first.id as string;
        }
      } else if (
        raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { data?: unknown }).data)
      ) {
        const first = (raw as { data: Array<{ id?: unknown }> }).data[0];
        if (first && typeof first.id === "string") {
          return first.id as string;
        }
      }

      return null;
    },
    enabled: !!authUser?.name && authUser.roles.includes("distributor"),
    staleTime: Infinity, // El ID del repartidor no suele cambiar
  });
}
