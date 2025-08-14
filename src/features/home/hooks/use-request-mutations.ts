import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRequest, deleteRequest, createRequest } from "../utils/request";
import { REQUESTS_QUERY_KEY } from "./use-request-query";
import type { CreateRequestPayload } from "../types/request";
import { toast } from "sonner";

export const useUpdateRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: any }) =>
      updateRequest(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY] });
      toast("Solicitud actualizada correctamente");
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      toast("Error al actualizar la solicitud");
    },
  });
};

export const useCreateRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRequestPayload) => createRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY] });
      toast( "Solicitud creada correctamente");
    },
    onError: (error) => {
      console.error("Error creating request:", error);
      toast("Error al crear la solicitud");
    },
  });
};

export const useDeleteRequestMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REQUESTS_QUERY_KEY] });
      toast.success("Solicitud eliminada correctamente");
    },
    onError: (error) => {
      console.error("Error deleting request", error);
    },
  });
};
