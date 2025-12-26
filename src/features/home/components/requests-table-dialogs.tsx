import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RequestDetailViewModal } from "./request-detail-view";
import { AssignDistributorModal } from "./assign-distributor-modal";
import { AssignApplicantModal } from "./assign-applicant-modal";
import { EditRequestModal } from "./edit-request-modal";
import type { CompleteRequest } from "../utils/complete-request";
import type { AssignmentModalData } from "../types/request";

interface RequestsTableDialogsProps {
  modals: {
    detail: boolean;
    assignDistributor: boolean;
    assignApplicant: boolean;
    edit: boolean;
  };
  selectedRequest: CompleteRequest | null;
  editingRequest: CompleteRequest | null;
  assignmentData: AssignmentModalData | null;
  deleteRequestId: string | null;
  onCloseModal: (
    modalName: "detail" | "assignDistributor" | "assignApplicant" | "edit"
  ) => void;
  onAssignDistributor: (distributorId: string) => Promise<void>;
  onAssignApplicant: (applicantId: string) => Promise<void>;
  onConfirmDelete: () => Promise<void>;
  setDeleteRequestId: (id: string | null) => void;
  onUpdateRequest: (requestId: string, data: any) => Promise<void>;
}

export function RequestsTableDialogs({
  modals,
  selectedRequest,
  editingRequest,
  assignmentData,
  deleteRequestId,
  onCloseModal,
  onAssignDistributor,
  onAssignApplicant,
  onConfirmDelete,
  setDeleteRequestId,
  onUpdateRequest,
}: RequestsTableDialogsProps) {
  return (
    <>
      <RequestDetailViewModal
        isOpen={modals.detail}
        onOpenChange={(open) => {
          if (!open) onCloseModal("detail");
        }}
        request={selectedRequest}
        onAssignDistributor={onAssignDistributor}
        onUpdateRequest={onUpdateRequest}
      />

      <AssignDistributorModal
        isOpen={modals.assignDistributor}
        onClose={() => onCloseModal("assignDistributor")}
        data={assignmentData}
        onAssign={onAssignDistributor}
      />

      <AssignApplicantModal
        isOpen={modals.assignApplicant}
        onClose={() => onCloseModal("assignApplicant")}
        data={assignmentData}
        onAssign={onAssignApplicant}
      />

      <EditRequestModal
        isOpen={modals.edit}
        onOpenChange={(open) => !open && onCloseModal("edit")}
        request={editingRequest}
      />

      <AlertDialog
        open={!!deleteRequestId}
        onOpenChange={() => setDeleteRequestId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la
              solicitud.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
