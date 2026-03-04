import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function useDistributorId() {
  const { authUser } = useAuthStore();
  const userId = authUser?.uid;

  const data = useQuery(api.distributors.getByUserId, 
    userId ? { userId } : "skip"
  );

  return {
    data,
    isLoading: data === undefined && !!userId,
    error: null,
  };
}
