import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  updateRequest,
  // deleteRequest,
  createBackendRequest,
} from "../utils/request";
import { REQUESTS_QUERY_KEY } from "./use-request-query";
import type {
  CreateRequestDto,
  UpdateRequestPayload,
} from "../types/request";
import { toast } from "sonner";

export const useUpdateRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      data,
    }: {
      requestId: string;
      data: UpdateRequestPayload;
    }) => updateRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["complete-requests"] });
      toast.success("Solicitud actualizada correctamente");
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      toast.error("Error al actualizar la solicitud");
    },
  });
};

export const useCreateRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRequestDto) => createBackendRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["complete-requests"] });
      toast.success("Solicitud creada correctamente");
    },
    onError: (error) => {
      console.error("Error creating request:", error);
      toast.error("Error al crear la solicitud");
    },
  });
};

export const useDeleteRequestMutation = () => {
  const deleteConvexRequest = useConvexMutation(api.requests.remove);

  return {
    mutateAsync: async (id: string) => {
      try {
        await deleteConvexRequest({ id: id as Id<"requests"> });
        toast.success("Solicitud eliminada correctamente");
      } catch (error) {
        console.error("Error deleting request", error);
        toast.error("Error al eliminar la solicitud");
        throw error;
      }
    },
    mutate: (id: string) => {
      deleteConvexRequest({ id: id as Id<"requests"> })
        .then(() => toast.success("Solicitud eliminada correctamente"))
        .catch((error) => {
          console.error("Error deleting request", error);
          toast.error("Error al eliminar la solicitud");
        });
    },
    isPending: false,
    isError: false,
    error: null,
    reset: () => {},
  };
};
