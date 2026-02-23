import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateRequest,
  deleteRequest,
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
